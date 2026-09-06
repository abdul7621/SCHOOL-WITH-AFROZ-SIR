from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.core.config import settings
from app.core.logging import logger
from app.core.redis import get_redis_client, close_redis
from app.core.database import tenant_db_manager, control_async_engine
from app.core.exceptions import AppException
from app.middlewares.tenant_resolver import TenantResolverMiddleware
from app.middlewares.audit_middleware import AuditMiddleware

# Routers
from app.control_plane.router import router as control_router
from app.modules.auth.router import router as auth_router
from app.modules.settings.router import router as settings_router
from app.modules.lookups.router import router as lookups_router
from app.modules.academics.router import router as academics_router
from app.modules.students.router import router as students_router
from app.modules.staff.router import router as staff_router
from app.modules.attendance.router import router as attendance_router
from app.modules.fees.router import router as fees_router
from app.modules.finance.router import router as finance_router
from app.modules.exams.router import router as exams_router
from app.modules.development.router import router as development_router
from app.modules.documents.router import router as documents_router
from app.modules.parent_portal.router import router as parent_portal_router
from app.modules.cms.router import router as cms_router
from app.modules.excel_engine.router import router as excel_router
from app.modules.reports.router import router as reports_router
from app.modules.notifications.router import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME} in [{settings.ENVIRONMENT}] mode...")
    await get_redis_client()
    yield
    # Shutdown
    logger.info("Shutting down ERP Engine...")
    await close_redis()
    await tenant_db_manager.dispose_all()
    await control_async_engine.dispose()
    logger.info("All database engines and cache connections disposed.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="7A School ERP — SaaS Engine API",
        description="Multi-tenant API-First School ERP Foundation (7aedu.com)",
        version="1.0.0",
        lifespan=lifespan,
    )

    # 1. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Custom Middlewares
    app.add_middleware(AuditMiddleware)
    app.add_middleware(TenantResolverMiddleware)

    # 3. Global Exception Handlers
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": exc.message,
                "error_code": exc.error_code,
                "details": exc.details,
                "dependencies": getattr(exc, "dependencies", []),
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        message = "An error occurred"
        error_code = getattr(exc, "error_code", "REQUEST_ERROR")
        dependencies = []
        details = None

        if isinstance(exc.detail, dict):
            message = exc.detail.get("message", message)
            error_code = exc.detail.get("error_code", error_code)
            dependencies = exc.detail.get("dependencies", [])
            details = exc.detail.get("details", None)
        elif isinstance(exc.detail, str):
            message = exc.detail

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": message,
                "error_code": error_code,
                "details": details,
                "dependencies": dependencies,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        messages = []
        for err in errors:
            loc = [str(l) for l in err.get("loc", []) if l != "body"]
            field = ".".join(loc) if loc else "field"
            msg = err.get("msg", "Invalid value")
            messages.append(f"{field}: {msg}")
        clean_message = "; ".join(messages) if messages else "Input validation error"

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "data": None,
                "message": clean_message,
                "error_code": "VALIDATION_ERROR",
                "details": {"errors": errors},
                "dependencies": [],
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        err_str = str(exc.orig or exc)
        logger.warning(f"Database IntegrityError on {request.method} {request.url.path}: {err_str}")

        # 1. MySQL 1062: Duplicate Entry
        if "1062" in err_str or "duplicate entry" in err_str.lower():
            msg = "A record with this value already exists. Please choose a different unique value."
            if "subjects" in err_str or "code" in err_str:
                msg = "Subject code already exists. Please choose a different subject code."
            elif "uk_class_section_name" in err_str or "sections" in err_str:
                msg = "A section with this name already exists in this class."
            elif "academic_years" in err_str:
                msg = "An academic session with this name already exists."
            elif "admission_no" in err_str:
                msg = "A student with this admission number is already registered."
            elif "email" in err_str:
                msg = "A user with this email address already exists."
            elif "uk_class_subject" in err_str:
                msg = "This subject is already assigned to this class."
            elif "uk_year_class_section_teacher" in err_str:
                msg = "A class teacher is already assigned to this class section."

            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "success": False,
                    "data": None,
                    "message": msg,
                    "error_code": "DUPLICATE_RECORD",
                    "dependencies": [],
                },
            )

        # 2. MySQL 1451: Child records exist (Foreign key delete blocked)
        if "1451" in err_str or "foreign key constraint fails" in err_str.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "data": None,
                    "message": "Cannot delete or modify this record because active operational records (students, attendance, fees, or classes) are linked to it.",
                    "error_code": "RECORD_IN_USE",
                    "dependencies": [],
                },
            )

        # 3. MySQL 1452: Parent record not found
        if "1452" in err_str:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "data": None,
                    "message": "The referenced class, session, or record does not exist or has been removed.",
                    "error_code": "REFERENCED_RECORD_NOT_FOUND",
                    "dependencies": [],
                },
            )

        # 4. MySQL 1048: Column cannot be null
        if "1048" in err_str or "cannot be null" in err_str.lower():
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "success": False,
                    "data": None,
                    "message": "A required field is missing. Please fill all required fields.",
                    "error_code": "REQUIRED_FIELD_MISSING",
                    "dependencies": [],
                },
            )

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": "Database rule violated. Please verify your input.",
                "error_code": "INTEGRITY_VIOLATION",
                "dependencies": [],
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"SQLAlchemy Database Error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "A database operation error occurred. Please try again.",
                "error_code": "DATABASE_ERROR",
                "dependencies": [],
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled Server Error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "An unexpected server error occurred. Please try again later.",
                "error_code": "INTERNAL_SERVER_ERROR",
                "dependencies": [],
            },
        )

    # 4. Health Check Endpoints
    @app.get("/health", tags=["System Health"])
    @app.get("/api/health", tags=["System Health"])
    @app.get(f"{settings.API_V1_PREFIX}/health", tags=["System Health"])
    async def health_check():
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
        }

    # 5. Include API Routers
    app.include_router(control_router, prefix=settings.API_V1_PREFIX)
    app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
    app.include_router(settings_router, prefix=settings.API_V1_PREFIX)
    app.include_router(lookups_router, prefix=settings.API_V1_PREFIX)
    app.include_router(academics_router, prefix=settings.API_V1_PREFIX)
    app.include_router(students_router, prefix=settings.API_V1_PREFIX)
    app.include_router(staff_router, prefix=settings.API_V1_PREFIX)
    app.include_router(attendance_router, prefix=settings.API_V1_PREFIX)
    app.include_router(fees_router, prefix=settings.API_V1_PREFIX)
    app.include_router(finance_router, prefix=settings.API_V1_PREFIX)
    app.include_router(exams_router, prefix=settings.API_V1_PREFIX)
    app.include_router(development_router, prefix=settings.API_V1_PREFIX)
    app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
    app.include_router(parent_portal_router, prefix=settings.API_V1_PREFIX)
    app.include_router(cms_router, prefix=settings.API_V1_PREFIX)
    app.include_router(excel_router, prefix=settings.API_V1_PREFIX)
    app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
    app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
