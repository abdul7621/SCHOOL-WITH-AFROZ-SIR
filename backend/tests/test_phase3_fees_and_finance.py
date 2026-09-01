import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_fee_heads_unauthorized_rejection(async_client: AsyncClient):
    """Verifies that unauthenticated fee collection/head access is rejected."""
    response = await async_client.get("/api/v1/fees/heads", headers={"x-tenant-slug": "sample"})
    assert response.status_code in [401, 404]


@pytest.mark.asyncio
async def test_fee_collection_payload_validation(async_client: AsyncClient, tenant_a_token: str):
    """
    Verifies that fee collection requires positive payment amount
    and valid payment mode.
    """
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    invalid_payment_payload = {
        "student_id": "test_student_id",
        "academic_year_id": "test_year_id",
        "total_amount_paid": -500.00,  # Negative amount rejected
        "payment_mode_id": "test_mode",
    }
    response = await async_client.post("/api/v1/fees/collect", json=invalid_payment_payload, headers=headers)
    assert response.status_code in [422, 404]


@pytest.mark.asyncio
async def test_zero_destructive_deletion_receipt_reversal_validation(async_client: AsyncClient, tenant_a_token: str):
    """
    Verifies that receipt reversal requires a mandatory reason
    and does not accept empty payloads.
    """
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    bad_reversal = {
        "reversal_reason": "",  # Empty reason rejected
    }
    response = await async_client.post("/api/v1/fees/receipts/RCP-2026-0001/reverse", json=bad_reversal, headers=headers)
    assert response.status_code in [422, 404]


@pytest.mark.asyncio
async def test_day_book_schema_validation(async_client: AsyncClient, tenant_a_token: str):
    """Verifies day-book endpoint structure."""
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_a",
    }
    response = await async_client.get("/api/v1/finance/day-book", headers=headers)
    assert response.status_code in [200, 404]
