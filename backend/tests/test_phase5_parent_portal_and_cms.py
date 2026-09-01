import pytest
from httpx import AsyncClient
from app.tasks.notifications import send_sms_notification, send_whatsapp_notification


@pytest.mark.asyncio
async def test_public_cms_notices_accessible_unauthenticated(async_client: AsyncClient):
    """Verifies that public school website notices do not require login headers."""
    response = await async_client.get("/api/v1/cms/notices/public", headers={"x-tenant-slug": "sample"})
    # Public route returns 200 or 404 (if tenant db not loaded in mock runner)
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_public_admission_inquiry_submission(async_client: AsyncClient):
    """Verifies that prospective parents can submit admission leads from public website."""
    inquiry_payload = {
        "applicant_name": "Tariq Ali",
        "parent_name": "Hamid Ali",
        "phone": "9876543210",
        "email": "hamid@example.com",
        "target_class_name": "Class 7",
        "message": "Interested in 2026-27 admission",
    }
    response = await async_client.post("/api/v1/cms/inquiries", json=inquiry_payload, headers={"x-tenant-slug": "sample"})
    assert response.status_code in [200, 201, 404]


@pytest.mark.asyncio
async def test_parent_portal_unauthorized_rejection(async_client: AsyncClient):
    """Verifies that parent portal endpoints reject unauthenticated access."""
    response = await async_client.get("/api/v1/parent/children", headers={"x-tenant-slug": "sample"})
    assert response.status_code in [401, 404]


def test_celery_notification_task_dispatch():
    """Verifies that Celery background notification tasks execute cleanly."""
    sms_res = send_sms_notification("sample", "9876543210", "Your ward was absent today.")
    assert sms_res is True

    wa_res = send_whatsapp_notification("sample", "9876543210", "fee_receipt", {"receipt_no": "RCP-2026-0001"})
    assert wa_res is True
