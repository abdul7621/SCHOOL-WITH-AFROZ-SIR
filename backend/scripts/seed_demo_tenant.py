import sys
import asyncio
from app.core.database import tenant_db_manager
from app.control_plane.demo_seeder import DemoSchoolSeeder
from app.core.logging import logger


async def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else "sample"
    logger.info(f"Initiating Demo Seeding for Tenant Slug: '{slug}'...")
    async with tenant_db_manager.get_session(slug) as session:
        result = await DemoSchoolSeeder.seed_full_demo_school(session)
        logger.info(f"SUCCESS: Demo School '{slug}' populated with live demo data!")
        print("RESULT:", result)


if __name__ == "__main__":
    asyncio.run(main())
