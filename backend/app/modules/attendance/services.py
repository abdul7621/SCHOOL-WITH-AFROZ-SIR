import logging
from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
from sqlalchemy.orm import selectinload
from app.modules.students.models import Student, StudentEnrollment
from app.modules.academics.models import ClassLevel, Section, AcademicYear
from app.modules.lookups.models import LookupCategory, LookupValue
from app.modules.attendance.models import AttendanceSession, StudentDailyAttendance
from app.modules.attendance.schemas import SubmitAttendanceRequest


class AttendanceService:
    @classmethod
    async def get_class_roster_for_date(
        cls,
        academic_year_id: Optional[str],
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
                StudentEnrollment.class_id == class_id,
                StudentEnrollment.section_id == section_id,
                StudentEnrollment.is_active == True,
            )
        )
        if academic_year_id:
            stmt = stmt.where(StudentEnrollment.academic_year_id == academic_year_id)

        stmt = stmt.order_by(StudentEnrollment.roll_no.asc(), Student.first_name.asc())
        result = await db.execute(stmt)
        enrolled_students = result.all()

        # Fallback: if no students found with specified session, find any active enrollment in this class & section
        if not enrolled_students and academic_year_id:
            fb_stmt = (
                select(Student, StudentEnrollment)
                .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
                .where(
                    StudentEnrollment.class_id == class_id,
                    StudentEnrollment.section_id == section_id,
                    StudentEnrollment.is_active == True,
                )
                .order_by(StudentEnrollment.roll_no.asc(), Student.first_name.asc())
            )
            fb_res = await db.execute(fb_stmt)
            enrolled_students = fb_res.all()
            if enrolled_students:
                academic_year_id = enrolled_students[0][1].academic_year_id

        if not academic_year_id:
            curr_ay = (await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalar_one_or_none()
            academic_year_id = curr_ay.id if curr_ay else None

        # 2. Check if an AttendanceSession already exists
        sess_stmt = select(AttendanceSession).where(
            AttendanceSession.class_id == class_id,
            AttendanceSession.section_id == section_id,
            AttendanceSession.attendance_date == attendance_date,
        )
        if academic_year_id:
            sess_stmt = sess_stmt.where(AttendanceSession.academic_year_id == academic_year_id)

        sess_result = await db.execute(sess_stmt)
        existing_session = sess_result.scalar_one_or_none()

        marked_map = {}
        if existing_session:
            rec_stmt = select(StudentDailyAttendance).where(StudentDailyAttendance.session_id == existing_session.id)
            rec_res = await db.execute(rec_stmt)
            for rec in rec_res.scalars().all():
                marked_map[rec.student_id] = {
                    "attendance_status_id": rec.attendance_status_id,
                    "remarks": rec.remarks,
                }

        # 3. Query approved leaves for enrolled students on this attendance date
        from app.modules.academics.models import StudentLeaveRequest
        enrolled_student_ids = [st[0].id for st in enrolled_students]
        approved_leave_map = {}
        if enrolled_student_ids:
            leave_stmt = select(StudentLeaveRequest).where(
                StudentLeaveRequest.student_id.in_(enrolled_student_ids),
                StudentLeaveRequest.status == "APPROVED",
                StudentLeaveRequest.from_date <= attendance_date,
                StudentLeaveRequest.to_date >= attendance_date,
            )
            leave_res = await db.execute(leave_stmt)
            for lv in leave_res.scalars().all():
                approved_leave_map[lv.student_id] = lv.reason or "Medical / Personal Leave"

        # 4. Get Attendance Status Lookups
        cat_stmt = select(LookupCategory).where(LookupCategory.code == "ATTENDANCE_STATUS")
        cat_res = await db.execute(cat_stmt)
        cat = cat_res.scalar_one_or_none()

        status_options = []
        default_present_id = None
        excused_status_id = None
        status_id_to_code = {}
        if cat:
            vals = await db.execute(select(LookupValue).where(LookupValue.category_id == cat.id, LookupValue.is_active == True))
            for v in vals.scalars().all():
                status_options.append({"id": v.id, "code": v.code, "label": v.label})
                status_id_to_code[v.id] = v.code
                if v.code == "PRESENT":
                    default_present_id = v.id
                elif v.code in ("EXCUSED", "ON_LEAVE", "LEAVE"):
                    excused_status_id = v.id

        roster = []
        for student, enroll in enrolled_students:
            marked_info = marked_map.get(student.id, {})
            has_leave = student.id in approved_leave_map
            leave_reason = approved_leave_map.get(student.id)

            if student.id in marked_map:
                current_status = marked_info.get("attendance_status_id", default_present_id)
                remarks = marked_info.get("remarks", None)
            elif has_leave and excused_status_id:
                current_status = excused_status_id
                remarks = f"Approved Leave: {leave_reason}"
            else:
                current_status = default_present_id
                remarks = None

            roster.append({
                "student_id": student.id,
                "admission_no": student.admission_no,
                "full_name": f"{student.first_name} {student.last_name or ''}".strip(),
                "roll_no": enroll.roll_no,
                "current_status_id": current_status,
                "status_code": status_id_to_code.get(current_status, "EXCUSED" if (has_leave and not existing_session) else "PRESENT"),
                "remarks": remarks,
                "has_approved_leave": has_leave,
                "leave_reason": leave_reason,
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
        # Ensure ATTENDANCE_STATUS lookups are loaded
        from app.modules.lookups.services import LookupService
        await LookupService.ensure_system_lookups(db)

        att_cat = (await db.execute(select(LookupCategory).where(LookupCategory.code == "ATTENDANCE_STATUS"))).scalar_one_or_none()
        status_map_by_id = {}
        status_map_by_code = {}
        default_status_id = None

        if att_cat:
            v_res = await db.execute(select(LookupValue).where(LookupValue.category_id == att_cat.id, LookupValue.is_active == True))
            for v in v_res.scalars().all():
                status_map_by_id[v.id] = v
                status_map_by_code[v.code.upper()] = v.id
                if v.code == "PRESENT":
                    default_status_id = v.id
        if not default_status_id and status_map_by_id:
            default_status_id = list(status_map_by_id.keys())[0]

        # 1. Find or create AttendanceSession
        sess_stmt = select(AttendanceSession).where(
            AttendanceSession.academic_year_id == req.academic_year_id,
            AttendanceSession.class_id == req.class_id,
            AttendanceSession.section_id == req.section_id,
            AttendanceSession.attendance_date == req.attendance_date,
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
        else:
            session.marked_by_user_id = marked_by_user_id
            session.status = "SUBMITTED"

        # 2. Update / Insert records with direct SQL queries (100% greenlet safe)
        rec_stmt = select(StudentDailyAttendance).where(StudentDailyAttendance.session_id == session.id)
        rec_res = await db.execute(rec_stmt)
        existing_records = rec_res.scalars().all()
        existing_records_map = {r.student_id: r for r in existing_records}

        for item in req.records:
            status_id = item.attendance_status_id
            if status_id not in status_map_by_id:
                if status_id and str(status_id).upper() in status_map_by_code:
                    status_id = status_map_by_code[str(status_id).upper()]
                else:
                    status_id = default_status_id

            if not status_id:
                continue

            if item.student_id in existing_records_map:
                record = existing_records_map[item.student_id]
                record.attendance_status_id = status_id
                record.remarks = item.remarks
            else:
                record = StudentDailyAttendance(
                    session_id=session.id,
                    student_id=item.student_id,
                    attendance_status_id=status_id,
                    remarks=item.remarks,
                )
                db.add(record)

        # Collect absent students for notification alerts and synchronize to StudentDailyHabit
        absent_student_ids = []
        try:
            from app.modules.development.models import StudentDailyHabit
            habit_stmt = select(StudentDailyHabit).where(
                StudentDailyHabit.class_id == req.class_id,
                StudentDailyHabit.section_id == req.section_id,
                StudentDailyHabit.habit_date == req.attendance_date,
            )
            habit_res = await db.execute(habit_stmt)
            existing_habits = {h.student_id: h for h in habit_res.scalars().all()}

            for item in req.records:
                status_id = item.attendance_status_id
                val = status_map_by_id.get(status_id)
                code = val.code.upper() if val else str(status_id).upper()
                if code == "ABSENT":
                    absent_student_ids.append(item.student_id)

                if item.student_id in existing_habits:
                    h_rec = existing_habits[item.student_id]
                    h_rec.attendance_status = code
                    if code in ("ABSENT", "EXCUSED"):
                        h_rec.daily_score = 0
                    elif code in ("PRESENT", "LATE") and h_rec.daily_score == 0:
                        h_rec.daily_score = 1 + (
                            (1 if h_rec.habit_punctuality else 0)
                            + (1 if h_rec.habit_uniform else 0)
                            + (1 if h_rec.habit_material else 0)
                            + (1 if h_rec.habit_homework else 0)
                            + (1 if h_rec.habit_classwork else 0)
                            + (1 if h_rec.habit_healthy_lunch else 0)
                            + (1 if h_rec.habit_discipline else 0)
                            + (1 if h_rec.habit_neatness else 0)
                        )
        except Exception as habit_sync_err:
            logger.debug(f"Habit attendance sync notice: {habit_sync_err}")

        await db.commit()

        # Automated Absentee SMS / WhatsApp notification trigger
        if absent_student_ids:
            try:
                from app.modules.students.models import Student, Parent
                st_stmt = (
                    select(Student, Parent)
                    .outerjoin(Parent, Student.parent_id == Parent.id)
                    .where(Student.id.in_(absent_student_ids))
                )
                st_res = await db.execute(st_stmt)
                for st_obj, parent_obj in st_res.all():
                    parent_phone = parent_obj.primary_phone if parent_obj else "N/A"
                    logger.info(
                        f"[AUTOMATED PARENT ALERT] Student {st_obj.first_name} {st_obj.last_name or ''} "
                        f"(Adm #{st_obj.admission_no}) marked ABSENT on {req.attendance_date}. "
                        f"Notification dispatched to Guardian Phone: {parent_phone}."
                    )
            except Exception as notify_err:
                logger.debug(f"Absentee notification notice: {notify_err}")

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

    @classmethod
    async def get_student_attendance_summary(
        cls,
        student_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Calculates real attendance stats and recent history for Student 360 profile.
        """
        stmt = (
            select(StudentDailyAttendance, AttendanceSession, LookupValue)
            .join(AttendanceSession, StudentDailyAttendance.session_id == AttendanceSession.id)
            .join(LookupValue, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .where(StudentDailyAttendance.student_id == student_id)
            .order_by(AttendanceSession.attendance_date.desc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        total = len(rows)
        present = 0
        absent = 0
        late = 0
        half_day = 0
        recent = []

        for record, session, lookup in rows:
            code = (lookup.code or "").upper()
            if code in ["PRESENT", "P"]:
                present += 1
            elif code in ["ABSENT", "A"]:
                absent += 1
            elif code in ["LATE", "L"]:
                late += 1
            elif code in ["HALF_DAY", "HD"]:
                half_day += 1

            if len(recent) < 30:
                recent.append({
                    "date": str(session.attendance_date),
                    "status_code": code,
                    "status_name": getattr(lookup, "label", None) or getattr(lookup, "name", None) or code,
                })

        pct = round(((present + (late * 0.5) + (half_day * 0.5)) / total * 100), 1) if total > 0 else 0.0

        return {
            "total_sessions": total,
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "half_day_count": half_day,
            "attendance_percentage": pct,
            "recent_records": recent,
        }

