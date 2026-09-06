from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
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
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "data": None,
                "message": "Input validation error",
                "error_code": "VALIDATION_ERROR",
                "details": {"errors": exc.errors()},
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled Server Error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "An internal server error occurred",
                "error_code": "INTERNAL_SERVER_ERROR",
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
