import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.lookups.models import LookupCategory, LookupValue, StudentStatus, PaymentMode


class LookupService:
    @classmethod
    async def ensure_system_lookups(cls, db: AsyncSession) -> None:
        """
        Self-healing lookup engine:
        Ensures essential categories (GENDER, BLOOD_GROUP, ATTENDANCE_STATUS),
        student statuses (ACTIVE, SUSPENDED, TRANSFERRED, ALUMNI), and
        payment modes (CASH, UPI_QR, BANK_TRANSFER, CHEQUE) exist in the tenant DB.
        """
        # 1. GENDER
        gen_cat = (await db.execute(select(LookupCategory).where(LookupCategory.code == "GENDER"))).scalar_one_or_none()
        if not gen_cat:
            gen_cat = LookupCategory(code="GENDER", name="Gender", is_system=True)
            db.add(gen_cat)
            await db.flush()
            for code, label, num in [("MALE", "Male", 1), ("FEMALE", "Female", 2), ("OTHER", "Other", 3)]:
                db.add(LookupValue(category_id=gen_cat.id, code=code, label=label, numeric_value=num, is_active=True))

        # 2. BLOOD_GROUP
        bg_cat = (await db.execute(select(LookupCategory).where(LookupCategory.code == "BLOOD_GROUP"))).scalar_one_or_none()
        if not bg_cat:
            bg_cat = LookupCategory(code="BLOOD_GROUP", name="Blood Group", is_system=True)
            db.add(bg_cat)
            await db.flush()
            for code, label, num in [
                ("A_POS", "A+", 1), ("A_NEG", "A-", 2), ("B_POS", "B+", 3), ("B_NEG", "B-", 4),
                ("O_POS", "O+", 5), ("O_NEG", "O-", 6), ("AB_POS", "AB+", 7), ("AB_NEG", "AB-", 8)
            ]:
                db.add(LookupValue(category_id=bg_cat.id, code=code, label=label, numeric_value=num, is_active=True))

        # 3. ATTENDANCE_STATUS
        att_cat = (await db.execute(select(LookupCategory).where(LookupCategory.code == "ATTENDANCE_STATUS"))).scalar_one_or_none()
        if not att_cat:
            att_cat = LookupCategory(code="ATTENDANCE_STATUS", name="Attendance Status", is_system=True)
            db.add(att_cat)
            await db.flush()
            for code, label, num in [
                ("PRESENT", "Present", 1), ("ABSENT", "Absent", 2), ("LATE", "Late", 3),
                ("HALF_DAY", "Half Day", 4), ("EXCUSED", "Excused Leave", 5)
            ]:
                db.add(LookupValue(category_id=att_cat.id, code=code, label=label, numeric_value=num, is_active=True))

        # 4. Student Statuses
        active_st = (await db.execute(select(StudentStatus).where(StudentStatus.code == "ACTIVE"))).scalar_one_or_none()
        if not active_st:
            statuses = [
                StudentStatus(code="ACTIVE", name="Active", allow_attendance=True, allow_fee_demand=True),
                StudentStatus(code="SUSPENDED", name="Suspended", allow_attendance=False, allow_fee_demand=False),
                StudentStatus(code="TRANSFERRED", name="Transferred / TC Issued", allow_attendance=False, allow_fee_demand=False),
                StudentStatus(code="ALUMNI", name="Alumni / Graduated", allow_attendance=False, allow_fee_demand=False),
                StudentStatus(code="PROVISIONAL", name="Provisional Admission", allow_attendance=True, allow_fee_demand=True),
            ]
            for s in statuses:
                db.add(s)

        # 5. Payment Modes
        cash_mode = (await db.execute(select(PaymentMode).where(PaymentMode.code == "CASH"))).scalar_one_or_none()
        if not cash_mode:
            modes = [
                PaymentMode(code="CASH", name="Cash", requires_reference_no=False, is_active=True),
                PaymentMode(code="UPI_QR", name="UPI / QR Code", requires_reference_no=True, is_active=True),
                PaymentMode(code="BANK_TRANSFER", name="Bank Transfer (NEFT/IMPS)", requires_reference_no=True, is_active=True),
                PaymentMode(code="CHEQUE", name="Cheque", requires_reference_no=True, is_active=True),
            ]
            for m in modes:
                db.add(m)

        await db.commit()
