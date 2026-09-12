import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.lookups.models import LookupCategory, LookupValue, StudentStatus, PaymentMode
from app.modules.users_rbac.models import Role, Permission, RolePermission


class LookupService:
    @classmethod
    async def ensure_system_lookups(cls, db: AsyncSession) -> None:
        """
        Self-healing lookup and RBAC engine:
        Ensures essential categories (GENDER, BLOOD_GROUP, ATTENDANCE_STATUS),
        student statuses, payment modes, permissions, roles, and role_permissions
        exist in the tenant DB.
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

        # 6. Standard RBAC Permissions
        all_perms_def = [
            ("AUTH", "LOGIN", "auth:login"),
            ("USERS", "MANAGE", "users:manage"),
            ("ROLES", "MANAGE", "roles:manage"),
            ("SETTINGS", "MANAGE", "settings:manage"),
            ("ACADEMICS", "MANAGE", "academics:manage"),
            ("ACADEMICS", "VIEW", "academics:view"),
            ("STUDENTS", "VIEW", "students:view"),
            ("STUDENTS", "CREATE", "students:create"),
            ("STUDENTS", "EDIT", "students:edit"),
            ("ATTENDANCE", "MARK", "attendance:mark"),
            ("ATTENDANCE", "VIEW", "attendance:view"),
            ("FEES", "VIEW", "fees:view"),
            ("FEES", "COLLECT", "fees:collect"),
            ("FEES", "REVERSE", "fees:reverse"),
            ("FEES", "VIEW_REPORTS", "fees:view_reports"),
            ("FINANCE", "VIEW", "finance:view"),
            ("FINANCE", "VOUCHER_CREATE", "finance:voucher_create"),
            ("DEVELOPMENT", "EVALUATE", "development:evaluate"),
            ("DOCUMENTS", "GENERATE", "documents:generate"),
            ("EXCEL", "IMPORT_EXPORT", "excel:import_export"),
            ("STAFF", "VIEW", "staff:view"),
            ("STAFF", "MANAGE", "staff:manage"),
            ("REPORTS", "VIEW", "reports:view"),
            ("CMS", "MANAGE", "cms:manage"),
            ("NOTIFICATIONS", "SEND", "notifications:send"),
        ]

        perm_objects = {}
        for mod, act, code in all_perms_def:
            p = (await db.execute(select(Permission).where(Permission.code == code))).scalar_one_or_none()
            if not p:
                p = Permission(id=str(uuid.uuid4()), module=mod, action=act, code=code)
                db.add(p)
                await db.flush()
            perm_objects[code] = p

        # 7. Standard Roles
        roles_def = [
            ("ADMIN", "School Administrator"),
            ("PRINCIPAL", "Principal"),
            ("TEACHER", "Teacher"),
            ("ACCOUNTANT", "Fee Accountant"),
            ("PARENT", "Parent"),
            ("STUDENT", "Student"),
        ]

        role_objects = {}
        for code, name in roles_def:
            r = (await db.execute(select(Role).where(Role.code == code))).scalar_one_or_none()
            if not r:
                r = Role(code=code, name=name, is_system=True)
                db.add(r)
                await db.flush()
            role_objects[code] = r

        # 8. Role Permission Bindings
        teacher_perm_codes = [
            "attendance:view", "attendance:mark", "students:view", "academics:manage",
            "academics:view", "development:evaluate", "documents:generate", "reports:view",
            "notifications:send", "auth:login"
        ]
        accountant_perm_codes = [
            "fees:view", "fees:collect", "fees:reverse", "fees:view_reports",
            "finance:view", "finance:voucher_create", "students:view", "reports:view", "auth:login"
        ]
        parent_perm_codes = [
            "students:view", "attendance:view", "fees:view", "reports:view", "auth:login"
        ]

        # Fetch existing role permissions
        rp_res = await db.execute(select(RolePermission.role_id, RolePermission.permission_id))
        existing_rp_set = set(rp_res.all())

        for r_code, r_obj in role_objects.items():
            if r_code in ["ADMIN", "PRINCIPAL"]:
                target_perms = list(perm_objects.keys())
            elif r_code == "TEACHER":
                target_perms = teacher_perm_codes
            elif r_code == "ACCOUNTANT":
                target_perms = accountant_perm_codes
            elif r_code in ["PARENT", "STUDENT"]:
                target_perms = parent_perm_codes
            else:
                target_perms = ["auth:login"]

            for p_code in target_perms:
                p_obj = perm_objects.get(p_code)
                if p_obj and (r_obj.id, p_obj.id) not in existing_rp_set:
                    db.add(RolePermission(role_id=r_obj.id, permission_id=p_obj.id))
                    existing_rp_set.add((r_obj.id, p_obj.id))

        await db.commit()
