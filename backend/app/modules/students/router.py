from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response, paginated_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.students.models import Student
from app.modules.students.schemas import (
    StudentAdmissionRequest,
    StudentUpdateRequest,
    BulkPromotionRequest,
)
from app.modules.students.services import StudentService

router = APIRouter(prefix="/students", tags=["Student Management & Admissions"])


@router.get("", dependencies=[Depends(RequirePermission("students:view"))])
async def list_students(
    academic_year_id: Optional[str] = Query(None, description="Filter by Academic Session"),
    class_id: Optional[str] = Query(None, description="Filter by Class"),
    section_id: Optional[str] = Query(None, description="Filter by Section"),
    status_id: Optional[str] = Query(None, description="Filter by Status"),
    search: Optional[str] = Query(None, description="Search by name, admission no, phone"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Retrieves paginated student roster with class/section, roll number, and parent details.
    """
    students, total = await StudentService.list_students(
        db=db,
        academic_year_id=academic_year_id,
        class_id=class_id,
        section_id=section_id,
        status_id=status_id,
        search=search,
        page=page,
        limit=limit,
    )
    return paginated_response(items=students, page=page, limit=limit, total_records=total)


@router.post("/admit", dependencies=[Depends(RequirePermission("students:create"))], status_code=status.HTTP_201_CREATED)
async def admit_student(req: StudentAdmissionRequest, db: AsyncSession = Depends(get_tenant_db)):
    """
    Full Admission Workflow: Admits a new student, handles parent linkage,
    assigns admission number, and creates initial class enrollment.
    """
    student = await StudentService.admit_student(req, db)
    return success_response(
        data={
            "id": student.id,
            "admission_no": student.admission_no,
            "first_name": student.first_name,
            "last_name": student.last_name,
        },
        message=f"Student '{student.first_name}' admitted successfully with Admission No '{student.admission_no}'",
    )


@router.get("/{student_id}", dependencies=[Depends(RequirePermission("students:view"))])
async def get_student_profile(student_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Retrieves 360-degree student profile including parent and active enrollment."""
    profile = await StudentService.get_student_detail(student_id, db)
    return success_response(data=profile)


@router.put("/{student_id}", dependencies=[Depends(RequirePermission("students:edit"))])
async def update_student(
    student_id: str,
    req: StudentUpdateRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Updates student demographic and custom attributes."""
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise ResourceNotFoundException("Student", student_id)

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(student, field, value)

    await db.commit()
    await db.refresh(student)

    return success_response(
        data={"id": student.id, "admission_no": student.admission_no},
        message="Student profile updated successfully",
    )


@router.post("/promote", dependencies=[Depends(RequirePermission("students:create"))])
async def promote_students_bulk(req: BulkPromotionRequest, db: AsyncSession = Depends(get_tenant_db)):
    """
    Annual Promotion Wizard: Promotes selected students to the next session and class.
    """
    count = await StudentService.promote_students_bulk(req, db)
    return success_response(
        data={"promoted_count": count},
        message=f"Successfully promoted {count} students to the new academic session",
    )
