from datetime import date
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.students.models import Student, StudentEnrollment, Parent
from app.modules.academics.models import ClassLevel, Section, AcademicYear
from app.modules.lookups.models import PaymentMode, LookupValue
from app.modules.fees.models import FeeCollection, FeeCollectionItem, StudentFeeDemand, FeeHead
from app.modules.finance.models import FinanceVoucher, FinanceCategory
from app.modules.attendance.models import AttendanceSession, StudentDailyAttendance


class ReportsService:
    @classmethod
    async def get_fee_collection_register(
        cls,
        from_date: date,
        to_date: date,
        payment_mode_id: Optional[str],
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Generates comprehensive fee collection ledger within a date range.
        """
        stmt = (
            select(FeeCollection)
            .options(
                selectinload(FeeCollection.student),
                selectinload(FeeCollection.payment_mode),
                selectinload(FeeCollection.collected_by),
            )
            .where(
                FeeCollection.collection_date >= from_date,
                FeeCollection.collection_date <= to_date,
                FeeCollection.status == "CONFIRMED",
            )
            .order_by(FeeCollection.collection_date.desc())
        )
        if payment_mode_id:
            stmt = stmt.where(FeeCollection.payment_mode_id == payment_mode_id)

        res = await db.execute(stmt)
        collections = res.scalars().all()

        total_amount = sum(c.total_amount_paid for c in collections)
        items = [
            {
                "receipt_no": c.receipt_no,
                "collection_date": str(c.collection_date),
                "student_name": f"{c.student.first_name} {c.student.last_name or ''}".strip(),
                "admission_no": c.student.admission_no,
                "payment_mode": c.payment_mode.name if c.payment_mode else "Cash",
                "reference_no": c.reference_no or "-",
                "amount": float(c.total_amount_paid),
                "cashier": c.collected_by.username if c.collected_by else "Admin",
            }
            for c in collections
        ]

        return {
            "from_date": str(from_date),
            "to_date": str(to_date),
            "total_collections_count": len(items),
            "total_amount_collected": float(total_amount),
            "records": items,
        }

    @classmethod
    async def get_fee_defaulters_list(
        cls,
        academic_year_id: str,
        class_id: Optional[str],
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Lists all students with pending/overdue fee demands.
        """
        if not academic_year_id or academic_year_id == "default_year":
            yr_res = await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))
            curr_yr = yr_res.scalar_one_or_none()
            if not curr_yr:
                yr_res2 = await db.execute(select(AcademicYear).limit(1))
                curr_yr = yr_res2.scalar_one_or_none()
            academic_year_id = curr_yr.id if curr_yr else "none"

        stmt = (
            select(
                Student,
                StudentEnrollment,
                ClassLevel,
                Section,
                Parent,
                func.sum(StudentFeeDemand.balance_amount).label("total_due"),
                func.count(StudentFeeDemand.id).label("unpaid_demands_count"),
            )
            .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
            .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
            .join(Section, StudentEnrollment.section_id == Section.id)
            .join(Parent, Student.parent_id == Parent.id)
            .join(StudentFeeDemand, Student.id == StudentFeeDemand.student_id)
            .where(
                StudentEnrollment.academic_year_id == academic_year_id,
                StudentEnrollment.is_active == True,
                StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"]),
            )
            .group_by(Student.id, StudentEnrollment.id, ClassLevel.id, Section.id, Parent.id)
            .order_by(func.sum(StudentFeeDemand.balance_amount).desc())
        )
        if class_id:
            stmt = stmt.where(StudentEnrollment.class_id == class_id)

        res = await db.execute(stmt)
        rows = res.all()

        total_outstanding = Decimal("0.00")
        defaulters = []

        for st, enroll, cls_lvl, sec, parent, total_due, due_count in rows:
            due_val = total_due or Decimal("0.00")
            total_outstanding += due_val
            defaulters.append({
                "student_id": st.id,
                "admission_no": st.admission_no,
                "student_name": f"{st.first_name} {st.last_name or ''}".strip(),
                "class_name": cls_lvl.name,
                "section_name": sec.name,
                "roll_no": enroll.roll_no,
                "father_name": parent.father_name,
                "primary_phone": parent.primary_phone,
                "total_outstanding_amount": float(due_val),
                "unpaid_invoices_count": due_count,
            })

        return {
            "total_defaulters_count": len(defaulters),
            "total_outstanding_amount": float(total_outstanding),
            "defaulters": defaulters,
        }

    @classmethod
    async def get_monthly_attendance_matrix(
        cls,
        academic_year_id: str,
        class_id: str,
        section_id: str,
        month: int,
        year: int,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Generates month-wide attendance register for an entire class.
        """
        if not academic_year_id or academic_year_id == "default_year":
            yr_res = await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))
            curr_yr = yr_res.scalar_one_or_none()
            if not curr_yr:
                yr_res2 = await db.execute(select(AcademicYear).limit(1))
                curr_yr = yr_res2.scalar_one_or_none()
            academic_year_id = curr_yr.id if curr_yr else "none"

        # 1. Enrolled students
        st_stmt = (
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
        st_res = await db.execute(st_stmt)
        students = st_res.all()

        # 2. Attendance records in month
        att_stmt = (
            select(StudentDailyAttendance.student_id, AttendanceSession.attendance_date, LookupValue.code)
            .join(AttendanceSession, StudentDailyAttendance.session_id == AttendanceSession.id)
            .join(LookupValue, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .where(
                AttendanceSession.academic_year_id == academic_year_id,
                AttendanceSession.class_id == class_id,
                AttendanceSession.section_id == section_id,
                func.month(AttendanceSession.attendance_date) == month,
                func.year(AttendanceSession.attendance_date) == year,
            )
        )
        att_res = await db.execute(att_stmt)
        att_rows = att_res.all()

        matrix_map = {}
        for st_id, att_date, code in att_rows:
            day_num = att_date.day
            if st_id not in matrix_map:
                matrix_map[st_id] = {}
            matrix_map[st_id][day_num] = code

        student_matrix = []
        for st, enroll in students:
            days_data = matrix_map.get(st.id, {})
            p_count = sum(1 for c in days_data.values() if c == "PRESENT")
            a_count = sum(1 for c in days_data.values() if c == "ABSENT")
            l_count = sum(1 for c in days_data.values() if c == "LATE")

            student_matrix.append({
                "student_id": st.id,
                "admission_no": st.admission_no,
                "student_name": f"{st.first_name} {st.last_name or ''}".strip(),
                "roll_no": enroll.roll_no,
                "daily_statuses": days_data,
                "summary": {
                    "present_days": p_count,
                    "absent_days": a_count,
                    "late_days": l_count,
                }
            })

        return {
            "month": month,
            "year": year,
            "students_count": len(students),
            "roster_matrix": student_matrix,
        }

    @classmethod
    async def get_monthly_income_expense_statement(
        cls,
        month: int,
        year: int,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Monthly income vs expense financial statement.
        """
        # 1. Total fee collections in month
        fee_stmt = select(func.sum(FeeCollection.total_amount_paid)).where(
            func.month(FeeCollection.collection_date) == month,
            func.year(FeeCollection.collection_date) == year,
            FeeCollection.status == "CONFIRMED",
        )
        fee_res = await db.execute(fee_stmt)
        fee_total = fee_res.scalar() or Decimal("0.00")

        # 2. Vouchers in month
        vch_stmt = (
            select(FinanceCategory.name, FinanceCategory.category_type, func.sum(FinanceVoucher.amount))
            .join(FinanceCategory, FinanceVoucher.category_id == FinanceCategory.id)
            .where(
                func.month(FinanceVoucher.transaction_date) == month,
                func.year(FinanceVoucher.transaction_date) == year,
                FinanceVoucher.status == "POSTED",
            )
            .group_by(FinanceCategory.name, FinanceCategory.category_type)
        )
        vch_res = await db.execute(vch_stmt)
        vch_rows = vch_res.all()

        other_incomes = []
        expenses = []
        total_other_inc = Decimal("0.00")
        total_exp = Decimal("0.00")

        for cat_name, cat_type, amt in vch_rows:
            amt_val = amt or Decimal("0.00")
            if cat_type == "INCOME":
                total_other_inc += amt_val
                other_incomes.append({"category": cat_name, "amount": float(amt_val)})
            else:
                total_exp += amt_val
                expenses.append({"category": cat_name, "amount": float(amt_val)})

        total_gross_income = fee_total + total_other_inc
        net_surplus = total_gross_income - total_exp

        return {
            "month": month,
            "year": year,
            "fee_income": float(fee_total),
            "other_incomes": other_incomes,
            "total_income": float(total_gross_income),
            "expenses": expenses,
            "total_expense": float(total_exp),
            "net_surplus_deficit": float(net_surplus),
        }

    @classmethod
    async def get_dashboard_summary(cls, db: AsyncSession) -> Dict[str, Any]:
        """
        Computes real-time live operational metrics for role-tailored dashboards.
        Timezone-aware and zero-data empty-state safe.
        """
        try:
            from zoneinfo import ZoneInfo
            from datetime import datetime
            tz = ZoneInfo("Asia/Kolkata")
            today = datetime.now(tz).date()
        except Exception:
            today = date.today()

        # 1. Total Active Students
        st_count_stmt = select(func.count(StudentEnrollment.id)).where(StudentEnrollment.is_active == True)
        total_students = (await db.execute(st_count_stmt)).scalar() or 0

        # 2. Today's Attendance
        att_marked_stmt = select(func.count(StudentDailyAttendance.id)).where(StudentDailyAttendance.attendance_date == today)
        total_marked = (await db.execute(att_marked_stmt)).scalar() or 0

        present_stmt = (
            select(func.count(StudentDailyAttendance.id))
            .join(LookupValue, StudentDailyAttendance.status_id == LookupValue.id)
            .where(StudentDailyAttendance.attendance_date == today, LookupValue.code == "PRESENT")
        )
        total_present = (await db.execute(present_stmt)).scalar() or 0
        total_absent = max(0, total_marked - total_present)
        attendance_rate = round((total_present / total_marked * 100), 1) if total_marked > 0 else 0.0

        # 3. Today's Fee Collections & Mode Breakdown
        today_fee_stmt = select(func.sum(FeeCollection.total_amount_paid)).where(
            FeeCollection.collection_date == today,
            FeeCollection.status == "CONFIRMED"
        )
        today_fee = (await db.execute(today_fee_stmt)).scalar() or Decimal("0.00")

        mode_stmt = (
            select(PaymentMode.name, func.sum(FeeCollection.total_amount_paid))
            .join(PaymentMode, FeeCollection.payment_mode_id == PaymentMode.id)
            .where(FeeCollection.collection_date == today, FeeCollection.status == "CONFIRMED")
            .group_by(PaymentMode.name)
        )
        mode_res = await db.execute(mode_stmt)
        mode_breakdown = {name: float(amount or 0) for name, amount in mode_res.all()}

        # 4. Total Outstanding Fee
        out_stmt = select(func.sum(StudentFeeDemand.balance_amount)).where(
            StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"])
        )
        total_outstanding = (await db.execute(out_stmt)).scalar() or Decimal("0.00")

        # 5. Total Staff
        from app.modules.staff.models import StaffProfile
        staff_stmt = select(func.count(StaffProfile.id)).where(StaffProfile.is_active == True)
        total_staff = (await db.execute(staff_stmt)).scalar() or 0

        # 6. Pending Inquiries
        from app.modules.cms.models import AdmissionInquiry
        inquiry_stmt = select(func.count(AdmissionInquiry.id)).where(AdmissionInquiry.status == "NEW")
        pending_inquiries = (await db.execute(inquiry_stmt)).scalar() or 0

        # 7. Recent Collections
        recent_collections_stmt = (
            select(FeeCollection)
            .options(selectinload(FeeCollection.student), selectinload(FeeCollection.payment_mode))
            .where(FeeCollection.status == "CONFIRMED")
            .order_by(FeeCollection.created_at.desc())
            .limit(5)
        )
        recent_res = await db.execute(recent_collections_stmt)
        recent_collections = [
            {
                "receipt_no": c.receipt_no,
                "student_name": f"{c.student.first_name} {c.student.last_name or ''}".strip() if c.student else "Student",
                "amount": float(c.total_amount_paid),
                "mode": c.payment_mode.name if c.payment_mode else "Cash",
                "time": str(c.collection_date),
            }
            for c in recent_res.scalars().all()
        ]

        return {
            "date": str(today),
            "total_students": total_students,
            "attendance": {
                "total_marked": total_marked,
                "present": total_present,
                "absent": total_absent,
                "rate_percentage": attendance_rate,
            },
            "finance": {
                "today_collections": float(today_fee),
                "mode_breakdown": mode_breakdown,
                "total_outstanding": float(total_outstanding),
            },
            "staff": {
                "total_active": total_staff,
            },
            "admissions": {
                "pending_inquiries": pending_inquiries,
            },
            "recent_collections": recent_collections,
        }
