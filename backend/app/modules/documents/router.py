from datetime import date
from decimal import Decimal
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Response, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException, AppException, PermissionDeniedException
from app.middlewares.auth_middleware import RequirePermission, get_current_user, get_current_user_or_token, CurrentTenantUser
from app.modules.settings.models import SystemSetting
from app.modules.fees.models import FeeCollection, FeeCollectionItem, StudentFeeDemand
from app.modules.lookups.models import StudentStatus
from app.modules.exams.services import ExamService
from app.modules.documents.services import DocumentGeneratorService

router = APIRouter(prefix="/documents", tags=["Document Generation & Report Cards"])


@router.get("/report-card/{term_id}/{student_id}/html", response_class=HTMLResponse)
async def view_report_card_html(
    term_id: str,
    student_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders styled print-ready HTML Report Card for preview and printing.
    """
    # Parent ownership authorization check
    if "PARENT" in (current_user.roles or []) or current_user.user_type == "PARENT":
        from app.modules.students.models import Student, Parent
        stu_res = await db.execute(select(Student.parent_id).where(Student.id == student_id))
        st_parent_id = stu_res.scalar_one_or_none()
        parent_stmt = select(Parent.id).where(Parent.user_id == current_user.id)
        parent_res = await db.execute(parent_stmt)
        auth_parent_id = parent_res.scalar_one_or_none()
        if not auth_parent_id or st_parent_id != auth_parent_id:
            raise PermissionDeniedException("You are not authorized to view the report card for this student.")

    # 1. Compile report data
    report_data = await ExamService.compile_student_term_report(
        exam_term_id=term_id,
        student_id=student_id,
        db=db,
    )

    # 2. Fetch tenant branding
    settings_res = await db.execute(select(SystemSetting))
    settings_records = settings_res.scalars().all()
    settings_dict = {s.setting_key: s.setting_value for s in settings_records}

    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#1E40AF")

    report_data["principal_signature_image"] = settings_dict.get("principal_signature_image")
    report_data["school_seal_image"] = settings_dict.get("school_seal_image")

    html = DocumentGeneratorService.generate_report_card_html(
        data=report_data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.get("/fee-receipt/{receipt_no}/html", response_class=HTMLResponse)
async def view_fee_receipt_html(
    receipt_no: str,
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders styled printable official Fee Receipt.
    """
    stmt = (
        select(FeeCollection)
        .options(
            selectinload(FeeCollection.student),
            selectinload(FeeCollection.payment_mode),
            selectinload(FeeCollection.collected_by),
            selectinload(FeeCollection.items).joinedload(FeeCollectionItem.demand),
        )
        .where(FeeCollection.receipt_no == receipt_no)
    )
    res = await db.execute(stmt)
    receipt = res.scalar_one_or_none()

    if not receipt:
        raise ResourceNotFoundException("FeeReceipt", receipt_no)

    if "PARENT" in (current_user.roles or []) or current_user.user_type == "PARENT":
        from app.modules.students.models import Parent
        parent_stmt = select(Parent.id).where(Parent.user_id == current_user.id)
        parent_res = await db.execute(parent_stmt)
        auth_parent_id = parent_res.scalar_one_or_none()
        if not auth_parent_id or not receipt.student or receipt.student.parent_id != auth_parent_id:
            raise PermissionDeniedException("You are not authorized to view this receipt.")

    from app.modules.fees.models import StudentAdvanceWalletTransaction

    item_rows = ""
    for item in receipt.items:
        head_name = "Fee Installment Payment"
        if item.demand and getattr(item.demand, "fee_head", None):
            head_name = item.demand.fee_head.name
        item_rows += f"""
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">{head_name}</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">₹{item.total_allocated_amount}</td>
        </tr>
        """

    # Include advance fee wallet deposit if this receipt credited the wallet
    adv_tx_res = await db.execute(
        select(StudentAdvanceWalletTransaction).where(
            StudentAdvanceWalletTransaction.fee_collection_id == receipt.id,
            StudentAdvanceWalletTransaction.transaction_type == "CREDIT_ADDED",
        )
    )
    advance_txs = adv_tx_res.scalars().all()
    for atx in advance_txs:
        item_rows += f"""
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #1E40AF; font-weight: 600;">Advance Fee Wallet Credit Deposit</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #1E40AF;">₹{atx.amount}</td>
        </tr>
        """

    if not item_rows:
        item_rows = f"""
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">School Fee Collection</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">₹{receipt.total_amount_paid}</td>
        </tr>
        """

    settings_res = await db.execute(select(SystemSetting))
    settings_records = settings_res.scalars().all()
    settings_dict = {
        s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value))
        for s in settings_records
    }
    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#1E40AF")

    html = DocumentGeneratorService.generate_fee_receipt_html(
        receipt=receipt,
        item_rows=item_rows,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.get("/fee-card/{student_id}/html", response_class=HTMLResponse)
async def view_fee_card_html(
    student_id: str,
    academic_year_id: Optional[str] = Query(None, description="Academic Session ID"),
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders styled print-ready 2-Sided Pocket Fee Card (Front & Back)
    matching physical school fee cards.
    """
    from app.modules.students.models import Student, Parent, StudentEnrollment
    from app.modules.academics.models import ClassLevel, Section, AcademicYear
    from app.modules.fees.models import (
        StudentFeeDemand,
        FeeInstallmentSchedule,
        FeeHead,
        FeeCollection,
        FeeCollectionItem,
    )

    # 1. Fetch student with parent
    stu_stmt = (
        select(Student)
        .options(selectinload(Student.parent))
        .where(Student.id == student_id)
    )
    stu_res = await db.execute(stu_stmt)
    student = stu_res.scalar_one_or_none()
    if not student:
        raise ResourceNotFoundException("Student", student_id)

    # Parent ownership authorization check
    if "PARENT" in (current_user.roles or []) or current_user.user_type == "PARENT":
        from app.modules.students.models import Parent
        parent_stmt = select(Parent.id).where(Parent.user_id == current_user.id)
        parent_res = await db.execute(parent_stmt)
        auth_parent_id = parent_res.scalar_one_or_none()
        if not auth_parent_id or student.parent_id != auth_parent_id:
            raise PermissionDeniedException("You are not authorized to view the fee card for this student.")

    # 2. Determine enrollment and academic year
    enr_stmt = (
        select(StudentEnrollment, ClassLevel, Section, AcademicYear)
        .outerjoin(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .outerjoin(Section, StudentEnrollment.section_id == Section.id)
        .outerjoin(AcademicYear, StudentEnrollment.academic_year_id == AcademicYear.id)
        .where(StudentEnrollment.student_id == student.id)
    )
    if academic_year_id:
        enr_stmt = enr_stmt.where(StudentEnrollment.academic_year_id == academic_year_id)
    else:
        enr_stmt = enr_stmt.order_by(StudentEnrollment.is_active.desc(), StudentEnrollment.enrollment_date.desc())

    enr_res = await db.execute(enr_stmt)
    enr_row = enr_res.first()

    enrollment = enr_row[0] if enr_row else None
    class_obj = enr_row[1] if enr_row else None
    section_obj = enr_row[2] if enr_row else None
    academic_year_obj = enr_row[3] if enr_row else None

    # Fallback to current year if enrollment wasn't active
    if not academic_year_obj:
        ay_res = await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))
        academic_year_obj = ay_res.scalars().first()
        if not academic_year_obj:
            ay_res = await db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc()))
            academic_year_obj = ay_res.scalars().first()

    target_year_id = academic_year_obj.id if academic_year_obj else None

    # 3. Fetch Demands for this student in this academic year
    demands = []
    if target_year_id:
        demands_stmt = (
            select(StudentFeeDemand, FeeInstallmentSchedule, FeeHead)
            .join(FeeInstallmentSchedule, StudentFeeDemand.installment_schedule_id == FeeInstallmentSchedule.id)
            .join(FeeHead, StudentFeeDemand.fee_head_id == FeeHead.id)
            .where(
                StudentFeeDemand.student_id == student.id,
                StudentFeeDemand.academic_year_id == target_year_id,
            )
            .order_by(FeeInstallmentSchedule.due_date.asc(), FeeHead.priority_order.asc())
        )
        demands_res = await db.execute(demands_stmt)
        demands = demands_res.all()

    # 4. Fetch Collections and Items for this student in this academic year
    receipts_by_demand_id = {}
    if target_year_id:
        coll_stmt = (
            select(FeeCollection)
            .options(
                selectinload(FeeCollection.items),
                selectinload(FeeCollection.payment_mode),
            )
            .where(
                FeeCollection.student_id == student.id,
                FeeCollection.academic_year_id == target_year_id,
                FeeCollection.status == "CONFIRMED",
            )
            .order_by(FeeCollection.collection_date.asc())
        )
        coll_res = await db.execute(coll_stmt)
        collections = coll_res.scalars().all()

        for c in collections:
            for item in c.items:
                dem_id = item.student_fee_demand_id
                if dem_id not in receipts_by_demand_id:
                    receipts_by_demand_id[dem_id] = []
                receipts_by_demand_id[dem_id].append({
                    "receipt_no": c.receipt_no,
                    "date": str(c.collection_date),
                })

    # Group demands by installment schedule
    schedule_map = {}
    for dem, sched, head in demands:
        s_id = sched.id
        if s_id not in schedule_map:
            schedule_map[s_id] = {
                "name": sched.name,
                "due_date": str(sched.due_date),
                "demand": 0.0,
                "concession": 0.0,
                "fine": 0.0,
                "net_payable": 0.0,
                "paid": 0.0,
                "balance": 0.0,
                "receipts": [],
            }
        base_amt = float(dem.base_amount or 0.0)
        conc_amt = float(dem.concession_amount or 0.0)
        fine_amt = float(dem.fine_amount or 0.0)
        net_amt = float(dem.net_demand_amount or 0.0)
        paid_amt = float(dem.paid_amount or 0.0)
        bal_amt = float(dem.balance_amount or 0.0)

        schedule_map[s_id]["demand"] += base_amt
        schedule_map[s_id]["concession"] += conc_amt
        schedule_map[s_id]["fine"] += fine_amt
        schedule_map[s_id]["net_payable"] += net_amt
        schedule_map[s_id]["paid"] += paid_amt
        schedule_map[s_id]["balance"] += bal_amt

        if dem.id in receipts_by_demand_id:
            schedule_map[s_id]["receipts"].extend(receipts_by_demand_id[dem.id])

    installments_list = []
    tot_gross = 0.0
    tot_conc = 0.0
    tot_paid = 0.0
    tot_bal = 0.0

    for s_id, s_data in schedule_map.items():
        receipt_text = ""
        paid_date = ""
        if s_data["receipts"]:
            unique_rcps = list({r["receipt_no"]: r["date"] for r in s_data["receipts"]}.items())
            receipt_text = ", ".join([r[0] for r in unique_rcps])
            paid_date = unique_rcps[-1][1]

        installments_list.append({
            "name": s_data["name"],
            "due_date": s_data["due_date"],
            "demand": s_data["demand"],
            "concession": s_data["concession"],
            "net_payable": s_data["net_payable"],
            "paid": s_data["paid"],
            "balance": s_data["balance"],
            "receipt_no": receipt_text,
            "paid_date": paid_date,
            "cashier_sign": "Verified" if s_data["paid"] > 0 else "",
        })
        tot_gross += s_data["demand"]
        tot_conc += s_data["concession"]
        tot_paid += s_data["paid"]
        tot_bal += s_data["balance"]

    # 5. Fetch tenant branding
    settings_res = await db.execute(select(SystemSetting))
    settings_records = settings_res.scalars().all()
    settings_dict = {
        s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value))
        for s in settings_records
    }

    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#1E40AF")
    currency = settings_dict.get("currency_symbol", "₹")

    parent_obj = getattr(student, "parent", None)
    father_name = getattr(parent_obj, "father_name", "") or ""
    mother_name = getattr(parent_obj, "mother_name", "") or ""
    parent_phone = getattr(parent_obj, "primary_phone", "") or ""
    parent_address = getattr(parent_obj, "address", "") or ""
    emergency_contact = getattr(student, "emergency_contact", None) or parent_phone or "-"

    card_data = {
        "student": {
            "id": student.id,
            "admission_no": student.admission_no,
            "roll_no": getattr(enrollment, "roll_no", None) if enrollment else "-",
            "full_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "class_name": class_obj.name if class_obj else "-",
            "section_name": section_obj.name if section_obj else "-",
            "father_name": father_name or "-",
            "mother_name": mother_name or "-",
            "aadhar_no": getattr(student, "aadhar_number", None) or getattr(student, "aadhar_no", None) or (student.custom_attributes.get("aadhar_no") if getattr(student, "custom_attributes", None) and isinstance(student.custom_attributes, dict) else None) or "-",
            "emergency_contact": emergency_contact or "-",
            "address": parent_address or "-",
        },
        "academic_year": {
            "id": academic_year_obj.id if academic_year_obj else None,
            "name": academic_year_obj.name if academic_year_obj else "2026-2027",
        },
        "installments": installments_list,
        "totals": {
            "gross_demand": tot_gross,
            "concession": tot_conc,
            "total_paid": tot_paid,
            "balance_due": tot_bal,
        },
        "school_info": {
            "address": settings_dict.get("school_address", "Main Campus, Education City"),
            "phone": settings_dict.get("school_phone", "+91 98765 43210"),
            "email": settings_dict.get("school_email", "contact@school.edu"),
            "currency_symbol": currency,
        },
    }

    html = DocumentGeneratorService.generate_fee_card_html(
        data=card_data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.get("/transfer-certificate/{student_id}/html", response_class=HTMLResponse)
async def view_transfer_certificate_html(
    student_id: str,
    leaving_reason: str = "Parent Relocation / Transferred",
    conduct: str = "EXCELLENT",
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders official print-ready School Leaving / Transfer Certificate (TC).
    Enforces strict No-Dues clearance check (FIX-08).
    """
    from app.modules.students.models import Student, StudentEnrollment, Parent
    from app.modules.academics.models import ClassLevel, Section

    stmt = (
        select(Student, StudentEnrollment, ClassLevel, Section, Parent)
        .outerjoin(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .outerjoin(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .outerjoin(Section, StudentEnrollment.section_id == Section.id)
        .outerjoin(Parent, Student.parent_id == Parent.id)
        .where(Student.id == student_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise ResourceNotFoundException("Student", student_id)

    st, enroll, cls_lvl, sec, parent = row

    if "PARENT" in (current_user.roles or []) or current_user.user_type == "PARENT":
        from app.modules.students.models import Parent
        parent_stmt = select(Parent.id).where(Parent.user_id == current_user.id)
        parent_res = await db.execute(parent_stmt)
        auth_parent_id = parent_res.scalar_one_or_none()
        if not auth_parent_id or st.parent_id != auth_parent_id:
            raise PermissionDeniedException("You are not authorized to view the Transfer Certificate for this student.")

    # 1. Strict No-Dues Clearance Enforcement (FIX-08)
    dues_stmt = select(func.sum(StudentFeeDemand.balance_amount)).where(
        StudentFeeDemand.student_id == student_id,
        StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"]),
    )
    dues_res = await db.execute(dues_stmt)
    total_dues = Decimal(str(dues_res.scalar() or "0.00"))

    is_privileged = any(r in ["ADMIN", "PRINCIPAL", "SUPERADMIN"] for r in (current_user.roles or []))
    if total_dues > Decimal("0.00") and not is_privileged:
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Transfer Certificate Blocked - No-Dues Clearance Required</title>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #F8FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
                .error-card {{ background: white; max-width: 520px; width: 90%; padding: 35px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border-top: 6px solid #DC2626; text-align: center; }}
                .icon {{ font-size: 44px; margin-bottom: 12px; }}
                h2 {{ color: #0F172A; margin: 0 0 10px; font-size: 20px; font-weight: 800; }}
                p {{ color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }}
                .due-box {{ background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 10px; padding: 14px; margin-bottom: 25px; color: #991B1B; font-weight: 800; font-size: 16px; }}
                .btn {{ display: inline-block; background: #1E40AF; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; }}
            </style>
        </head>
        <body>
            <div class="error-card">
                <div class="icon">⚠️</div>
                <h2>Transfer Certificate Blocked: No-Dues Clearance Required</h2>
                <p>Student <strong>{st.first_name} {st.last_name or ''}</strong> ({st.admission_no}) has pending fee arrears. School policy requires all outstanding dues to be cleared by cashier collection or officially authorized by the Principal before a Transfer Certificate can be released.</p>
                <div class="due-box">Outstanding Fee Balance: ₹{total_dues:.2f}</div>
                <a href="javascript:window.close()" class="btn">Close This Tab</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=status.HTTP_403_FORBIDDEN)

    if total_dues > Decimal("0.00"):
        dues_status = f"Pending Dues: ₹{total_dues:.2f} (Principal Review Required)"
    else:
        waiver_stmt = select(func.count(StudentFeeDemand.id)).where(
            StudentFeeDemand.student_id == student_id,
            StudentFeeDemand.status == "WAIVED",
        )
        waiver_count = (await db.execute(waiver_stmt)).scalar() or 0
        if waiver_count > 0:
            dues_status = "All Dues Cleared (Principal Waiver Authorized)"
        else:
            dues_status = "All Dues Cleared (No-Dues Verified)"

    settings_res = await db.execute(select(SystemSetting))
    settings_dict = {s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value)) for s in settings_res.scalars().all()}
    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#1E40AF")

    data = {
        "student": {
            "admission_no": st.admission_no,
            "full_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "father_name": getattr(parent, "father_name", "-") if parent else "-",
            "mother_name": getattr(parent, "mother_name", "-") if parent else "-",
            "dob": str(st.dob) if getattr(st, "dob", None) else "-",
            "class_name": getattr(cls_lvl, "name", "-") if cls_lvl else "-",
            "section_name": getattr(sec, "name", "-") if sec else "-",
        },
        "tc_no": f"TC-{date.today().year}-{st.admission_no[-4:] if len(st.admission_no) >= 4 else '0001'}",
        "issue_date": str(date.today()),
        "leaving_reason": leaving_reason,
        "conduct": conduct,
        "dues_status": dues_status,
        "school_seal_image": settings_dict.get("school_seal_image"),
        "principal_signature_image": settings_dict.get("principal_signature_image"),
    }

    html = DocumentGeneratorService.generate_transfer_certificate_html(
        data=data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.post("/transfer-certificate/{student_id}/issue")
async def issue_transfer_certificate(
    student_id: str,
    leaving_reason: str = Query("Parent Relocation / Transferred"),
    conduct: str = Query("EXCELLENT"),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Formally issues Transfer Certificate (FIX-08):
    1. Verifies No-Dues clearance (or checks Principal authorization).
    2. Transitions student status to TRANSFERRED.
    3. Deactivates active session enrollment (is_active=False).
    4. Records TC leaving audit metadata.
    """
    from app.modules.students.models import Student, StudentEnrollment

    st_res = await db.execute(select(Student).where(Student.id == student_id))
    st = st_res.scalar_one_or_none()
    if not st:
        raise ResourceNotFoundException("Student", student_id)

    # 1. Dues Check
    dues_stmt = select(func.sum(StudentFeeDemand.balance_amount)).where(
        StudentFeeDemand.student_id == student_id,
        StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"]),
    )
    dues_res = await db.execute(dues_stmt)
    total_dues = Decimal(str(dues_res.scalar() or "0.00"))

    is_privileged = any(r in ["ADMIN", "PRINCIPAL", "SUPERADMIN"] for r in (current_user.roles or []))
    if total_dues > Decimal("0.00") and not is_privileged:
        raise AppException(
            f"Cannot issue Transfer Certificate: Student has pending fee dues of ₹{total_dues:.2f}. "
            "Clear dues or obtain Principal Fee Waiver before issuance.",
            "PENDING_FEE_DUES",
        )

    # 2. Look up or create TRANSFERRED status
    status_res = await db.execute(select(StudentStatus).where(StudentStatus.code == "TRANSFERRED"))
    transferred_status = status_res.scalar_one_or_none()
    if not transferred_status:
        transferred_status = StudentStatus(
            code="TRANSFERRED",
            name="Transferred",
            allow_attendance=False,
            allow_fee_demand=False,
        )
        db.add(transferred_status)
        await db.flush()

    # 3. Update Student status
    st.status_id = transferred_status.id
    st_custom = dict(st.custom_attributes or {})
    tc_no = f"TC-{date.today().year}-{st.admission_no[-4:] if len(st.admission_no) >= 4 else '0001'}"
    st_custom["tc_issued"] = True
    st_custom["tc_no"] = tc_no
    st_custom["tc_issue_date"] = str(date.today())
    st_custom["leaving_reason"] = leaving_reason
    st_custom["conduct"] = conduct
    st_custom["tc_issued_by_user_id"] = current_user.id
    st.custom_attributes = st_custom

    # 4. Deactivate all active enrollments
    enr_stmt = select(StudentEnrollment).where(
        StudentEnrollment.student_id == student_id,
        StudentEnrollment.is_active == True,
    )
    enr_res = await db.execute(enr_stmt)
    active_enrollments = enr_res.scalars().all()
    for enr in active_enrollments:
        enr.is_active = False

    await db.commit()

    return {
        "success": True,
        "tc_no": tc_no,
        "student_id": st.id,
        "admission_no": st.admission_no,
        "status": "TRANSFERRED",
        "message": f"Transfer Certificate {tc_no} issued successfully. Student marked as TRANSFERRED.",
    }


@router.get("/id-cards/batch/html", response_class=HTMLResponse)
async def view_id_cards_batch_html(
    class_id: str = None,
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders batch of printable CR-80 standard Student ID Cards.
    """
    from app.modules.students.models import Student, StudentEnrollment, Parent
    from app.modules.academics.models import ClassLevel, Section

    stmt = (
        select(Student, StudentEnrollment, ClassLevel, Section, Parent)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .outerjoin(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .outerjoin(Section, StudentEnrollment.section_id == Section.id)
        .outerjoin(Parent, Student.parent_id == Parent.id)
        .where(StudentEnrollment.is_active == True)
    )
    if class_id:
        stmt = stmt.where(StudentEnrollment.class_id == class_id)

    res = await db.execute(stmt)
    rows = res.all()

    students_list = [
        {
            "admission_no": st.admission_no,
            "full_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "class_name": cls_lvl.name if cls_lvl else "-",
            "section_name": sec.name if sec else "-",
            "roll_no": getattr(enroll, "roll_no", None) or "-",
            "dob": str(st.dob) if getattr(st, "dob", None) else "-",
            "blood_group": getattr(st, "blood_group", "O+"),
            "primary_phone": getattr(parent, "primary_phone", "-") if parent else "-",
            "profile_photo_url": getattr(st, "profile_photo_url", None),
        }
        for st, enroll, cls_lvl, sec, parent in rows
    ]

    settings_res = await db.execute(select(SystemSetting))
    settings_dict = {s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value)) for s in settings_res.scalars().all()}
    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#1E40AF")

    html = DocumentGeneratorService.generate_id_cards_batch_html(
        students=students_list,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)



@router.get("/warning-letter/{incident_id}/html", response_class=HTMLResponse)
async def view_warning_letter_html(
    incident_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders formal Disciplinary Warning Notice & Parental Summons Letter.
    """
    from app.modules.development.models import DisciplineIncident
    from app.modules.students.models import Student, StudentEnrollment
    from app.modules.academics.models import ClassLevel, Section

    stmt = (
        select(DisciplineIncident, Student)
        .join(Student, DisciplineIncident.student_id == Student.id)
        .where(DisciplineIncident.id == incident_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise ResourceNotFoundException("DisciplineIncident", incident_id)

    incident, student = row

    enr_stmt = (
        select(StudentEnrollment, ClassLevel, Section)
        .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .join(Section, StudentEnrollment.section_id == Section.id)
        .where(StudentEnrollment.student_id == student.id, StudentEnrollment.is_active == True)
    )
    enr_res = await db.execute(enr_stmt)
    enr_row = enr_res.first()

    class_name = enr_row[1].name if enr_row else "Grade"
    section_name = enr_row[2].name if enr_row else "A"
    roll_no = enr_row[0].roll_no if enr_row else None

    incident_data = {
        "incident_id": incident.id,
        "ref_no": f"DISC-{incident.incident_date.year if incident.incident_date else date.today().year}-{incident.id[:6].upper()}",
        "incident_date": str(incident.incident_date),
        "category": incident.category,
        "severity_level": incident.severity_level,
        "action_taken": incident.action_taken,
        "description": incident.description,
        "student": {
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "admission_no": student.admission_no,
            "class_name": class_name,
            "section_name": section_name,
            "roll_no": roll_no,
        },
    }

    settings_res = await db.execute(select(SystemSetting))
    settings_dict = {s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value)) for s in settings_res.scalars().all()}
    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#DC2626")

    html = DocumentGeneratorService.generate_warning_letter_html(
        incident_data=incident_data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.get("/award-certificate/{award_id}/html", response_class=HTMLResponse)
async def view_award_certificate_html(
    award_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user_or_token),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders official Certificate of Merit / Honors for Student Achievement.
    """
    from app.modules.development.models import StudentAward
    from app.modules.students.models import Student, StudentEnrollment
    from app.modules.academics.models import ClassLevel, Section

    stmt = (
        select(StudentAward, Student)
        .join(Student, StudentAward.student_id == Student.id)
        .where(StudentAward.id == award_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise ResourceNotFoundException("StudentAward", award_id)

    award, student = row

    enr_stmt = (
        select(StudentEnrollment, ClassLevel, Section)
        .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .join(Section, StudentEnrollment.section_id == Section.id)
        .where(StudentEnrollment.student_id == student.id, StudentEnrollment.is_active == True)
    )
    enr_res = await db.execute(enr_stmt)
    enr_row = enr_res.first()

    class_name = enr_row[1].name if enr_row else "Grade"
    section_name = enr_row[2].name if enr_row else "A"

    award_data = {
        "award_id": award.id,
        "award_name": award.award_name,
        "award_category": award.award_category,
        "award_date": str(award.award_date),
        "description": award.description or "For distinguished excellence and character.",
        "student": {
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "admission_no": student.admission_no,
            "class_name": class_name,
            "section_name": section_name,
        },
    }

    settings_res = await db.execute(select(SystemSetting))
    settings_dict = {s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value)) for s in settings_res.scalars().all()}
    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#B45309")

    html = DocumentGeneratorService.generate_award_certificate_html(
        award_data=award_data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)

