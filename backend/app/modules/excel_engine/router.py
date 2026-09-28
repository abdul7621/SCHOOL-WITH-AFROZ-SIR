from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.core.database import get_tenant_db
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission, get_current_user_or_token, CurrentTenantUser
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


@router.get("/export/udise-plus")
async def export_udise_plus_sdms(
    class_id: Optional[str] = None,
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Exports official 35-Column Government UDISE+ SDMS Bulk Upload spreadsheet.
    """
    from app.modules.lookups.models import LookupValue
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

    stmt = stmt.order_by(ClassLevel.id, Section.id, StudentEnrollment.roll_no, Student.admission_no)
    res = await db.execute(stmt)
    rows = res.all()

    lookups_res = await db.execute(select(LookupValue))
    lookups_map = {lv.id: lv.label for lv in lookups_res.scalars().all()}

    settings_res = await db.execute(select(SystemSetting))
    settings_dict = {
        s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value))
        for s in settings_res.scalars().all()
    }
    school_name = settings_dict.get("school_name", "7A Model Academy")
    dise_code = settings_dict.get("dise_code", "24070501234")

    students_data = []
    for st, enroll, cls_lvl, sec, parent in rows:
        cust = st.custom_attributes or {}
        dob = st.dob
        dob_str = dob.strftime("%d/%m/%Y") if dob else ""
        adm_date_str = enroll.enrollment_date.strftime("%d/%m/%Y") if enroll.enrollment_date else ""

        gender_label = lookups_map.get(st.gender_id, "Male") if st.gender_id else (cust.get("gender") or "Male")
        category_label = lookups_map.get(st.caste_category_id, cust.get("category", "General")) if st.caste_category_id else (cust.get("category") or "General")

        record = {
            "pen_11": cust.get("pen_11") or cust.get("pen_no") or cust.get("pen"),
            "full_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "first_name": st.first_name,
            "last_name": st.last_name or "",
            "gender": gender_label,
            "dob_str": dob_str,
            "mother_name": parent.mother_name or "",
            "father_name": parent.father_name or "",
            "guardian_name": parent.father_name or "",
            "aadhaar_no": cust.get("aadhaar_no") or cust.get("aadhar") or "",
            "name_as_per_aadhaar": cust.get("name_as_per_aadhaar") or f"{st.first_name} {st.last_name or ''}".strip(),
            "address": parent.address or "",
            "pincode": cust.get("pincode") or "380001",
            "primary_phone": parent.primary_phone or "",
            "alternate_phone": parent.whatsapp_phone or "",
            "email": parent.email or "",
            "mother_tongue": cust.get("mother_tongue") or "Gujarati",
            "category": category_label,
            "minority_code": cust.get("minority_code", 0),
            "bpl_code": 1 if cust.get("is_bpl") else 2,
            "aay_code": 1 if cust.get("is_aay") else 2,
            "cwsn_code": 1 if cust.get("is_cwsn") else 2,
            "cwsn_type": cust.get("cwsn_type", "NA"),
            "admission_no": st.admission_no,
            "admission_date_str": adm_date_str,
            "class_name": cls_lvl.name,
            "section_name": sec.name,
            "roll_no": enroll.roll_no or "",
            "academic_stream": cust.get("academic_stream", "General"),
            "prev_school_code": cust.get("prev_school_code", 1),
            "prev_class": cust.get("prev_class", "-"),
            "prev_exam_code": cust.get("prev_exam_code", 1),
            "prev_marks_pct": cust.get("prev_marks_pct", "80.00"),
            "is_rte": bool(cust.get("is_rte") or cust.get("rte_quota")),
            "apaar_id": cust.get("apaar_id") or cust.get("apaar_no") or "",
        }
        students_data.append(record)

    excel_bytes = ExcelMigrationService.export_udise_plus_to_excel(
        students_data=students_data,
        school_name=school_name,
        dise_code=dise_code,
    )
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=UDISE_PLUS_SDMS_{dise_code}.xlsx"},
    )

