from fastapi import APIRouter, Depends, UploadFile, File, Form, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.core.database import get_tenant_db
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.students.models import Student, StudentEnrollment, Parent
from app.modules.academics.models import ClassLevel, Section
from app.modules.settings.models import SystemSetting
from app.modules.excel_engine.services import ExcelMigrationService
from app.modules.excel_engine.schemas import ExcelDryRunResponse, ExcelCommitResponse

router = APIRouter(prefix="/excel", tags=["Excel Data Migration Engine"])


@router.get("/template/students", dependencies=[Depends(RequirePermission("excel:import_export"))])
async def download_student_template():
    """Step 1: Downloads the standardized .xlsx template for Bulk Student Admissions."""
    excel_bytes = ExcelMigrationService.generate_student_import_template()
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Students_Import_Template.xlsx"},
    )


@router.post("/import/students/dry-run", dependencies=[Depends(RequirePermission("excel:import_export"))])
async def dry_run_student_import(
    file: UploadFile = File(...),
    academic_year_id: str = Form(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Step 2-4: Uploads Excel file, validates constraints & duplicates,
    and returns a preview without altering the database.
    """
    file_bytes = await file.read()
    result = await ExcelMigrationService.dry_run_student_import(
        file_bytes=file_bytes,
        academic_year_id=academic_year_id,
        db=db,
    )
    return success_response(data=result.model_dump())


@router.post("/import/students/commit", dependencies=[Depends(RequirePermission("excel:import_export"))])
async def execute_student_import(
    file: UploadFile = File(...),
    academic_year_id: str = Form(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Step 5: Executes atomic database commit of all students in the Excel file.
    """
    file_bytes = await file.read()
    imported_count = await ExcelMigrationService.execute_student_import_commit(
        file_bytes=file_bytes,
        academic_year_id=academic_year_id,
        db=db,
    )
    return success_response(
        data={"imported_count": imported_count},
        message=f"Successfully imported and enrolled {imported_count} students.",
    )


@router.get("/export/students", dependencies=[Depends(RequirePermission("excel:import_export"))])
async def export_students(
    class_id: str = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Exports active student directory to formatted Excel file."""
    stmt = (
        select(Student, StudentEnrollment, ClassLevel, Section, Parent)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .join(Section, StudentEnrollment.section_id == Section.id)
        .join(Parent, Student.parent_id == Parent.id)
        .where(StudentEnrollment.is_active == True)
    )
    if class_id:
        stmt = stmt.where(StudentEnrollment.class_id == class_id)

    res = await db.execute(stmt)
    rows = res.all()

    students_data = [
        {
            "admission_no": st.admission_no,
            "full_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "class_name": cls_lvl.name,
            "section_name": sec.name,
            "roll_no": enroll.roll_no,
            "father_name": parent.father_name,
            "primary_phone": parent.primary_phone,
        }
        for st, enroll, cls_lvl, sec, parent in rows
    ]

    settings_res = await db.execute(select(SystemSetting).where(SystemSetting.setting_key == "school_name"))
    setting = settings_res.scalar_one_or_none()
    school_name = setting.setting_value.strip('"') if setting else "7A Model School"

    excel_bytes = ExcelMigrationService.export_students_to_excel(students_data, school_name)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Students_Export_{school_name.replace(' ', '_')}.xlsx"},
    )
