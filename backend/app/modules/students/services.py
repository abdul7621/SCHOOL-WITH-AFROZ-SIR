import uuid
from datetime import date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import AppException, ResourceNotFoundException
from app.modules.students.models import Parent, Student, StudentEnrollment, StudentDocument
from app.modules.students.schemas import StudentAdmissionRequest, BulkPromotionRequest, StudentUpdateRequest
from app.modules.lookups.models import StudentStatus, LookupValue
from app.modules.academics.models import ClassLevel, Section, AcademicYear


class StudentService:
    @staticmethod
    async def _generate_admission_no(db: AsyncSession) -> str:
        """Generates sequential unique admission number if not provided."""
        stmt = select(func.count(Student.id))
        result = await db.execute(stmt)
        count = result.scalar() or 0
        year = date.today().year
        adm_no = f"ADM-{year}-{(count + 1):04d}"

        # Ensure uniqueness
        offset = 1
        while True:
            existing = await db.execute(select(Student.id).where(Student.admission_no == adm_no))
            if not existing.scalar_one_or_none():
                break
            offset += 1
            adm_no = f"ADM-{year}-{(count + offset):04d}"

        return adm_no

    @classmethod
    async def admit_student(cls, req: StudentAdmissionRequest, db: AsyncSession) -> Student:
        """
        Executes atomic admission workflow:
        1. Ensures lookups and statuses exist in tenant DB.
        2. Finds or creates Parent by primary_phone.
        3. Validates status, gender, blood group.
        4. Creates Student record.
        5. Creates active StudentEnrollment in class/section.
        """
        from app.modules.lookups.services import LookupService
        await LookupService.ensure_system_lookups(db)

        # 1. Check/Create Parent
        phone = str(req.parent.primary_phone).strip()
        parent_stmt = select(Parent).where(Parent.primary_phone == phone)
        parent_result = await db.execute(parent_stmt)
        parent = parent_result.scalar_one_or_none()

        if not parent:
            parent = Parent(
                father_name=req.parent.father_name.strip(),
                mother_name=req.parent.mother_name.strip() if req.parent.mother_name else None,
                primary_phone=phone,
                whatsapp_phone=str(req.parent.whatsapp_phone).strip() if req.parent.whatsapp_phone else phone,
                email=req.parent.email if req.parent.email else None,
                address=req.parent.address.strip() if req.parent.address else None,
                father_occupation=req.parent.father_occupation.strip() if req.parent.father_occupation else None,
                mother_occupation=req.parent.mother_occupation.strip() if req.parent.mother_occupation else None,
            )
            db.add(parent)
            await db.flush()

        # 2. Get/Validate Status
        status_id = req.status_id
        if status_id:
            st_check = (await db.execute(select(StudentStatus).where(StudentStatus.id == status_id))).scalar_one_or_none()
            if not st_check:
                status_id = None

        if not status_id:
            status_stmt = select(StudentStatus).where(StudentStatus.code == "ACTIVE")
            status_res = await db.execute(status_stmt)
            default_status = status_res.scalar_one_or_none()
            if not default_status:
                any_st = (await db.execute(select(StudentStatus).limit(1))).scalar_one_or_none()
                if any_st:
                    default_status = any_st
                else:
                    default_status = StudentStatus(code="ACTIVE", name="Active", allow_attendance=True, allow_fee_demand=True)
                    db.add(default_status)
                    await db.flush()
            status_id = default_status.id

        # 3. Validate Optional Foreign Keys
        gender_id = None
        if req.gender_id:
            g_check = (await db.execute(select(LookupValue).where(LookupValue.id == req.gender_id))).scalar_one_or_none()
            if g_check:
                gender_id = g_check.id

        blood_group_id = None
        if req.blood_group_id:
            bg_check = (await db.execute(select(LookupValue).where(LookupValue.id == req.blood_group_id))).scalar_one_or_none()
            if bg_check:
                blood_group_id = bg_check.id

        religion_id = None
        if req.religion_id:
            rel_check = (await db.execute(select(LookupValue).where(LookupValue.id == req.religion_id))).scalar_one_or_none()
            if rel_check:
                religion_id = rel_check.id

        caste_category_id = None
        if req.caste_category_id:
            caste_check = (await db.execute(select(LookupValue).where(LookupValue.id == req.caste_category_id))).scalar_one_or_none()
            if caste_check:
                caste_category_id = caste_check.id

        # 4. Admission No
        admission_no = req.admission_no
        if admission_no:
            existing_adm = await db.execute(select(Student).where(Student.admission_no == admission_no))
            if existing_adm.scalar_one_or_none():
                raise AppException(f"Admission number '{admission_no}' is already assigned", "ADMISSION_NO_EXISTS")
        else:
            admission_no = await cls._generate_admission_no(db)

        # 5. Create Student
        student = Student(
            admission_no=admission_no,
            first_name=req.first_name.strip(),
            last_name=req.last_name.strip() if req.last_name else None,
            dob=req.dob,
            gender_id=gender_id,
            blood_group_id=blood_group_id,
            religion_id=religion_id,
            caste_category_id=caste_category_id,
            parent_id=parent.id,
            status_id=status_id,
            profile_photo_url=req.profile_photo_url,
            emergency_contact=req.emergency_contact,
            custom_attributes=req.custom_attributes or {},
        )
        db.add(student)
        await db.flush()

        # 6. Validate & Create Enrollment
        ay_id = req.academic_year_id
        ay_check = (await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))).scalar_one_or_none()
        if not ay_check:
            curr_ay = (await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalar_one_or_none()
            if curr_ay:
                ay_id = curr_ay.id

        enrollment = StudentEnrollment(
            student_id=student.id,
            academic_year_id=ay_id,
            class_id=req.class_id,
            section_id=req.section_id,
            roll_no=req.roll_no,
            enrollment_date=req.enrollment_date or date.today(),
            is_active=True,
        )
        db.add(enrollment)

        await db.commit()
        await db.refresh(student)
        return student

    @classmethod
    async def list_students(
        cls,
        db: AsyncSession,
        academic_year_id: Optional[str] = None,
        class_id: Optional[str] = None,
        section_id: Optional[str] = None,
        status_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 25,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Retrieves paginated and filtered student list with enrollment details.
        """
        # Base query joining Student, Enrollment, Parent, Class, Section, Status
        stmt = (
            select(Student, StudentEnrollment, Parent, ClassLevel, Section, StudentStatus, LookupValue)
            .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
            .join(Parent, Student.parent_id == Parent.id)
            .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
            .join(Section, StudentEnrollment.section_id == Section.id)
            .join(StudentStatus, Student.status_id == StudentStatus.id)
            .outerjoin(LookupValue, Student.gender_id == LookupValue.id)
            .where(StudentEnrollment.is_active == True)
        )

        if academic_year_id:
            stmt = stmt.where(StudentEnrollment.academic_year_id == academic_year_id)
        if class_id:
            stmt = stmt.where(StudentEnrollment.class_id == class_id)
        if section_id:
            stmt = stmt.where(StudentEnrollment.section_id == section_id)
        if status_id:
            stmt = stmt.where(Student.status_id == status_id)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Student.admission_no.ilike(pattern),
                    Student.first_name.ilike(pattern),
                    Student.last_name.ilike(pattern),
                    Parent.primary_phone.ilike(pattern),
                    Parent.father_name.ilike(pattern),
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_records = (await db.execute(count_stmt)).scalar() or 0

        # Pagination & Ordering
        stmt = stmt.order_by(ClassLevel.numeric_order.asc(), Section.name.asc(), StudentEnrollment.roll_no.asc())
        stmt = stmt.offset((page - 1) * limit).limit(limit)

        result = await db.execute(stmt)
        rows = result.all()

        student_list = []
        for student, enroll, parent, cls_lvl, sec, st_status, gender in rows:
            student_list.append({
                "id": student.id,
                "admission_no": student.admission_no,
                "full_name": f"{student.first_name} {student.last_name or ''}".strip(),
                "dob": str(student.dob),
                "gender_label": gender.label if gender else None,
                "class_id": cls_lvl.id,
                "section_id": sec.id,
                "class_name": cls_lvl.name,
                "section_name": sec.name,
                "roll_no": enroll.roll_no,
                "father_name": parent.father_name,
                "primary_phone": parent.primary_phone,
                "status_name": st_status.name,
                "is_active": enroll.is_active,
                "profile_photo_url": student.profile_photo_url,
            })

        return student_list, total_records

    @classmethod
    async def get_student_detail(cls, student_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Retrieves comprehensive 360-degree student profile."""
        stmt = (
            select(Student)
            .options(
                selectinload(Student.parent),
                selectinload(Student.status),
                selectinload(Student.documents),
            )
            .where(Student.id == student_id)
        )
        result = await db.execute(stmt)
        student = result.scalar_one_or_none()

        if not student:
            raise ResourceNotFoundException("Student", student_id)

        # Explicit query for active enrollment
        enr_stmt = (
            select(StudentEnrollment, ClassLevel, Section, AcademicYear)
            .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
            .join(Section, StudentEnrollment.section_id == Section.id)
            .join(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
            .where(StudentEnrollment.student_id == student.id, StudentEnrollment.is_active == True)
        )
        enr_res = await db.execute(enr_stmt)
        enr_row = enr_res.first()

        current_enrollment = None
        if enr_row:
            enroll, cls_lvl, sec, ay = enr_row
            current_enrollment = {
                "academic_year_id": ay.id,
                "academic_year_name": ay.name,
                "class_id": cls_lvl.id,
                "class_name": cls_lvl.name,
                "section_id": sec.id,
                "section_name": sec.name,
                "roll_no": enroll.roll_no,
                "enrollment_date": str(enroll.enrollment_date),
            }

        return {
            "id": student.id,
            "admission_no": student.admission_no,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "full_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "dob": str(student.dob),
            "gender_id": student.gender_id,
            "blood_group_id": student.blood_group_id,
            "religion_id": student.religion_id,
            "caste_category_id": student.caste_category_id,
            "status_id": student.status_id,
            "status_name": student.status.name if student.status else "Active",
            "emergency_contact": student.emergency_contact,
            "custom_attributes": student.custom_attributes,
            "profile_photo_url": student.profile_photo_url,
            "parent": {
                "id": student.parent.id,
                "father_name": student.parent.father_name,
                "mother_name": student.parent.mother_name,
                "primary_phone": student.parent.primary_phone,
                "whatsapp_phone": student.parent.whatsapp_phone,
                "email": student.parent.email,
                "address": student.parent.address,
                "father_occupation": student.parent.father_occupation,
                "mother_occupation": student.parent.mother_occupation,
            } if student.parent else {},
            "current_enrollment": current_enrollment,
            "documents": [
                {
                    "id": d.id,
                    "title": d.title,
                    "document_type": d.document_type,
                    "file_key": d.file_key,
                }
                for d in student.documents
            ],
            "created_at": student.created_at.isoformat() if student.created_at else None,
        }

    @classmethod
    async def update_student(cls, student_id: str, req: StudentUpdateRequest, db: AsyncSession) -> Student:
        """
        Updates student personal details, parent information, and active enrollment.
        """
        stmt = (
            select(Student)
            .options(selectinload(Student.parent))
            .where(Student.id == student_id)
        )
        result = await db.execute(stmt)
        student = result.scalar_one_or_none()

        if not student:
            raise ResourceNotFoundException("Student", student_id)

        # 1. Update student personal fields
        student_fields = [
            "first_name", "last_name", "dob", "gender_id", "blood_group_id",
            "religion_id", "caste_category_id", "status_id", "profile_photo_url",
            "emergency_contact", "custom_attributes"
        ]
        update_dict = req.model_dump(exclude_unset=True)
        for field in student_fields:
            if field in update_dict and update_dict[field] is not None:
                setattr(student, field, update_dict[field])

        # 2. Update parent details if provided
        if req.parent and student.parent:
            parent_dict = req.parent.model_dump(exclude_unset=True)
            for p_field, p_val in parent_dict.items():
                if p_val is not None:
                    setattr(student.parent, p_field, p_val)

        # 3. Update active enrollment if class/section/roll_no provided
        enrollment_fields = ["class_id", "section_id", "roll_no", "academic_year_id"]
        if any(f in update_dict for f in enrollment_fields):
            enr_stmt = select(StudentEnrollment).where(
                StudentEnrollment.student_id == student.id,
                StudentEnrollment.is_active == True,
            )
            enr_res = await db.execute(enr_stmt)
            active_enr = enr_res.scalar_one_or_none()
            if active_enr:
                if req.class_id:
                    active_enr.class_id = req.class_id
                if req.section_id:
                    active_enr.section_id = req.section_id
                if req.roll_no is not None:
                    active_enr.roll_no = req.roll_no
                if req.academic_year_id:
                    active_enr.academic_year_id = req.academic_year_id

        await db.commit()
        await db.refresh(student)
        return student

    @classmethod
    async def promote_students_bulk(cls, req: BulkPromotionRequest, db: AsyncSession) -> int:
        """
        Executes annual student promotion across academic sessions.
        """
        promoted_count = 0
        for item in req.promotions:
            # 1. Mark previous active enrollments as inactive
            prev_stmt = (
                select(StudentEnrollment)
                .where(
                    StudentEnrollment.student_id == item.student_id,
                    StudentEnrollment.academic_year_id == req.source_academic_year_id,
                )
            )
            prev_res = await db.execute(prev_stmt)
            prev_enroll = prev_res.scalar_one_or_none()
            if prev_enroll:
                prev_enroll.is_active = False

            # 2. Add target enrollment
            new_enroll = StudentEnrollment(
                student_id=item.student_id,
                academic_year_id=req.target_academic_year_id,
                class_id=item.target_class_id,
                section_id=item.target_section_id,
                roll_no=item.target_roll_no,
                enrollment_date=date.today(),
                is_active=True,
            )
            db.add(new_enroll)
            promoted_count += 1

        await db.commit()
        return promoted_count
