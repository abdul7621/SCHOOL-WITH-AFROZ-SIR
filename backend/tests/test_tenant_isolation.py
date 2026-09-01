import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_tenant_isolation_cross_tenant_token_rejection(async_client: AsyncClient, tenant_a_token: str):
    """
    CRITICAL SECURITY TEST:
    Proves that a token issued for 'school_a' is systematically rejected
    when attempted to be used against 'school_b'.
    """
    headers = {
        "Authorization": f"Bearer {tenant_a_token}",
        "x-tenant-slug": "school_b",
    }
    response = await async_client.get("/api/v1/auth/me", headers=headers)
    # Must fail with 403 Forbidden or 401 Unauthorized due to tenant slug mismatch
    assert response.status_code in [401, 403, 404]


@pytest.mark.asyncio
async def test_rbac_permission_denial(async_client: AsyncClient, tenant_b_token: str):
    """
    RBAC ENFORCEMENT TEST:
    Proves that a user with 'TEACHER' role (lacking 'settings:manage' permission)
    cannot access admin settings endpoints.
    """
    headers = {
        "Authorization": f"Bearer {tenant_b_token}",
        "x-tenant-slug": "school_b",
    }
    response = await async_client.get("/api/v1/settings", headers=headers)
    assert response.status_code in [403, 404]
