from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select, update, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException, AppException
from app.shared.responses import success_response, DependencyRule, check_dependencies
from app.middlewares.auth_middleware import RequirePermission, get_current_user, CurrentTenantUser
from app.modules.academics.models import (
    AcademicYear,
    ClassLevel,
    Section,
    Subject,
    ClassSubject,
    ClassTeacher,
)
from app.modules.academics.schemas import (
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicYearResponse,
    ClassLevelCreate,
    ClassLevelUpdate,
    ClassLevelResponse,
    SectionCreate,
    SectionUpdate,
    SectionResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    AssignSubjectsToClassRequest,
    CopyCurriculumRequest,
    ClassTeacherAssignRequest,
    HomeworkCreateRequest,
    HomeworkUpdate,
    StudentLeaveSubmitRequest,
    StudentLeaveStatusUpdateRequest,
)
from app.modules.students.models import StudentEnrollment
from app.modules.users_rbac.models import User
from app.modules.staff.models import StaffProfile

router = APIRouter(prefix="/academics", tags=["Academics & Sessions"])


# ==========================================
# 1. Academic Years (Sessions)
# ==========================================
@router.get("/years")
async def list_academic_years(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all academic sessions in the school."""
    stmt = select(AcademicYear).order_by(AcademicYear.start_date.desc())
    result = await db.execute(stmt)
    years = result.scalars().all()
    return success_response(
        data=[
            {
                "id": y.id,
                "name": y.name,
                "start_date": str(y.start_date),
                "end_date": str(y.end_date),
                "is_current": y.is_current,
                "is_locked": y.is_locked,
            }
            for y in years
        ]
    )


@router.post("/years", dependencies=[Depends(RequirePermission("academics:manage"))], status_code=status.HTTP_201_CREATED)
async def create_academic_year(req: AcademicYearCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new academic year session (e.g. 2026-2027). Prevents duplicate session names."""
    clean_name = req.name.strip()
    existing = await db.execute(
        select(AcademicYear).where(func.lower(func.trim(AcademicYear.name)) == clean_name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Academic session '{clean_name}' already exists."
        )

    if req.is_current:
        # Mark all other years as not current
        await db.execute(update(AcademicYear).values(is_current=False))

    year = AcademicYear(
        name=clean_name,
        start_date=req.start_date,
        end_date=req.end_date,
        is_current=req.is_current,
    )
    db.add(year)
    await db.commit()
    await db.refresh(year)

    return success_response(
        data={"id": year.id, "name": year.name, "is_current": year.is_current},
        message=f"Academic Year '{year.name}' created successfully",
    )


@router.patch("/years/{year_id}/set-current", dependencies=[Depends(RequirePermission("academics:manage"))])
async def set_current_academic_year(year_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Sets the active operational academic year for the school."""
    stmt = select(AcademicYear).where(AcademicYear.id == year_id)
    result = await db.execute(stmt)
    year = result.scalar_one_or_none()

    if not year:
        raise ResourceNotFoundException("AcademicYear", year_id)

    await db.execute(update(AcademicYear).values(is_current=False))
    year.is_current = True
    await db.commit()

    return success_response(
        data={"id": year.id, "name": year.name, "is_current": True},
        message=f"Academic Year '{year.name}' set as active current session",
    )


@router.put("/years/{year_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def update_academic_year(year_id: str, req: AcademicYearUpdate, db: AsyncSession = Depends(get_tenant_db)):
    """Updates academic year details (name, start_date, end_date)."""
    stmt = select(AcademicYear).where(AcademicYear.id == year_id)
    result = await db.execute(stmt)
    year = result.scalar_one_or_none()
    if not year:
        raise ResourceNotFoundException("AcademicYear", year_id)

    if req.name and req.name.strip():
        clean_name = req.name.strip()
        if clean_name.lower() != year.name.lower():
            dup = await db.execute(
                select(AcademicYear).where(
                    func.lower(func.trim(AcademicYear.name)) == clean_name.lower(),
                    AcademicYear.id != year_id,
                )
            )
            if dup.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Academic session '{clean_name}' already exists."
                )
            year.name = clean_name

    new_start = req.start_date or year.start_date
    new_end = req.end_date or year.end_date
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session end date must be after the start date."
        )

    if req.start_date:
        year.start_date = req.start_date
    if req.end_date:
        year.end_date = req.end_date

    await db.commit()
    await db.refresh(year)
    return success_response(
        data={"id": year.id, "name": year.name, "start_date": str(year.start_date), "end_date": str(year.end_date), "is_current": year.is_current},
        message=f"Academic Year '{year.name}' updated successfully"
    )


@router.delete("/years/{year_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def delete_academic_year(year_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Safely deletes an inactive academic session if no linked records exist."""
    stmt = select(AcademicYear).where(AcademicYear.id == year_id)
    result = await db.execute(stmt)
    year = result.scalar_one_or_none()

    if not year:
        raise ResourceNotFoundException("AcademicYear", year_id)

    if year.is_current:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the active academic session. Set another session as active first before deleting."
        )

    from app.modules.students.models import StudentEnrollment
    from app.modules.attendance.models import AttendanceSession
    from app.modules.academics.models import ClassHomework, ClassTeacher
    from app.modules.exams.models import ExamTerm
    from app.modules.fees.models import FeeStructure

    rules = [
        DependencyRule(StudentEnrollment, StudentEnrollment.academic_year_id, "Student Enrollments"),
        DependencyRule(AttendanceSession, AttendanceSession.academic_year_id, "Attendance Sessions"),
        DependencyRule(ClassHomework, ClassHomework.academic_year_id, "Homework Assignments"),
        DependencyRule(ExamTerm, ExamTerm.academic_year_id, "Exam Terms"),
        DependencyRule(FeeStructure, FeeStructure.academic_year_id, "Fee Structures"),
    ]
    await check_dependencies(db, year_id, f"Academic Session '{year.name}'", rules)

    # Clean up empty class teacher mappings if any exist
    await db.execute(delete(ClassTeacher).where(ClassTeacher.academic_year_id == year_id))

    year_name = year.name
    await db.delete(year)
    await db.commit()

    return success_response(
        data={"id": year_id, "name": year_name},
        message=f"Academic session '{year_name}' deleted successfully",
    )


# ==========================================
# 2. Classes & Sections
# ==========================================
@router.get("/classes")
async def list_classes(academic_year_id: Optional[str] = None, db: AsyncSession = Depends(get_tenant_db)):
    """Lists all classes with their active sections, live seat occupancy telemetry, and assigned class teachers."""
    stmt = select(ClassLevel).options(selectinload(ClassLevel.sections)).order_by(ClassLevel.numeric_order.asc())
    result = await db.execute(stmt)
    classes = result.scalars().all()

    # Determine academic year for live occupancy & teacher telemetry
    curr_yr_id = academic_year_id
    if not curr_yr_id:
        curr_yr_stmt = select(AcademicYear.id).where(AcademicYear.is_current == True)
        curr_yr_res = await db.execute(curr_yr_stmt)
        curr_yr_id = curr_yr_res.scalar_one_or_none()

    # 1. Active enrollment counts per section
    enrollment_counts = {}
    if curr_yr_id:
        enr_stmt = (
            select(StudentEnrollment.section_id, func.count(StudentEnrollment.id))
            .where(
                StudentEnrollment.academic_year_id == curr_yr_id,
                StudentEnrollment.is_active == True,
            )
            .group_by(StudentEnrollment.section_id)
        )
        enr_res = await db.execute(enr_stmt)
        for sec_id, count in enr_res.all():
            enrollment_counts[sec_id] = count

    # 2. Assigned class teachers per section
    teacher_map = {}
    if curr_yr_id:
        tch_stmt = (
            select(ClassTeacher, User, StaffProfile)
            .join(User, ClassTeacher.teacher_user_id == User.id)
            .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
            .where(ClassTeacher.academic_year_id == curr_yr_id)
        )
        tch_res = await db.execute(tch_stmt)
        for ct, u_obj, sp_obj in tch_res.all():
            full_name = f"{sp_obj.first_name} {sp_obj.last_name or ''}".strip() if sp_obj else u_obj.username
            teacher_map[ct.section_id] = {
                "id": ct.id,
                "teacher_user_id": ct.teacher_user_id,
                "teacher_name": full_name,
                "employee_id": sp_obj.employee_id if sp_obj else None,
                "academic_year_id": ct.academic_year_id,
            }

    class_list = []
    for c in classes:
        sec_list = []
        for s in c.sections:
            cap = s.capacity or 45
            enrolled = enrollment_counts.get(s.id, 0)
            vacant = max(0, cap - enrolled)
            occ_rate = round((enrolled / cap) * 100, 1) if cap > 0 else 0.0

            if enrolled == 0:
                occ_status = "Available"
            elif enrolled > cap:
                occ_status = "Over Capacity"
            elif enrolled == cap:
                occ_status = "Full"
            elif enrolled >= int(cap * 0.85):
                occ_status = "Nearly Full"
            elif enrolled >= int(cap * 0.5):
                occ_status = "Filling Fast"
            else:
                occ_status = "Available"

            sec_list.append({
                "id": s.id,
                "name": s.name,
                "capacity": cap,
                "enrolled_count": enrolled,
                "vacant_seats": vacant,
                "occupancy_rate": occ_rate,
                "occupancy_status": occ_status,
                "class_teacher": teacher_map.get(s.id, None),
            })

        class_list.append({
            "id": c.id,
            "name": c.name,
            "numeric_order": c.numeric_order,
            "description": c.description,
            "sections": sec_list,
        })

    return success_response(data=class_list)


@router.post("/classes", dependencies=[Depends(RequirePermission("academics:manage"))], status_code=status.HTTP_201_CREATED)
async def create_class(req: ClassLevelCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a class and optionally seeds initial sections (e.g. ['A', 'B'])."""
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class name cannot be empty.")

    # Duplicate check by name (case-insensitive)
    dup = await db.execute(
        select(ClassLevel).where(func.lower(func.trim(ClassLevel.name)) == clean_name.lower())
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Class '{clean_name}' already exists.")

    if req.numeric_order is not None and req.numeric_order < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Numeric order must be a non-negative number.")

    class_obj = ClassLevel(
        name=clean_name,
        numeric_order=req.numeric_order if req.numeric_order is not None else 1,
        description=req.description.strip() if req.description else None,
    )
    db.add(class_obj)
    await db.flush()

    sections_to_add = req.initial_sections or ["A"]
    seen_sections = set()
    for sec_name in sections_to_add:
        cleaned_sec = sec_name.strip().upper()
        if cleaned_sec and cleaned_sec not in seen_sections:
            seen_sections.add(cleaned_sec)
            sec = Section(class_id=class_obj.id, name=cleaned_sec, capacity=45)
            db.add(sec)

    await db.commit()
    await db.refresh(class_obj)

    return success_response(
        data={"id": class_obj.id, "name": class_obj.name, "sections": list(seen_sections)},
        message=f"Class '{class_obj.name}' created with sections",
    )


@router.post("/classes/{class_id}/sections", dependencies=[Depends(RequirePermission("academics:manage"))])
async def add_section_to_class(class_id: str, req: SectionCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Adds a new section to an existing class."""
    stmt = select(ClassLevel).where(ClassLevel.id == class_id)
    result = await db.execute(stmt)
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        raise ResourceNotFoundException("ClassLevel", class_id)

    clean_sec_name = req.name.strip().upper()
    if not clean_sec_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Section name cannot be empty.")

    # Duplicate check in same class
    dup = await db.execute(
        select(Section).where(
            Section.class_id == class_id,
            func.upper(func.trim(Section.name)) == clean_sec_name,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section '{clean_sec_name}' already exists in '{class_obj.name}'.",
        )

    capacity = req.capacity if req.capacity is not None and req.capacity > 0 else 45

    sec = Section(class_id=class_id, name=clean_sec_name, capacity=capacity)
    db.add(sec)
    await db.commit()
    await db.refresh(sec)

    return success_response(
        data={"id": sec.id, "class_id": sec.class_id, "name": sec.name, "capacity": sec.capacity},
        message=f"Section '{sec.name}' added to '{class_obj.name}'",
    )


@router.put("/classes/{class_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def update_class(class_id: str, req: ClassLevelUpdate, db: AsyncSession = Depends(get_tenant_db)):
    """Updates class details (name, numeric_order, description)."""
    stmt = select(ClassLevel).where(ClassLevel.id == class_id)
    result = await db.execute(stmt)
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise ResourceNotFoundException("ClassLevel", class_id)

    if req.name and req.name.strip():
        clean_name = req.name.strip()
        if clean_name.lower() != class_obj.name.lower():
            dup = await db.execute(
                select(ClassLevel).where(
                    func.lower(func.trim(ClassLevel.name)) == clean_name.lower(),
                    ClassLevel.id != class_id,
                )
            )
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Class '{clean_name}' already exists.")
            class_obj.name = clean_name

    if req.numeric_order is not None:
        class_obj.numeric_order = req.numeric_order
    if req.description is not None:
        class_obj.description = req.description

    await db.commit()
    await db.refresh(class_obj)
    return success_response(
        data={"id": class_obj.id, "name": class_obj.name, "numeric_order": class_obj.numeric_order, "description": class_obj.description},
        message=f"Class '{class_obj.name}' updated successfully",
    )


@router.delete("/classes/{class_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def delete_class(class_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Safely deletes an empty class if no students, homework, or exams are linked."""
    stmt = select(ClassLevel).where(ClassLevel.id == class_id)
    result = await db.execute(stmt)
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise ResourceNotFoundException("ClassLevel", class_id)

    from app.modules.students.models import StudentEnrollment
    from app.modules.academics.models import ClassHomework, ClassTeacher
    from app.modules.exams.models import ExamSchedule

    rules = [
        DependencyRule(StudentEnrollment, StudentEnrollment.class_id, "Student Enrollments"),
        DependencyRule(ClassHomework, ClassHomework.class_id, "Homework Assignments"),
        DependencyRule(ExamSchedule, ExamSchedule.class_id, "Exam Schedules"),
        DependencyRule(ClassTeacher, ClassTeacher.class_id, "Assigned Class Teachers"),
    ]
    await check_dependencies(db, class_id, f"Class '{class_obj.name}'", rules)

    class_name = class_obj.name
    await db.delete(class_obj)
    await db.commit()
    return success_response(data={"id": class_id, "name": class_name}, message=f"Class '{class_name}' deleted successfully")


@router.put("/classes/{class_id}/sections/{section_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def update_section(class_id: str, section_id: str, req: SectionUpdate, db: AsyncSession = Depends(get_tenant_db)):
    """Updates section name or capacity."""
    stmt = select(Section).where(Section.id == section_id, Section.class_id == class_id)
    result = await db.execute(stmt)
    sec = result.scalar_one_or_none()
    if not sec:
        raise ResourceNotFoundException("Section", section_id)

    if req.name and req.name.strip():
        clean_name = req.name.strip().upper()
        if clean_name != sec.name:
            dup = await db.execute(
                select(Section).where(
                    Section.class_id == class_id,
                    func.upper(func.trim(Section.name)) == clean_name,
                    Section.id != section_id,
                )
            )
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Section '{clean_name}' already exists in this class.")
            sec.name = clean_name

    if req.capacity is not None:
        if req.capacity < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capacity must be at least 1 seat.")
        sec.capacity = req.capacity

    await db.commit()
    await db.refresh(sec)
    return success_response(
        data={"id": sec.id, "class_id": sec.class_id, "name": sec.name, "capacity": sec.capacity},
        message=f"Section '{sec.name}' updated successfully",
    )


@router.delete("/classes/{class_id}/sections/{section_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def delete_section(class_id: str, section_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Safely deletes an empty section if no students or homework are linked."""
    stmt = select(Section).where(Section.id == section_id, Section.class_id == class_id)
    result = await db.execute(stmt)
    sec = result.scalar_one_or_none()
    if not sec:
        raise ResourceNotFoundException("Section", section_id)

    from app.modules.students.models import StudentEnrollment
    from app.modules.academics.models import ClassHomework, ClassTeacher

    rules = [
        DependencyRule(StudentEnrollment, StudentEnrollment.section_id, "Student Enrollments"),
        DependencyRule(ClassHomework, ClassHomework.section_id, "Homework Assignments"),
        DependencyRule(ClassTeacher, ClassTeacher.section_id, "Assigned Class Teachers"),
    ]
    await check_dependencies(db, section_id, f"Section '{sec.name}'", rules)

    sec_name = sec.name
    await db.delete(sec)
    await db.commit()
    return success_response(data={"id": section_id, "name": sec_name}, message=f"Section '{sec_name}' deleted successfully")


# ==========================================
# 3. Subjects & Class Subject Mapping
# ==========================================
@router.get("/subjects")
async def list_subjects(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all subjects offered by the school."""
    stmt = select(Subject).order_by(Subject.name.asc())
    result = await db.execute(stmt)
    subjects = result.scalars().all()
    return success_response(
        data=[
            {
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "subject_type": s.subject_type,
                "is_elective": s.is_elective,
            }
            for s in subjects
        ]
    )


@router.post("/subjects", dependencies=[Depends(RequirePermission("academics:manage"))], status_code=status.HTTP_201_CREATED)
async def create_subject(req: SubjectCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new subject with duplicate code check."""
    clean_code = req.code.strip().upper()
    existing = await db.execute(select(Subject).where(func.upper(func.trim(Subject.code)) == clean_code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject code '{clean_code}' already exists. Please choose a different subject code.",
        )

    sub = Subject(
        code=clean_code,
        name=req.name.strip(),
        subject_type=req.subject_type,
        is_elective=req.is_elective,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return success_response(data={"id": sub.id, "code": sub.code, "name": sub.name}, message="Subject created")


@router.put("/subjects/{subject_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def update_subject(subject_id: str, req: SubjectUpdate, db: AsyncSession = Depends(get_tenant_db)):
    """Updates subject details (code, name, type, is_elective)."""
    stmt = select(Subject).where(Subject.id == subject_id)
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    if not sub:
        raise ResourceNotFoundException("Subject", subject_id)

    if req.code and req.code.strip():
        clean_code = req.code.strip().upper()
        if clean_code != sub.code:
            dup = await db.execute(
                select(Subject).where(func.upper(func.trim(Subject.code)) == clean_code, Subject.id != subject_id)
            )
            if dup.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subject code '{clean_code}' already exists. Please choose a different subject code.",
                )
            sub.code = clean_code

    if req.name and req.name.strip():
        sub.name = req.name.strip()
    if req.subject_type is not None:
        sub.subject_type = req.subject_type
    if req.is_elective is not None:
        sub.is_elective = req.is_elective

    await db.commit()
    await db.refresh(sub)
    return success_response(
        data={"id": sub.id, "code": sub.code, "name": sub.name, "subject_type": sub.subject_type, "is_elective": sub.is_elective},
        message=f"Subject '{sub.name}' updated successfully",
    )


@router.delete("/subjects/{subject_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def delete_subject(subject_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Safely deletes an unused subject if not mapped to classes, homework, or exams."""
    stmt = select(Subject).where(Subject.id == subject_id)
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    if not sub:
        raise ResourceNotFoundException("Subject", subject_id)

    from app.modules.academics.models import ClassSubject, ClassHomework
    from app.modules.exams.models import ExamSchedule

    rules = [
        DependencyRule(ClassSubject, ClassSubject.subject_id, "Class Curriculum Mappings"),
        DependencyRule(ClassHomework, ClassHomework.subject_id, "Homework Assignments"),
        DependencyRule(ExamSchedule, ExamSchedule.subject_id, "Exam Schedules"),
    ]
    await check_dependencies(db, subject_id, f"Subject '{sub.name}'", rules)

    sub_name = sub.name
    await db.delete(sub)
    await db.commit()
    return success_response(data={"id": subject_id, "name": sub_name}, message=f"Subject '{sub_name}' deleted successfully")


@router.get("/classes/{class_id}/subjects")
async def get_class_subjects(class_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Retrieves all subjects mapped to a class."""
    stmt = (
        select(ClassSubject, Subject)
        .join(Subject, ClassSubject.subject_id == Subject.id)
        .where(ClassSubject.class_id == class_id)
        .order_by(Subject.name.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return success_response(
        data=[
            {
                "id": cs.id,
                "class_id": cs.class_id,
                "subject_id": sub.id,
                "subject_code": sub.code,
                "subject_name": sub.name,
                "subject_type": sub.subject_type,
                "is_mandatory": cs.is_mandatory,
            }
            for cs, sub in rows
        ]
    )


@router.post("/classes/{class_id}/subjects", dependencies=[Depends(RequirePermission("academics:manage"))])
async def assign_subjects_to_class(
    class_id: str,
    req: AssignSubjectsToClassRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Synchronizes subjects mapped to a class curriculum."""
    # 1. Fetch current mappings for this class
    stmt = select(ClassSubject).where(ClassSubject.class_id == class_id)
    result = await db.execute(stmt)
    current_mappings = result.scalars().all()
    current_map = {cs.subject_id: cs for cs in current_mappings}

    target_ids = set(req.subject_ids or [])

    # 2. Delete unselected mappings
    for sub_id, cs_obj in current_map.items():
        if sub_id not in target_ids:
            await db.delete(cs_obj)

    # 3. Add newly selected mappings
    for sub_id in target_ids:
        if sub_id not in current_map:
            db.add(ClassSubject(class_id=class_id, subject_id=sub_id, is_mandatory=True))

    await db.commit()
    return success_response(
        data={"class_id": class_id, "mapped_count": len(target_ids)},
        message="Class curriculum mapped and synchronized successfully"
    )


@router.delete("/classes/{class_id}/subjects/{subject_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def unassign_subject_from_class(class_id: str, subject_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Removes a subject mapping from a class curriculum."""
    stmt = select(ClassSubject).where(ClassSubject.class_id == class_id, ClassSubject.subject_id == subject_id)
    result = await db.execute(stmt)
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject is not mapped to this class.")

    await db.delete(mapping)
    await db.commit()
    return success_response(message="Subject removed from class curriculum")


@router.post("/curriculum/copy", dependencies=[Depends(RequirePermission("academics:manage"))])
async def copy_curriculum(req: CopyCurriculumRequest, db: AsyncSession = Depends(get_tenant_db)):
    """Copies all mapped subjects from a source class to one or more target classes."""
    if not req.target_class_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select at least one target class.")

    # 1. Verify source class exists
    src_res = await db.execute(select(ClassLevel).where(ClassLevel.id == req.source_class_id))
    src = src_res.scalar_one_or_none()
    if not src:
        raise ResourceNotFoundException("ClassLevel", req.source_class_id)

    # 2. Fetch source subjects
    src_map_res = await db.execute(select(ClassSubject).where(ClassSubject.class_id == req.source_class_id))
    src_subjects = src_map_res.scalars().all()
    if not src_subjects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source class '{src.name}' has no subjects mapped in its curriculum to copy."
        )

    mode = (req.copy_mode or "MERGE").strip().upper()
    valid_targets = [tid for tid in req.target_class_ids if tid != req.source_class_id]
    if not valid_targets:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot copy curriculum to the source class itself.")

    total_cloned = 0
    for tid in valid_targets:
        t_res = await db.execute(select(ClassLevel).where(ClassLevel.id == tid))
        t_class = t_res.scalar_one_or_none()
        if not t_class:
            continue

        if mode == "REPLACE":
            # Wipe existing mappings in target class
            await db.execute(delete(ClassSubject).where(ClassSubject.class_id == tid))
            for cs in src_subjects:
                db.add(ClassSubject(class_id=tid, subject_id=cs.subject_id, is_mandatory=cs.is_mandatory))
                total_cloned += 1
        else:  # MERGE (Default)
            existing_res = await db.execute(select(ClassSubject.subject_id).where(ClassSubject.class_id == tid))
            existing_sub_ids = set(existing_res.scalars().all())
            for cs in src_subjects:
                if cs.subject_id not in existing_sub_ids:
                    db.add(ClassSubject(class_id=tid, subject_id=cs.subject_id, is_mandatory=cs.is_mandatory))
                    total_cloned += 1

    await db.commit()
    return success_response(
        data={
            "source_class_id": req.source_class_id,
            "source_class_name": src.name,
            "target_classes_count": len(valid_targets),
            "mode": mode,
            "cloned_subjects_count": total_cloned,
        },
        message=f"Curriculum from '{src.name}' successfully copied to {len(valid_targets)} class(es) ({mode} mode)."
    )


# ==========================================
# 4. Class Teacher Assignment
# ==========================================
@router.get("/teachers")
async def list_teachers(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all active teaching/staff members for class teacher and subject assignments."""
    stmt = (
        select(StaffProfile)
        .options(
            selectinload(StaffProfile.user),
            selectinload(StaffProfile.designation),
            selectinload(StaffProfile.department),
        )
        .where(StaffProfile.is_active == True)
        .order_by(StaffProfile.first_name.asc())
    )
    result = await db.execute(stmt)
    staff_list = result.scalars().all()

    teachers = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "employee_id": s.employee_id,
            "full_name": f"{s.first_name} {s.last_name or ''}".strip(),
            "designation": s.designation.title if s.designation else None,
            "department": s.department.name if s.department else None,
        }
        for s in staff_list
    ]

    # Graceful fallback: if no staff_profiles created yet, fallback to active users
    if not teachers:
        user_stmt = select(User).where(User.is_active == True).order_by(User.username.asc())
        user_res = await db.execute(user_stmt)
        users = user_res.scalars().all()
        teachers = [
            {
                "id": u.id,
                "user_id": u.id,
                "employee_id": "SYS",
                "full_name": u.username.replace("_", " ").title(),
                "designation": "Staff Member",
                "department": "Academics",
            }
            for u in users
        ]

    return success_response(data=teachers)


@router.post("/class-teachers", dependencies=[Depends(RequirePermission("academics:manage"))])
async def assign_class_teacher(req: ClassTeacherAssignRequest, db: AsyncSession = Depends(get_tenant_db)):
    """Assigns a staff member as the Class Teacher for a class-section in an academic year."""
    ay_id = req.academic_year_id
    if not ay_id:
        active_yr_res = await db.execute(select(AcademicYear.id).where(AcademicYear.is_current == True))
        ay_id = active_yr_res.scalar_one_or_none()
        if not ay_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active academic year found.")

    stmt = select(ClassTeacher).where(
        ClassTeacher.academic_year_id == ay_id,
        ClassTeacher.class_id == req.class_id,
        ClassTeacher.section_id == req.section_id,
    )
    result = await db.execute(stmt)
    mapping = result.scalar_one_or_none()

    if mapping:
        mapping.teacher_user_id = req.teacher_user_id
    else:
        mapping = ClassTeacher(
            academic_year_id=ay_id,
            class_id=req.class_id,
            section_id=req.section_id,
            teacher_user_id=req.teacher_user_id,
        )
        db.add(mapping)

    await db.commit()
    return success_response(message="Class teacher assigned successfully")


@router.delete("/class-teachers/{class_id}/{section_id}", dependencies=[Depends(RequirePermission("academics:manage"))])
async def unassign_class_teacher(
    class_id: str,
    section_id: str,
    academic_year_id: Optional[str] = None,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Removes the assigned class teacher for a class and section in the current or specified academic year."""
    ay_id = academic_year_id
    if not ay_id:
        active_yr_res = await db.execute(select(AcademicYear.id).where(AcademicYear.is_current == True))
        ay_id = active_yr_res.scalar_one_or_none()
        if not ay_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active academic year found.")

    stmt = select(ClassTeacher).where(
        ClassTeacher.academic_year_id == ay_id,
        ClassTeacher.class_id == class_id,
        ClassTeacher.section_id == section_id,
    )
    result = await db.execute(stmt)
    ct = result.scalar_one_or_none()
    if not ct:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No class teacher assigned for this section.")

    await db.delete(ct)
    await db.commit()
    return success_response(message="Class teacher unassigned successfully")


# ==========================================
# 5. Class Homework & Assignments (Proposal Section 4 & 14)
# ==========================================
@router.post("/homework")
async def create_class_homework(
    req: HomeworkCreateRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Teacher Action: Assigns daily homework / classwork to a class-section."""
    if not (
        "ADMIN" in current_user.roles
        or "TEACHER" in current_user.roles
        or "academics:manage" in current_user.permissions
        or "attendance:mark" in current_user.permissions
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Requires Teacher or Admin role to assign homework.",
        )
    from app.modules.academics.models import ClassHomework, ClassSubject

    # Curriculum Restriction: verify subject is mapped to this class if class curriculum is configured
    curriculum_count = await db.execute(
        select(func.count()).select_from(ClassSubject).where(ClassSubject.class_id == req.class_id)
    )
    if (curriculum_count.scalar_one() or 0) > 0:
        is_mapped = await db.execute(
            select(ClassSubject).where(ClassSubject.class_id == req.class_id, ClassSubject.subject_id == req.subject_id)
        )
        if not is_mapped.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected subject is not in this class's curriculum mapping.",
            )

    hw = ClassHomework(
        academic_year_id=req.academic_year_id,
        class_id=req.class_id,
        section_id=req.section_id,
        subject_id=req.subject_id,
        title=req.title,
        description=req.description,
        due_date=req.due_date,
        attachment_url=req.attachment_url,
        assigned_by_teacher_id=current_user.id,
    )
    db.add(hw)
    await db.commit()
    await db.refresh(hw)
    return success_response(data={"homework_id": hw.id}, message="Homework assigned successfully.")


@router.get("/homework")
async def list_class_homework(
    class_id: str,
    section_id: str,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists homework assignments for a class-section."""
    from app.modules.academics.models import ClassHomework
    stmt = (
        select(ClassHomework)
        .options(selectinload(ClassHomework.subject), selectinload(ClassHomework.assigned_by))
        .where(ClassHomework.class_id == class_id, ClassHomework.section_id == section_id)
        .order_by(ClassHomework.assigned_date.desc())
    )
    res = await db.execute(stmt)
    records = res.scalars().all()
    return success_response(
        data=[
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "subject_id": r.subject_id,
                "subject_name": r.subject.name if r.subject else "General",
                "assigned_date": str(r.assigned_date),
                "due_date": str(r.due_date),
                "attachment_url": r.attachment_url,
                "assigned_by": r.assigned_by.username if r.assigned_by else "Teacher",
            }
            for r in records
        ]
    )


@router.put("/homework/{homework_id}")
async def update_class_homework(
    homework_id: str,
    req: HomeworkUpdate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Updates an existing homework assignment."""
    if not (
        "ADMIN" in current_user.roles
        or "TEACHER" in current_user.roles
        or "academics:manage" in current_user.permissions
        or "attendance:mark" in current_user.permissions
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Requires Teacher or Admin role.",
        )
    from app.modules.academics.models import ClassHomework, ClassSubject

    stmt = select(ClassHomework).where(ClassHomework.id == homework_id)
    result = await db.execute(stmt)
    hw = result.scalar_one_or_none()
    if not hw:
        raise ResourceNotFoundException("ClassHomework", homework_id)

    if req.title is not None and req.title.strip():
        hw.title = req.title.strip()
    if req.description is not None:
        hw.description = req.description.strip()
    if req.due_date is not None:
        hw.due_date = req.due_date
    if req.subject_id is not None:
        curriculum_count = await db.execute(
            select(func.count()).select_from(ClassSubject).where(ClassSubject.class_id == hw.class_id)
        )
        if (curriculum_count.scalar_one() or 0) > 0:
            is_mapped = await db.execute(
                select(ClassSubject).where(ClassSubject.class_id == hw.class_id, ClassSubject.subject_id == req.subject_id)
            )
            if not is_mapped.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The selected subject is not in this class's curriculum mapping.",
                )
        hw.subject_id = req.subject_id
    if req.attachment_url is not None:
        hw.attachment_url = req.attachment_url

    await db.commit()
    await db.refresh(hw)
    return success_response(data={"id": hw.id}, message="Homework updated successfully.")


@router.delete("/homework/{homework_id}")
async def delete_class_homework(
    homework_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Deletes an existing homework assignment."""
    if not (
        "ADMIN" in current_user.roles
        or "TEACHER" in current_user.roles
        or "academics:manage" in current_user.permissions
        or "attendance:mark" in current_user.permissions
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Requires Teacher or Admin role.",
        )
    from app.modules.academics.models import ClassHomework

    stmt = select(ClassHomework).where(ClassHomework.id == homework_id)
    result = await db.execute(stmt)
    hw = result.scalar_one_or_none()
    if not hw:
        raise ResourceNotFoundException("ClassHomework", homework_id)

    await db.delete(hw)
    await db.commit()
    return success_response(data={"id": homework_id}, message="Homework deleted successfully.")


# ==========================================
# 6. Student Leave Requests (Proposal Section 4 & 14)
# ==========================================
@router.post("/leaves")
async def submit_student_leave_request(
    req: StudentLeaveSubmitRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent/Student Action: Submits leave request."""
    from app.modules.academics.models import StudentLeaveRequest

    leave = StudentLeaveRequest(
        student_id=req.student_id,
        from_date=req.from_date,
        to_date=req.to_date,
        reason=req.reason,
        status="PENDING",
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return success_response(data={"leave_id": leave.id}, message="Leave request submitted successfully.")


@router.get("/leaves")
async def list_student_leave_requests(
    student_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Lists student leave applications.
    - If user is PARENT: strictly restricted to their own enrolled children (prevents IDOR).
    - If user is STAFF: permitted to review requests for class management.
    """
    from app.modules.academics.models import StudentLeaveRequest
    from app.modules.students.models import Parent, Student
    from app.core.exceptions import PermissionDeniedException

    is_parent = current_user.user_type == "PARENT" or "PARENT" in current_user.roles
    is_staff = "ADMIN" in current_user.roles or "TEACHER" in current_user.roles or "attendance:view" in current_user.permissions or "attendance:mark" in current_user.permissions

    stmt = select(StudentLeaveRequest).options(selectinload(StudentLeaveRequest.student)).order_by(StudentLeaveRequest.created_at.desc())

    if is_parent and not is_staff:
        p_stmt = select(Parent.id).where(Parent.user_id == current_user.id)
        p_res = await db.execute(p_stmt)
        parent_id = p_res.scalar_one_or_none()
        if not parent_id:
            return success_response(data=[])

        ch_stmt = select(Student.id).where(Student.parent_id == parent_id)
        ch_res = await db.execute(ch_stmt)
        allowed_child_ids = ch_res.scalars().all()

        if student_id:
            if student_id not in allowed_child_ids:
                raise PermissionDeniedException("You can only view leave applications for your own children.")
            stmt = stmt.where(StudentLeaveRequest.student_id == student_id)
        else:
            stmt = stmt.where(StudentLeaveRequest.student_id.in_(allowed_child_ids))
    elif is_staff:
        if student_id:
            stmt = stmt.where(StudentLeaveRequest.student_id == student_id)
    else:
        raise PermissionDeniedException("Insufficient permissions to view leave requests")

    if status:
        stmt = stmt.where(StudentLeaveRequest.status == status.upper())

    res = await db.execute(stmt)
    records = res.scalars().all()
    return success_response(
        data=[
            {
                "id": r.id,
                "student_id": r.student_id,
                "student_name": f"{r.student.first_name} {r.student.last_name or ''}".strip() if r.student else "-",
                "from_date": str(r.from_date),
                "to_date": str(r.to_date),
                "reason": r.reason,
                "status": r.status,
                "approval_remarks": r.approval_remarks,
            }
            for r in records
        ]
    )


@router.patch("/leaves/{leave_id}/status")
async def update_student_leave_status(
    leave_id: str,
    req: StudentLeaveStatusUpdateRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Teacher/Staff Action: Approves or rejects student leave request."""
    from app.modules.academics.models import StudentLeaveRequest
    from app.core.exceptions import PermissionDeniedException

    is_staff = "ADMIN" in current_user.roles or "TEACHER" in current_user.roles or "attendance:mark" in current_user.permissions
    if not is_staff:
        raise PermissionDeniedException("Only authorized teachers and administrators can review leave requests")

    stmt = select(StudentLeaveRequest).where(StudentLeaveRequest.id == leave_id)
    res = await db.execute(stmt)
    leave = res.scalar_one_or_none()

    if not leave:
        raise ResourceNotFoundException("StudentLeaveRequest", leave_id)

    leave.status = req.status.upper()
    if req.approval_remarks:
        leave.approval_remarks = req.approval_remarks

    await db.commit()
    await db.refresh(leave)
    return success_response(data={"leave_id": leave.id, "status": leave.status}, message=f"Leave request marked as {leave.status}")

