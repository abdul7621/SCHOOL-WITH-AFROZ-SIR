import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.core.security import create_access_token


@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def superadmin_token():
    return create_access_token(
        subject="superadmin_test_id",
        claims={"role": "SUPER_ADMIN", "context": "platform_control"},
    )


@pytest.fixture
def tenant_a_token():
    return create_access_token(
        subject="user_tenant_a",
        claims={
            "tenant_slug": "school_a",
            "user_type": "STAFF",
            "roles": ["ADMIN"],
            "permissions": ["fees:collect", "students:view", "settings:manage"],
        },
    )


@pytest.fixture
def tenant_b_token():
    return create_access_token(
        subject="user_tenant_b",
        claims={
            "tenant_slug": "school_b",
            "user_type": "STAFF",
            "roles": ["TEACHER"],
            "permissions": ["attendance:mark"],
        },
    )
