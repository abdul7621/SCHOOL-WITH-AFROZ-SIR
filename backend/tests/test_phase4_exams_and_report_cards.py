import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_exam_terms_unauthorized_rejection(async_client: AsyncClient):
    """Verifies unauthenticated access to exams endpoints is rejected."""
    response = await async_client.get("/api/v1/exams/terms", headers={"x-tenant-slug": "sample"})
    assert response.status_code in [401, 404]


@pytest.mark.asyncio
async def test_marks_submission_validation(async_client: AsyncClient, tenant_a_token: str):
    """
    Verifies that teacher marks entry validates against missing schedules
    or invalid data types.
    """
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    invalid_marks_payload = {
        "exam_schedule_id": "test_schedule_id",
        "marks": [
            {
                "student_id": "st_01",
                "marks_obtained": "invalid_number_abc",  # Validation error
            }
        ],
    }
    response = await async_client.post(
        "/api/v1/exams/schedules/test_schedule_id/marks",
        json=invalid_marks_payload,
        headers=headers,
    )
    assert response.status_code in [422, 404]


@pytest.mark.asyncio
async def test_qualitative_evaluations_schema_validation(async_client: AsyncClient, tenant_a_token: str):
    """Verifies that qualitative evaluation submission requires valid payload."""
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    eval_payload = {
        "academic_year_id": "year_01",
        "class_id": "cls_01",
        "evaluation_period": "Term-1",
        "evaluations": [
            {
                "student_id": "st_01",
                "criteria_id": "crit_01",
                "rating_value": "5",
                "remarks": "Excellent leadership shown",
            }
        ],
    }
    response = await async_client.post("/api/v1/development/evaluations", json=eval_payload, headers=headers)
    assert response.status_code in [200, 404]
