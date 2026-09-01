import asyncio
import pymysql
from sqlalchemy import select
from app.core.config import settings
from app.core.logging import logger
from app.core.security import get_password_hash
from app.core.database import control_async_engine, ControlAsyncSessionLocal
from app.shared.base_models import Base
from app.control_plane.models import PlatformUser, PlatformRole


def ensure_control_database_exists():
    """Connects via MySQL and creates saas_control_db if not present."""
    connection = pymysql.connect(
        host=settings.CONTROL_DB_HOST,
        port=settings.CONTROL_DB_PORT,
        user=settings.CONTROL_DB_USER,
        password=settings.CONTROL_DB_PASSWORD,
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{settings.CONTROL_DB_NAME}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            logger.info(f"Control Database '{settings.CONTROL_DB_NAME}' verified.")
    finally:
        connection.close()


async def init_control_plane():
    logger.info("Initializing SaaS Control Plane tables...")
    ensure_control_database_exists()

    async with control_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Control Plane tables created successfully.")

    # Seed initial Super Admin
    async with ControlAsyncSessionLocal() as session:
        stmt = select(PlatformUser).where(PlatformUser.email == settings.INITIAL_SUPER_ADMIN_EMAIL)
        result = await session.execute(stmt)
        admin = result.scalar_one_or_none()

        if not admin:
            admin = PlatformUser(
                email=settings.INITIAL_SUPER_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.INITIAL_SUPER_ADMIN_PASSWORD),
                full_name=settings.INITIAL_SUPER_ADMIN_NAME,
                role=PlatformRole.SUPER_ADMIN,
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Initial Super Admin created: {settings.INITIAL_SUPER_ADMIN_EMAIL}")
        else:
            logger.info(f"Super Admin '{settings.INITIAL_SUPER_ADMIN_EMAIL}' already exists.")


if __name__ == "__main__":
    asyncio.run(init_control_plane())
