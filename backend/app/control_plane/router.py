from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_control_db
from app.core.security import verify_password, create_access_token
from app.core.exceptions import InvalidCredentialsException, ResourceNotFoundException
from app.shared.responses import success_response
from app.control_plane.models import PlatformUser, Tenant, TenantDomain, PlatformRole
from app.control_plane.schemas import (
    PlatformLoginRequest,
    PlatformLoginResponse,
    TenantCreateRequest,
    TenantResponse,
    TenantStatusUpdateRequest,
    DomainAddRequest,
)
from app.control_plane.services import TenantProvisioningService

router = APIRouter(prefix="/control", tags=["SaaS Control Plane"])


@router.post("/auth/login", response_model=PlatformLoginResponse)
async def platform_login(req: PlatformLoginRequest, db: AsyncSession = Depends(get_control_db)):
    """Super Admin login against saas_control_db.platform_users"""
    stmt = select(PlatformUser).where(PlatformUser.email == req.email, PlatformUser.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise InvalidCredentialsException("Invalid platform email or password")

    access_token = create_access_token(
        subject=user.id,
        claims={"role": user.role, "email": user.email, "context": "platform_control"},
    )

    return PlatformLoginResponse(
        access_token=access_token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
    )


@router.get("/tenants")
async def list_tenants(db: AsyncSession = Depends(get_control_db)):
    """List all schools and their active domains"""
    stmt = select(Tenant).options(selectinload(Tenant.domains)).order_by(Tenant.created_at.desc())
    result = await db.execute(stmt)
    tenants = result.scalars().all()

    tenant_list = []
    for t in tenants:
        tenant_list.append({
            "id": t.id,
            "slug": t.slug,
            "school_name": t.school_name,
            "db_name": t.db_name,
            "status": t.status,
            "admin_email": t.admin_email,
            "admin_phone": t.admin_phone,
            "domains": [{"id": d.id, "domain": d.domain, "is_primary": d.is_primary} for d in t.domains],
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return success_response(data=tenant_list, message="Tenants retrieved successfully")


@router.post("/tenants", status_code=status.HTTP_201_CREATED)
async def create_and_provision_tenant(
    req: TenantCreateRequest,
    db: AsyncSession = Depends(get_control_db),
):
    """
    Super Admin Action: Creates and automatically provisions a new school tenant
    (Database creation, DDL execution, default master seeding, and storage init).
    """
    tenant = await TenantProvisioningService.provision_new_tenant(req, db)
    return success_response(
        data={
            "id": tenant.id,
            "slug": tenant.slug,
            "school_name": tenant.school_name,
            "db_name": tenant.db_name,
            "status": tenant.status,
            "primary_domain": req.primary_domain,
        },
        message=f"School '{tenant.school_name}' provisioned and activated successfully",
    )


@router.get("/tenants/{tenant_id}")
async def get_tenant_details(tenant_id: str, db: AsyncSession = Depends(get_control_db)):
    """Get single tenant details by ID"""
    stmt = select(Tenant).options(selectinload(Tenant.domains)).where(Tenant.id == tenant_id)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise ResourceNotFoundException("Tenant", tenant_id)

    return success_response(
        data={
            "id": tenant.id,
            "slug": tenant.slug,
            "school_name": tenant.school_name,
            "db_name": tenant.db_name,
            "status": tenant.status,
            "admin_email": tenant.admin_email,
            "admin_phone": tenant.admin_phone,
            "domains": [{"id": d.id, "domain": d.domain, "is_primary": d.is_primary} for d in tenant.domains],
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        }
    )


@router.patch("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: str,
    req: TenantStatusUpdateRequest,
    db: AsyncSession = Depends(get_control_db),
):
    """Activate, suspend, or put tenant in maintenance"""
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise ResourceNotFoundException("Tenant", tenant_id)

    tenant.status = req.status
    await db.commit()

    return success_response(
        data={"id": tenant.id, "slug": tenant.slug, "status": tenant.status},
        message=f"Tenant '{tenant.slug}' status updated to {req.status}",
    )
