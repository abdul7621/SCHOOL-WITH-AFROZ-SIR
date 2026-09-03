from datetime import date
from fastapi import APIRouter, Depends, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.middlewares.auth_middleware import RequirePermission
from app.modules.settings.models import SystemSetting
from app.modules.fees.models import FeeCollection, FeeCollectionItem
from app.modules.exams.services import ExamService
from app.modules.documents.services import DocumentGeneratorService

router = APIRouter(prefix="/documents", tags=["Document Generation & Report Cards"])


@router.get("/report-card/{term_id}/{student_id}/html", response_class=HTMLResponse)
async def view_report_card_html(
    term_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders styled print-ready HTML Report Card for preview and printing.
    """
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

    html = DocumentGeneratorService.generate_report_card_html(
        data=report_data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.get("/fee-receipt/{receipt_no}/html", response_class=HTMLResponse)
async def view_fee_receipt_html(
    receipt_no: str,
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
            selectinload(FeeCollection.items).selectinload(FeeCollectionItem.demand),
        )
        .where(FeeCollection.receipt_no == receipt_no)
    )
    res = await db.execute(stmt)
    receipt = res.scalar_one_or_none()

    if not receipt:
        raise ResourceNotFoundException("FeeReceipt", receipt_no)

    item_rows = ""
    for item in receipt.items:
        item_rows += f"""
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">Fee Installment Payment</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">₹{item.total_allocated_amount}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Fee Receipt - {receipt.receipt_no}</title>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1F2937; }}
            .receipt-box {{ max-width: 600px; margin: 0 auto; border: 2px solid #1E40AF; padding: 25px; border-radius: 8px; }}
            .header {{ text-align: center; border-bottom: 2px solid #1E40AF; padding-bottom: 10px; margin-bottom: 15px; }}
            .title {{ font-size: 22px; font-weight: 800; color: #1E40AF; }}
            .sub-title {{ font-size: 14px; font-weight: 600; color: #6B7280; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; font-size: 14px; background: #F9FAFB; padding: 12px; border-radius: 6px; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }}
            th {{ background: #1E40AF; color: #fff; padding: 8px 12px; }}
            .total-box {{ text-align: right; font-size: 18px; font-weight: 800; color: #1E40AF; padding: 10px 0; border-top: 2px solid #1E40AF; }}
            .status-badge {{ display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; background: {'#D1FAE5' if receipt.status == 'CONFIRMED' else '#FEE2E2'}; color: {'#065F46' if receipt.status == 'CONFIRMED' else '#991B1B'}; }}
        </style>
    </head>
    <body>
        <div class="receipt-box">
            <div class="header">
                <div class="title">OFFICIAL FEE RECEIPT</div>
                <div class="sub-title">Receipt No: <strong>{receipt.receipt_no}</strong></div>
            </div>

            <div class="info-grid">
                <div><strong>Student Name:</strong> {receipt.student.first_name} {receipt.student.last_name or ''}</div>
                <div><strong>Admission No:</strong> {receipt.student.admission_no}</div>
                <div><strong>Payment Date:</strong> {receipt.collection_date}</div>
                <div><strong>Payment Mode:</strong> {receipt.payment_mode.name if receipt.payment_mode else 'Cash'}</div>
                <div><strong>Status:</strong> <span class="status-badge">{receipt.status}</span></div>
                <div><strong>Cashier:</strong> {receipt.collected_by.username if receipt.collected_by else 'Admin'}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {item_rows}
                </tbody>
            </table>

            <div class="total-box">
                Total Paid: ₹{receipt.total_amount_paid}
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; color: #6B7280;">
                <div>* This is a computer-generated official receipt.</div>
                <div style="border-top: 1px solid #9CA3AF; width: 140px; text-align: center; padding-top: 4px;">Authorized Signature</div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.get("/transfer-certificate/{student_id}/html", response_class=HTMLResponse)
async def view_transfer_certificate_html(
    student_id: str,
    leaving_reason: str = "Parent Relocation / Transferred",
    conduct: str = "EXCELLENT",
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Renders official print-ready School Leaving / Transfer Certificate (TC).
    """
    from app.modules.students.models import Student, StudentEnrollment, Parent
    from app.modules.academics.models import ClassLevel, Section

    stmt = (
        select(Student, StudentEnrollment, ClassLevel, Section, Parent)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .join(Section, StudentEnrollment.section_id == Section.id)
        .join(Parent, Student.parent_id == Parent.id)
        .where(Student.id == student_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise ResourceNotFoundException("Student", student_id)

    st, enroll, cls_lvl, sec, parent = row

    settings_res = await db.execute(select(SystemSetting))
    settings_dict = {s.setting_key: (s.setting_value.strip('"') if isinstance(s.setting_value, str) else str(s.setting_value)) for s in settings_res.scalars().all()}
    school_name = settings_dict.get("school_name", "7A Model Academy")
    primary_color = settings_dict.get("theme_primary_color", "#1E40AF")

    data = {
        "student": {
            "admission_no": st.admission_no,
            "full_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "father_name": parent.father_name,
            "mother_name": parent.mother_name,
            "dob": str(st.dob),
            "class_name": cls_lvl.name,
            "section_name": sec.name,
        },
        "tc_no": f"TC-{date.today().year}-{st.admission_no[-4:] if len(st.admission_no) >= 4 else '0001'}",
        "issue_date": str(date.today()),
        "leaving_reason": leaving_reason,
        "conduct": conduct,
    }

    html = DocumentGeneratorService.generate_transfer_certificate_html(
        data=data,
        school_name=school_name,
        brand_color=primary_color,
    )
    return HTMLResponse(content=html)


@router.get("/id-cards/batch/html", response_class=HTMLResponse)
async def view_id_cards_batch_html(
    class_id: str = None,
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
        .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .join(Section, StudentEnrollment.section_id == Section.id)
        .join(Parent, Student.parent_id == Parent.id)
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
            "class_name": cls_lvl.name,
            "section_name": sec.name,
            "roll_no": enroll.roll_no,
            "dob": str(st.dob),
            "blood_group": getattr(st, "blood_group", "O+"),
            "primary_phone": parent.primary_phone,
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

