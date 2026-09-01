import asyncio
from collections import OrderedDict
from typing import AsyncGenerator, Dict, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from fastapi import Request
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import TenantNotFoundException

# ==========================================
# 1. SaaS Control Database Setup
# ==========================================
control_async_engine: AsyncEngine = create_async_engine(
    settings.CONTROL_DB_ASYNC_URI,
    echo=False,
    pool_size=5,
    max_overflow=5,
    pool_recycle=1800,
    pool_pre_ping=True,
)

ControlAsyncSessionLocal = async_sessionmaker(
    bind=control_async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_control_db() -> AsyncGenerator[AsyncSession, None]:
    async with ControlAsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ==========================================
# 2. Dynamic LRU Tenant Engine Pool Manager
# ==========================================
class TenantDatabaseManager:
    _instance = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TenantDatabaseManager, cls).__new__(cls)
            cls._instance._engines: OrderedDict[str, AsyncEngine] = OrderedDict()
            cls._instance._session_factories: Dict[str, async_sessionmaker[AsyncSession]] = {}
            cls._instance._max_cached_engines = 20  # Max active tenant engines in RAM
        return cls._instance

    def _build_tenant_uri(self, db_name: str, db_user: str, db_pass: str, db_host: str = "127.0.0.1", db_port: int = 3306) -> str:
        return f"mysql+asyncmy://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"

    async def get_tenant_session_factory(
        self,
        tenant_slug: str,
        db_name: str,
        db_user: str,
        db_pass: str,
        db_host: str = "127.0.0.1",
        db_port: int = 3306,
    ) -> async_sessionmaker[AsyncSession]:
        async with self._lock:
            # Check if engine exists in cache
            if tenant_slug in self._engines:
                self._engines.move_to_end(tenant_slug)  # Mark as recently used
                return self._session_factories[tenant_slug]

            # If cache exceeds max limit, evict oldest engine
            if len(self._engines) >= self._max_cached_engines:
                oldest_slug, oldest_engine = self._engines.popitem(last=False)
                if oldest_slug in self._session_factories:
                    del self._session_factories[oldest_slug]
                logger.info(f"LRU Eviction: Disposing database engine for tenant '{oldest_slug}'")
                await oldest_engine.dispose()

            # Create lean connection pool for the tenant
            tenant_uri = self._build_tenant_uri(db_name, db_user, db_pass, db_host, db_port)
            engine = create_async_engine(
                tenant_uri,
                echo=False,
                pool_size=2,
                max_overflow=3,
                pool_recycle=1800,
                pool_pre_ping=True,
                pool_timeout=20,
            )

            session_factory = async_sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )

            self._engines[tenant_slug] = engine
            self._session_factories[tenant_slug] = session_factory
            logger.info(f"Created dynamic DB engine for tenant '{tenant_slug}' (DB: {db_name})")
            return session_factory

    async def dispose_tenant_engine(self, tenant_slug: str):
        async with self._lock:
            if tenant_slug in self._engines:
                engine = self._engines.pop(tenant_slug)
                if tenant_slug in self._session_factories:
                    del self._session_factories[tenant_slug]
                await engine.dispose()
                logger.info(f"Disposed DB engine for tenant '{tenant_slug}'")

    async def dispose_all(self):
        async with self._lock:
            for slug, engine in list(self._engines.items()):
                await engine.dispose()
            self._engines.clear()
            self._session_factories.clear()
            logger.info("Disposed all tenant DB engines")


tenant_db_manager = TenantDatabaseManager()


# ==========================================
# 3. Dynamic Tenant Scoped Session Dependency
# ==========================================
async def get_tenant_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that retrieves the resolved tenant DB credentials
    from request.state and yields an active scoped AsyncSession.
    """
    tenant_info = getattr(request.state, "tenant_info", None)
    if not tenant_info:
        raise TenantNotFoundException(getattr(request.state, "tenant_slug", "unknown"))

    session_factory = await tenant_db_manager.get_tenant_session_factory(
        tenant_slug=tenant_info["slug"],
        db_name=tenant_info["db_name"],
        db_user=tenant_info["db_user"],
        db_pass=tenant_info["db_password"],
        db_host=tenant_info.get("db_host", "127.0.0.1"),
        db_port=tenant_info.get("db_port", 3306),
    )

    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
