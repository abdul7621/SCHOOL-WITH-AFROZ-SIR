import sys
import os
import pymysql

# Add parent directory to path so settings can be imported if needed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.logging import logger


DDL_STATEMENTS = [
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
    """
]


def migrate_tenant_db(db_name: str, user: str, password: str, host: str, port: int):
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
            for ddl in DDL_STATEMENTS:
                cursor.execute(ddl)
        conn.close()
        logger.info(f"✔ Timetable tables verified/created successfully in tenant DB: `{db_name}`")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to migrate tenant DB `{db_name}`: {e}")
        return False


def main():
    logger.info("Starting controlled schema migration for Timetable tables...")
    host = settings.TENANT_MYSQL_HOST
    port = settings.TENANT_MYSQL_PORT
    admin_user = settings.TENANT_MYSQL_ADMIN_USER
    admin_pass = settings.TENANT_MYSQL_ADMIN_PASSWORD

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
            databases = [row[0] for row in cursor.fetchall()]
        conn.close()

        target_dbs = [
            db for db in databases
            if db.startswith("7aschoolerp") or db.startswith("tenant_") or db in ["7aschoolerpuat"]
        ]

        if not target_dbs:
            target_dbs = ["7aschoolerpuat"]

        logger.info(f"Found {len(target_dbs)} tenant database(s) to migrate: {target_dbs}")
        for db_name in target_dbs:
            migrate_tenant_db(db_name, admin_user, admin_pass, host, port)

        logger.info("✔ Migration for all tenant databases completed successfully.")
    except Exception as e:
        logger.error(f"Migration script encountered an error: {e}")
        migrate_tenant_db("7aschoolerpuat", admin_user, admin_pass, host, port)


if __name__ == "__main__":
    main()
