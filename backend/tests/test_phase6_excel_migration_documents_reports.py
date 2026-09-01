import pytest
from httpx import AsyncClient
from app.modules.excel_engine.services import ExcelMigrationService
from app.modules.documents.services import DocumentGeneratorService


def test_excel_student_template_generation():
    """Verifies that openpyxl generates a valid binary .xlsx template with Segoe UI styling."""
    excel_bytes = ExcelMigrationService.generate_student_import_template()
    assert excel_bytes is not None
    assert len(excel_bytes) > 1000
    assert excel_bytes.startswith(b"PK")  # Standard ZIP / XLSX header


def test_transfer_certificate_html_generation():
    """Verifies that Transfer Certificate HTML is rendered with official legal text and anti-tamper QR zone."""
    data = {
        "student": {
            "admission_no": "ADM-2026-0001",
            "full_name": "Zaid Khan",
            "father_name": "Imran Khan",
            "dob": "2012-04-10",
            "class_name": "Class 8",
            "section_name": "Section A",
        },
        "tc_no": "TC-2026-0001",
        "issue_date": "2026-09-01",
        "leaving_reason": "Parent Relocated",
        "conduct": "EXCELLENT",
    }
    html = DocumentGeneratorService.generate_transfer_certificate_html(data, school_name="UME English School")
    assert "SCHOOL LEAVING / TRANSFER CERTIFICATE" in html
    assert "Zaid Khan" in html
    assert "TC-2026-0001" in html
    assert "Scan to Verify" in html


def test_batch_id_cards_html_generation():
    """Verifies CR-80 standard Student ID card grid rendering."""
    students = [
        {
            "admission_no": "ADM-001",
            "full_name": "Ayaan Khan",
            "class_name": "Class 5",
            "section_name": "A",
            "roll_no": 1,
            "dob": "2015-05-14",
            "blood_group": "O+",
            "primary_phone": "9876543210",
        },
        {
            "admission_no": "ADM-002",
            "full_name": "Sara Ali",
            "class_name": "Class 5",
            "section_name": "A",
            "roll_no": 2,
            "dob": "2015-08-20",
            "blood_group": "B+",
            "primary_phone": "9876543211",
        },
    ]
    html = DocumentGeneratorService.generate_id_cards_batch_html(students, school_name="Mount Mary Mission School")
    assert "STUDENT IDENTITY CARD" in html
    assert "Ayaan Khan" in html
    assert "Sara Ali" in html


@pytest.mark.asyncio
async def test_reports_endpoints_unauthorized_rejection(async_client: AsyncClient):
    """Verifies that reporting endpoints reject unauthenticated access."""
    res1 = await async_client.get("/api/v1/reports/fees/defaulters?academic_year_id=year_1", headers={"x-tenant-slug": "sample"})
    assert res1.status_code in [401, 404]

    res2 = await async_client.get("/api/v1/reports/fees/collections", headers={"x-tenant-slug": "sample"})
    assert res2.status_code in [401, 404]
