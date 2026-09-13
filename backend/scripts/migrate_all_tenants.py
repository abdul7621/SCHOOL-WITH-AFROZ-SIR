import sys
import os
import pymysql

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.logging import logger

TENANT_SCHEMA_DDL = [
    # 1. Timetable periods table
    """
    CREATE TABLE IF NOT EXISTS timetable_periods (
        id VARCHAR(36) PRIMARY KEY,
        period_number INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_break BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    # 2. Timetable slots table
    """
    CREATE TABLE IF NOT EXISTS timetable_slots (
        id VARCHAR(36) PRIMARY KEY,
        academic_year_id VARCHAR(36) NOT NULL,
        class_id VARCHAR(36) NOT NULL,
        section_id VARCHAR(36) NOT NULL,
        day_of_week VARCHAR(15) NOT NULL,
        period_id VARCHAR(36) NOT NULL,
        subject_id VARCHAR(36) NOT NULL,
        teacher_user_id VARCHAR(36) NOT NULL,
        room_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (period_id) REFERENCES timetable_periods(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uk_class_sec_day_period (academic_year_id, class_id, section_id, day_of_week, period_id),
        INDEX idx_teacher_schedule (academic_year_id, teacher_user_id, day_of_week, period_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    # 3. Ensure students table profile_photo_url is LONGTEXT
    """
    ALTER TABLE students MODIFY COLUMN profile_photo_url LONGTEXT;
    """,
]

DEFAULT_FINANCE_CATEGORIES = [
    ("cat_tuition_fee", "Tuition Fee", "INCOME", "Academic tuition fee collections", True),
    ("cat_admission_fee", "Admission Fee", "INCOME", "New admission registration fee", True),
    ("cat_exam_fee", "Exam Fee", "INCOME", "Term and board examination fees", True),
    ("cat_salaries", "Staff Salaries", "EXPENSE", "Monthly teacher and staff payroll", True),
    ("cat_utilities", "Electricity & Water", "EXPENSE", "Campus utility bills", True),
    ("cat_maintenance", "Campus Maintenance", "EXPENSE", "Building repairs, sanitation, cleaning", True),
    ("cat_stationery", "Stationery & Printing", "EXPENSE", "Office supplies and exam paper printing", True),
    ("cat_misc", "Miscellaneous Expense", "EXPENSE", "General petty cash operational expenses", True),
]


def seed_finance_categories(cursor):
    try:
        cursor.execute("SELECT COUNT(*) FROM finance_categories;")
        count = cursor.fetchone()[0]
        if count == 0:
            logger.info("Seeding default finance categories...")
            insert_sql = """
            INSERT INTO finance_categories (id, name, type, description, is_system)
            VALUES (%s, %s, %s, %s, %s);
            """
            for cat in DEFAULT_FINANCE_CATEGORIES:
                cursor.execute(insert_sql, cat)
            logger.info(f"✔ Seeded {len(DEFAULT_FINANCE_CATEGORIES)} default finance categories.")
    except Exception as e:
        logger.warning(f"Note on finance categories seeding: {e}")


def migrate_single_tenant_db(db_name: str, host: str, port: int, user: str, password: str):
    logger.info(f"Checking & migrating tenant database: `{db_name}`...")
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
            for ddl in TENANT_SCHEMA_DDL:
                try:
                    cursor.execute(ddl)
                except Exception as ddl_err:
                    # Ignore harmless duplicate column / already applied DDL errors
                    if "Duplicate" not in str(ddl_err) and "already exists" not in str(ddl_err):
                        logger.warning(f"DDL notice on `{db_name}`: {ddl_err}")

            seed_finance_categories(cursor)

        conn.close()
        logger.info(f"✔ Tenant database `{db_name}` migration completed successfully.")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to migrate tenant DB `{db_name}`: {e}")
        return False


def discover_tenants():
    discovered = []
    host = settings.TENANT_MYSQL_HOST
    port = settings.TENANT_MYSQL_PORT
    admin_user = settings.TENANT_MYSQL_ADMIN_USER
    admin_pass = settings.TENANT_MYSQL_ADMIN_PASSWORD

    # 1. Try discovering from control_plane database
    try:
        conn = pymysql.connect(
            host=settings.CONTROL_DB_HOST,
            port=settings.CONTROL_DB_PORT,
            user=settings.CONTROL_DB_USER,
            password=settings.CONTROL_DB_PASSWORD,
            database=settings.CONTROL_DB_NAME,
            autocommit=True,
        )
        with conn.cursor() as cursor:
            cursor.execute("SELECT db_name FROM tenants WHERE status = 'ACTIVE';")
            rows = cursor.fetchall()
            for r in rows:
                if r[0] and r[0] not in discovered:
                    discovered.append(r[0])
        conn.close()
    except Exception as cp_err:
        logger.warning(f"Control database query skipped or failed ({cp_err}), scanning MySQL instances...")

    # 2. Also discover from MySQL databases list
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=admin_user,
            password=admin_pass,
            autocommit=True,
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES;")
            all_dbs = [row[0] for row in cursor.fetchall()]
            for db in all_dbs:
                if (db.startswith("7aschoolerp") or db.startswith("tenant_") or db == "7aschoolerpuat") and db not in discovered:
                    discovered.append(db)
        conn.close()
    except Exception as mysql_err:
        logger.error(f"Error querying MySQL databases: {mysql_err}")

    if not discovered:
        discovered = ["7aschoolerpuat"]

    return discovered


def main():
    logger.info("==========================================================================")
    logger.info("🚀 7A School ERP — Multi-Tenant Database Migration Orchestrator")
    logger.info("==========================================================================")

    host = settings.TENANT_MYSQL_HOST
    port = settings.TENANT_MYSQL_PORT
    admin_user = settings.TENANT_MYSQL_ADMIN_USER
    admin_pass = settings.TENANT_MYSQL_ADMIN_PASSWORD

    tenants = discover_tenants()
    logger.info(f"Discovered {len(tenants)} active tenant database(s): {tenants}")

    success_count = 0
    for tenant_db in tenants:
        if migrate_single_tenant_db(tenant_db, host, port, admin_user, admin_pass):
            success_count += 1

    logger.info(f"✔ Migration complete: {success_count}/{len(tenants)} tenant databases synchronized.")
    logger.info("==========================================================================")


if __name__ == "__main__":
    main()
