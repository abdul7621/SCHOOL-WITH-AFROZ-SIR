import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.shared.base_models import Base

# Import all models to ensure metadata registration
import app.control_plane.models
import app.modules.users_rbac.models
import app.modules.lookups.models
import app.modules.settings.models
import app.modules.development.models
import app.modules.audit.models

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url", settings.CONTROL_DB_SYNC_URI)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Check if a custom target database URI was passed via x-arguments
    # Example: alembic -x target_db=mysql+pymysql://user:pass@host/tenant_sample_db upgrade head
    cmd_x_args = context.get_x_argument(as_dictionary=True)
    custom_target_db = cmd_x_args.get("target_db")

    if custom_target_db:
        db_url = custom_target_db
    else:
        db_url = settings.CONTROL_DB_SYNC_URI

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = db_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
