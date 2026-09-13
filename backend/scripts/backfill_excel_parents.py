import sys
import os
import uuid
import pymysql

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.logging import logger
from app.core.security import get_password_hash


def backfill_parents_for_db(db_name: str, host: str, port: int, user: str, password: str):
    logger.info(f"Checking for orphaned parents (user_id IS NULL) in `{db_name}`...")
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db_name,
            autocommit=True,
        )
        with conn.cursor() as cursor:
            # 1. Get PARENT role id
            cursor.execute("SELECT id FROM roles WHERE code = 'PARENT';")
            role_row = cursor.fetchone()
            if not role_row:
                # Ensure PARENT role exists
                parent_role_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO roles (id, name, code, is_system)
                    VALUES (%s, 'Parent / Guardian', 'PARENT', 1);
                """, (parent_role_id,))
            else:
                parent_role_id = role_row[0]

            # 2. Query parents with user_id IS NULL
            cursor.execute("SELECT id, primary_phone, email FROM parents WHERE user_id IS NULL;")
            orphaned = cursor.fetchall()
            logger.info(f"Found {len(orphaned)} orphaned parent record(s) in `{db_name}`.")

            default_hash = get_password_hash("Parent@123")
            fixed_count = 0

            for p_id, phone, email in orphaned:
                if not phone or not phone.strip():
                    continue
                phone = phone.strip()

                # Check if user with phone already exists
                cursor.execute("SELECT id FROM users WHERE phone = %s OR username = %s;", (phone, phone))
                existing_user = cursor.fetchone()

                if existing_user:
                    user_id = existing_user[0]
                else:
                    user_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO users (id, username, email, phone, password_hash, user_type, is_active)
                        VALUES (%s, %s, %s, %s, %s, 'PARENT', 1);
                    """, (user_id, phone, email if email else None, phone, default_hash))

                    # Map UserRole
                    cursor.execute("""
                        INSERT IGNORE INTO user_roles (user_id, role_id)
                        VALUES (%s, %s);
                    """, (user_id, parent_role_id))

                # Link parent to user
                cursor.execute("UPDATE parents SET user_id = %s WHERE id = %s;", (user_id, p_id))
                fixed_count += 1

            logger.info(f"✔ Successfully linked/created {fixed_count} parent user accounts in `{db_name}`.")
        conn.close()
        return True
    except Exception as e:
        logger.error(f"❌ Error during parent backfill on `{db_name}`: {e}")
        return False


def main():
    host = settings.TENANT_MYSQL_HOST
    port = settings.TENANT_MYSQL_PORT
    admin_user = settings.TENANT_MYSQL_ADMIN_USER
    admin_pass = settings.TENANT_MYSQL_ADMIN_PASSWORD

    from scripts.migrate_all_tenants import discover_tenants
    tenants = discover_tenants()
    logger.info(f"Running parent backfill across {len(tenants)} tenant database(s)...")

    for db_name in tenants:
        backfill_parents_for_db(db_name, host, port, admin_user, admin_pass)

    logger.info("✔ Parent backfill process complete.")


if __name__ == "__main__":
    main()
