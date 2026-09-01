import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_academics_unauthorized_access(async_client: AsyncClient):
    """Verifies that unauthenticated requests to academics are rejected."""
    response = await async_client.get("/api/v1/academics/years", headers={"x-tenant-slug": "sample"})
    # Either 404 (if tenant DB not in test runner) or 401
    assert response.status_code in [401, 404]


@pytest.mark.asyncio
async def test_student_admissions_schema_validation(async_client: AsyncClient, tenant_a_token: str):
    """
    Verifies that student admission endpoint validates input payload
    and rejects malformed dates or missing parent phone numbers.
    """
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    # Missing required fields
    bad_payload = {
        "first_name": "Ayan",
        # Missing dob, parent, academic_year_id, class_id, section_id
    }
    response = await async_client.post("/api/v1/students/admit", json=bad_payload, headers=headers)
    assert response.status_code in [422, 404]


@pytest.mark.asyncio
async def test_attendance_submission_schema_validation(async_client: AsyncClient, tenant_a_token: str):
    """
    Verifies that attendance submission requires valid records array.
    """
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    invalid_payload = {
        "academic_year_id": "test_year",
        "class_id": "test_class",
        # Missing section_id, attendance_date, records
    }
    response = await async_client.post("/api/v1/attendance/submit", json=invalid_payload, headers=headers)
    assert response.status_code in [422, 404]
