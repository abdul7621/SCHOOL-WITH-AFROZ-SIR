from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.students.models import Student, StudentEnrollment
from app.modules.academics.models import ClassLevel, Section
from app.modules.lookups.models import LookupCategory, LookupValue
from app.modules.attendance.models import AttendanceSession, StudentDailyAttendance
from app.modules.attendance.schemas import SubmitAttendanceRequest


class AttendanceService:
    @classmethod
    async def get_class_roster_for_date(
        cls,
        academic_year_id: str,
        class_id: str,
        section_id: str,
        attendance_date: date,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Returns student list for attendance marking. If already marked for this date,
        includes their saved status and remarks.
        """
        # 1. Get all active enrolled students
        stmt = (
            select(Student, StudentEnrollment)
            .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
            .where(
                StudentEnrollment.academic_year_id == academic_year_id,
                StudentEnrollment.class_id == class_id,
                StudentEnrollment.section_id == section_id,
                StudentEnrollment.is_active == True,
            )
            .order_by(StudentEnrollment.roll_no.asc(), Student.first_name.asc())
        )
        result = await db.execute(stmt)
        enrolled_students = result.all()

        # 2. Check if an AttendanceSession already exists
        sess_stmt = (
            select(AttendanceSession)
            .options(selectinload(AttendanceSession.records))
            .where(
                AttendanceSession.academic_year_id == academic_year_id,
                AttendanceSession.class_id == class_id,
                AttendanceSession.section_id == section_id,
                AttendanceSession.attendance_date == attendance_date,
            )
        )
        sess_result = await db.execute(sess_stmt)
        existing_session = sess_result.scalar_one_or_none()

        marked_map = {}
        if existing_session:
            for rec in existing_session.records:
                marked_map[rec.student_id] = {
                    "attendance_status_id": rec.attendance_status_id,
                    "remarks": rec.remarks,
                }

        # 3. Get Attendance Status Lookups
        cat_stmt = select(LookupCategory).where(LookupCategory.code == "ATTENDANCE_STATUS")
        cat_res = await db.execute(cat_stmt)
        cat = cat_res.scalar_one_or_none()

        status_options = []
        default_present_id = None
        if cat:
            vals = await db.execute(select(LookupValue).where(LookupValue.category_id == cat.id, LookupValue.is_active == True))
            for v in vals.scalars().all():
                status_options.append({"id": v.id, "code": v.code, "label": v.label})
                if v.code == "PRESENT":
                    default_present_id = v.id

        roster = []
        for student, enroll in enrolled_students:
            marked_info = marked_map.get(student.id, {})
            current_status = marked_info.get("attendance_status_id", default_present_id)
            remarks = marked_info.get("remarks", None)

            roster.append({
                "student_id": student.id,
                "admission_no": student.admission_no,
                "full_name": f"{student.first_name} {student.last_name or ''}".strip(),
                "roll_no": enroll.roll_no,
                "current_status_id": current_status,
                "remarks": remarks,
            })

        return {
            "academic_year_id": academic_year_id,
            "class_id": class_id,
            "section_id": section_id,
            "attendance_date": str(attendance_date),
            "is_already_marked": existing_session is not None,
            "status_options": status_options,
            "students": roster,
        }

    @classmethod
    async def submit_attendance(
        cls,
        req: SubmitAttendanceRequest,
        marked_by_user_id: str,
        db: AsyncSession,
    ) -> AttendanceSession:
        """
        Atomically saves or updates the daily attendance session and all student records.
        """
        sess_stmt = (
            select(AttendanceSession)
            .options(selectinload(AttendanceSession.records))
            .where(
                AttendanceSession.academic_year_id == req.academic_year_id,
                AttendanceSession.class_id == req.class_id,
                AttendanceSession.section_id == req.section_id,
                AttendanceSession.attendance_date == req.attendance_date,
            )
        )
        result = await db.execute(sess_stmt)
        session = result.scalar_one_or_none()

        if not session:
            session = AttendanceSession(
                academic_year_id=req.academic_year_id,
                class_id=req.class_id,
                section_id=req.section_id,
                attendance_date=req.attendance_date,
                marked_by_user_id=marked_by_user_id,
                status="SUBMITTED",
            )
            db.add(session)
            await db.flush()

        # Update / Insert records
        existing_records_map = {r.student_id: r for r in session.records}

        for item in req.records:
            if item.student_id in existing_records_map:
                record = existing_records_map[item.student_id]
                record.attendance_status_id = item.attendance_status_id
                record.remarks = item.remarks
            else:
                record = StudentDailyAttendance(
                    session_id=session.id,
                    student_id=item.student_id,
                    attendance_status_id=item.attendance_status_id,
                    remarks=item.remarks,
                )
                db.add(record)

        await db.commit()
        await db.refresh(session)
        return session

    @classmethod
    async def get_daily_summary(
        cls,
        academic_year_id: str,
        attendance_date: date,
        class_id: Optional[str],
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Calculates Present, Absent, Late totals for dashboard widgets."""
        stmt = (
            select(LookupValue.code, func.count(StudentDailyAttendance.id))
            .join(StudentDailyAttendance, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .join(AttendanceSession, StudentDailyAttendance.session_id == AttendanceSession.id)
            .where(
                AttendanceSession.academic_year_id == academic_year_id,
                AttendanceSession.attendance_date == attendance_date,
            )
        )
        if class_id:
            stmt = stmt.where(AttendanceSession.class_id == class_id)

        stmt = stmt.group_by(LookupValue.code)
        result = await db.execute(stmt)
        rows = result.all()

        counts = {row[0]: row[1] for row in rows}
        present = counts.get("PRESENT", 0)
        absent = counts.get("ABSENT", 0)
        late = counts.get("LATE", 0)
        half_day = counts.get("HALF_DAY", 0)
        total = present + absent + late + half_day

        pct = round(((present + (late * 0.5) + (half_day * 0.5)) / total * 100), 1) if total > 0 else 0.0

        return {
            "attendance_date": str(attendance_date),
            "total_marked": total,
            "present": present,
            "absent": absent,
            "late": late,
            "half_day": half_day,
            "attendance_percentage": pct,
        }
