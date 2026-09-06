from datetime import date
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppException, ResourceNotFoundException, PermissionDeniedException
from app.modules.students.models import Parent, Student, StudentEnrollment
from app.modules.academics.models import ClassLevel, Section, AcademicYear
from app.modules.attendance.models import AttendanceSession, StudentDailyAttendance
from app.modules.lookups.models import LookupValue
from app.modules.fees.models import StudentFeeDemand, FeeCollection, FeeInstallmentSchedule, FeeHead
from app.modules.exams.models import ExamTerm
from app.modules.development.models import StudentDevelopmentRecord, DevelopmentCriteria


class ParentPortalService:
    @staticmethod
    async def _verify_parent_access(parent_user_id: str, student_id: str, db: AsyncSession) -> Student:
        """Security Guard: Ensures the authenticated parent is strictly the guardian of this student."""
        stmt = (
            select(Student)
            .join(Parent, Student.parent_id == Parent.id)
            .where(
                Parent.user_id == parent_user_id,
                Student.id == student_id,
            )
        )
        res = await db.execute(stmt)
        student = res.scalar_one_or_none()
        if not student:
            raise PermissionDeniedException("You do not have authorization to view this student's portal")
        return student

    @classmethod
    async def get_parent_children(cls, parent_user_id: str, db: AsyncSession) -> List[Dict[str, Any]]:
        """Multi-child switcher: Retrieves all children enrolled under this parent."""
        stmt = (
            select(Student, Parent, StudentEnrollment, ClassLevel, Section)
            .join(Parent, Student.parent_id == Parent.id)
            .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
            .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
            .join(Section, StudentEnrollment.section_id == Section.id)
            .where(
                Parent.user_id == parent_user_id,
                StudentEnrollment.is_active == True,
            )
        )
        res = await db.execute(stmt)
        rows = res.all()

        children = []
        for st, p, enroll, cls_lvl, sec in rows:
            children.append({
                "student_id": st.id,
                "admission_no": st.admission_no,
                "student_name": f"{st.first_name} {st.last_name or ''}".strip(),
                "profile_photo_url": st.profile_photo_url,
                "class_id": cls_lvl.id,
                "class_name": cls_lvl.name,
                "section_id": sec.id,
                "section_name": sec.name,
                "roll_no": enroll.roll_no,
                "academic_year_id": enroll.academic_year_id,
            })
        return children

    @classmethod
    async def get_child_overview(cls, parent_user_id: str, student_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Parent Dashboard summary widget for selected child."""
        student = await cls._verify_parent_access(parent_user_id, student_id, db)

        # 1. Today's attendance
        from app.shared.timezone_utils import get_school_today
        today = await get_school_today(db)
        att_stmt = (
            select(LookupValue.code, LookupValue.label)
            .join(StudentDailyAttendance, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .join(AttendanceSession, StudentDailyAttendance.session_id == AttendanceSession.id)
            .where(
                StudentDailyAttendance.student_id == student_id,
                AttendanceSession.attendance_date == today,
            )
        )
        att_res = await db.execute(att_stmt)
        att_row = att_res.first()
        today_attendance = att_row[1] if att_row else "Not Marked Yet"

        # Monthly attendance calculation
        month_att_stmt = (
            select(LookupValue.code, func.count(StudentDailyAttendance.id))
            .join(LookupValue, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .join(AttendanceSession, StudentDailyAttendance.session_id == AttendanceSession.id)
            .where(
                StudentDailyAttendance.student_id == student_id,
                func.month(AttendanceSession.attendance_date) == today.month,
                func.year(AttendanceSession.attendance_date) == today.year,
            )
            .group_by(LookupValue.code)
        )
        m_res = await db.execute(month_att_stmt)
        m_counts = dict(m_res.all())
        p_days = m_counts.get("PRESENT", 0)
        tot_days = sum(m_counts.values())
        att_pct = round((p_days / tot_days * 100), 1) if tot_days > 0 else None

        # 2. Fee Dues
        fee_stmt = (
            select(func.sum(StudentFeeDemand.balance_amount), func.count(StudentFeeDemand.id))
            .where(
                StudentFeeDemand.student_id == student_id,
                StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"]),
            )
        )
        fee_res = await db.execute(fee_stmt)
        total_due, due_count = fee_res.first()
        total_due_amt = float(total_due) if total_due else 0.0

        # 3. Behavioral Qualitative ratings
        qual_stmt = (
            select(StudentDevelopmentRecord, DevelopmentCriteria)
            .join(DevelopmentCriteria, StudentDevelopmentRecord.criteria_id == DevelopmentCriteria.id)
            .where(StudentDevelopmentRecord.student_id == student_id)
            .order_by(StudentDevelopmentRecord.created_at.desc())
            .limit(5)
        )
        qual_res = await db.execute(qual_stmt)
        qual_rows = qual_res.all()

        return {
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "admission_no": student.admission_no,
            "today_attendance": today_attendance,
            "pending_fee_amount": total_due_amt,
            "pending_invoices_count": due_count or 0,
            "fees": {
                "outstanding_balance": total_due_amt,
                "pending_invoices_count": due_count or 0,
            },
            "attendance": {
                "today": today_attendance,
                "present_days": p_days,
                "total_days": tot_days,
                "attendance_percentage": att_pct,
            },
            "recent_behavioral_ratings": [
                {
                    "criteria_name": crit.name,
                    "rating_value": rec.rating_value,
                    "remarks": rec.remarks,
                }
                for rec, crit in qual_rows
            ],
        }

    @classmethod
    async def get_child_attendance(cls, parent_user_id: str, student_id: str, month: int, year: int, db: AsyncSession) -> Dict[str, Any]:
        """Monthly attendance calendar view for parent."""
        await cls._verify_parent_access(parent_user_id, student_id, db)

        stmt = (
            select(AttendanceSession.attendance_date, LookupValue.code, LookupValue.label, StudentDailyAttendance.remarks)
            .join(StudentDailyAttendance, StudentDailyAttendance.session_id == AttendanceSession.id)
            .join(LookupValue, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .where(
                StudentDailyAttendance.student_id == student_id,
                func.month(AttendanceSession.attendance_date) == month,
                func.year(AttendanceSession.attendance_date) == year,
            )
            .order_by(AttendanceSession.attendance_date.asc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        return {
            "month": month,
            "year": year,
            "calendar_records": [
                {
                    "date": str(r[0]),
                    "status_code": r[1],
                    "status_label": r[2],
                    "remarks": r[3],
                }
                for r in rows
            ],
        }
