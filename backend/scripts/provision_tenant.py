import sys
import asyncio
from app.core.database import ControlAsyncSessionLocal
from app.core.logging import logger
from app.control_plane.schemas import TenantCreateRequest
from app.control_plane.services import TenantProvisioningService


async def main():
    if len(sys.argv) < 6:
        print("Usage: python provision_tenant.py <slug> <school_name> <primary_domain> <admin_email> <admin_phone> [admin_password]")
        print("Example: python provision_tenant.py sample \"Sample Model School\" sample.7aedu.com admin@sample.7aedu.com 9876543210 SamplePass123!")
        sys.exit(1)

    slug = sys.argv[1]
    school_name = sys.argv[2]
    primary_domain = sys.argv[3]
    admin_email = sys.argv[4]
    admin_phone = sys.argv[5]
    admin_password = sys.argv[6] if len(sys.argv) > 6 else "AdminPassword123!"

    req = TenantCreateRequest(
        slug=slug,
        school_name=school_name,
        primary_domain=primary_domain,
        admin_email=admin_email,
        admin_phone=admin_phone,
        admin_password=admin_password,
    )

    logger.info(f"Initiating CLI Provisioning for School: '{school_name}' (Slug: {slug})...")
    async with ControlAsyncSessionLocal() as db:
        tenant = await TenantProvisioningService.provision_new_tenant(req, db)
        logger.info(f"SUCCESS: Tenant '{tenant.slug}' provisioned with DB '{tenant.db_name}' and status '{tenant.status}'")


if __name__ == "__main__":
    asyncio.run(main())
