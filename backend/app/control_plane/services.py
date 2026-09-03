import os
import uuid
import pymysql
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import logger
from app.core.security import get_password_hash
from app.core.exceptions import AppException
from app.control_plane.models import Tenant, TenantDomain, TenantStatus, TenantModuleToggle
from app.control_plane.schemas import TenantCreateRequest


class TenantProvisioningService:
    @staticmethod
    def _create_mysql_database(db_name: str, db_user: str, db_pass: str):
        """
        Connects via MySQL admin user and creates isolated database and user.
        """
        connection = pymysql.connect(
            host=settings.TENANT_MYSQL_HOST,
            port=settings.TENANT_MYSQL_PORT,
            user=settings.TENANT_MYSQL_ADMIN_USER,
            password=settings.TENANT_MYSQL_ADMIN_PASSWORD,
            autocommit=True,
        )
        try:
            with connection.cursor() as cursor:
                # 1. Create database
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                logger.info(f"MySQL DB created: {db_name}")

                # 2. Grant privileges to db_user
                if db_user != "root":
                    cursor.execute(f"CREATE USER IF NOT EXISTS '{db_user}'@'%' IDENTIFIED BY '{db_pass}';")
                    cursor.execute(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{db_user}'@'%';")
                    cursor.execute("FLUSH PRIVILEGES;")
                    logger.info(f"Granted privileges to MySQL user {db_user} on {db_name}")
        finally:
            connection.close()

    @staticmethod
    def _drop_mysql_database(db_name: str):
        """Rollback helper: Drops database on provisioning failure."""
        try:
            connection = pymysql.connect(
                host=settings.TENANT_MYSQL_HOST,
                port=settings.TENANT_MYSQL_PORT,
                user=settings.TENANT_MYSQL_ADMIN_USER,
                password=settings.TENANT_MYSQL_ADMIN_PASSWORD,
                autocommit=True,
            )
            with connection.cursor() as cursor:
                cursor.execute(f"DROP DATABASE IF EXISTS `{db_name}`;")
                logger.warning(f"Rollback: Dropped database {db_name}")
            connection.close()
        except Exception as e:
            logger.error(f"Failed to drop database {db_name} during rollback: {e}")

    @staticmethod
    def _initialize_tenant_schema(db_name: str, db_user: str, db_pass: str):
        """
        Executes standard DDL tables in the newly provisioned tenant database.
        """
        connection = pymysql.connect(
            host=settings.TENANT_MYSQL_HOST,
            port=settings.TENANT_MYSQL_PORT,
            user=db_user,
            password=db_pass,
            database=db_name,
            autocommit=True,
        )
        try:
            with connection.cursor() as cursor:
                # RBAC & Users
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(36) PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(20) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    user_type VARCHAR(50) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS roles (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    is_system BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS permissions (
                    id VARCHAR(36) PRIMARY KEY,
                    module VARCHAR(50) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    code VARCHAR(100) UNIQUE NOT NULL,
                    INDEX idx_perm_mod (module)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS role_permissions (
                    role_id VARCHAR(36) NOT NULL,
                    permission_id VARCHAR(36) NOT NULL,
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_roles (
                    user_id VARCHAR(36) NOT NULL,
                    role_id VARCHAR(36) NOT NULL,
                    PRIMARY KEY (user_id, role_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Lookups & Taxonomies
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS lookup_categories (
                    id VARCHAR(36) PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    is_system BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS lookup_values (
                    id VARCHAR(36) PRIMARY KEY,
                    category_id VARCHAR(36) NOT NULL,
                    code VARCHAR(50) NOT NULL,
                    label VARCHAR(100) NOT NULL,
                    numeric_value INT DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES lookup_categories(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_cat_val_code (category_id, code)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_statuses (
                    id VARCHAR(36) PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    allow_attendance BOOLEAN DEFAULT TRUE,
                    allow_fee_demand BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS payment_modes (
                    id VARCHAR(36) PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    requires_reference_no BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # System Settings
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    id VARCHAR(36) PRIMARY KEY,
                    setting_key VARCHAR(100) UNIQUE NOT NULL,
                    setting_value JSON NOT NULL,
                    is_public BOOLEAN DEFAULT FALSE,
                    description VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Qualitative Development Engine
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS development_criteria (
                    id VARCHAR(36) PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS development_scales (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    scale_type VARCHAR(50) NOT NULL,
                    options JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS development_rules (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    criteria_id VARCHAR(36) NOT NULL,
                    scale_id VARCHAR(36) NOT NULL,
                    weightage INT DEFAULT 1,
                    evaluation_frequency VARCHAR(50) DEFAULT 'MONTHLY',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (criteria_id) REFERENCES development_criteria(id),
                    FOREIGN KEY (scale_id) REFERENCES development_scales(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_development_records (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    academic_year_id VARCHAR(36) NOT NULL,
                    criteria_id VARCHAR(36) NOT NULL,
                    rating_value VARCHAR(50) NOT NULL,
                    remarks TEXT,
                    evaluated_by_staff_id VARCHAR(36) NOT NULL,
                    evaluation_period VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (criteria_id) REFERENCES development_criteria(id),
                    FOREIGN KEY (evaluated_by_staff_id) REFERENCES users(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Academic Hierarchy
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS academic_years (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(50) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    is_current BOOLEAN DEFAULT FALSE,
                    is_locked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_year_current (is_current)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS classes (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(50) NOT NULL,
                    numeric_order INT NOT NULL,
                    description VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_class_order (numeric_order)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS sections (
                    id VARCHAR(36) PRIMARY KEY,
                    class_id VARCHAR(36) NOT NULL,
                    name VARCHAR(20) NOT NULL,
                    capacity INT DEFAULT 45,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_class_section_name (class_id, name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS subjects (
                    id VARCHAR(36) PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    subject_type VARCHAR(50) DEFAULT 'THEORY',
                    is_elective BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS class_subjects (
                    id VARCHAR(36) PRIMARY KEY,
                    class_id VARCHAR(36) NOT NULL,
                    subject_id VARCHAR(36) NOT NULL,
                    is_mandatory BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_class_subject (class_id, subject_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS class_teachers (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    section_id VARCHAR(36) NOT NULL,
                    teacher_user_id VARCHAR(36) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
                    FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_year_class_section_teacher (academic_year_id, class_id, section_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Staff Directory
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS departments (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS designations (
                    id VARCHAR(36) PRIMARY KEY,
                    title VARCHAR(100) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS staff_profiles (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) UNIQUE NOT NULL,
                    employee_id VARCHAR(50) UNIQUE NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100),
                    designation_id VARCHAR(36) NOT NULL,
                    department_id VARCHAR(36),
                    qualification VARCHAR(150),
                    joining_date DATE NOT NULL,
                    emergency_contact VARCHAR(20),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (designation_id) REFERENCES designations(id),
                    FOREIGN KEY (department_id) REFERENCES departments(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Students & Parents
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS parents (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) UNIQUE,
                    father_name VARCHAR(150) NOT NULL,
                    mother_name VARCHAR(150),
                    primary_phone VARCHAR(20) NOT NULL,
                    whatsapp_phone VARCHAR(20),
                    email VARCHAR(255),
                    address TEXT,
                    father_occupation VARCHAR(100),
                    mother_occupation VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_parent_phone (primary_phone)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS students (
                    id VARCHAR(36) PRIMARY KEY,
                    admission_no VARCHAR(50) UNIQUE NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100),
                    dob DATE NOT NULL,
                    gender_id VARCHAR(36),
                    blood_group_id VARCHAR(36),
                    religion_id VARCHAR(36),
                    caste_category_id VARCHAR(36),
                    parent_id VARCHAR(36) NOT NULL,
                    status_id VARCHAR(36) NOT NULL,
                    profile_photo_url VARCHAR(255),
                    emergency_contact VARCHAR(20),
                    custom_attributes JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES parents(id),
                    FOREIGN KEY (gender_id) REFERENCES lookup_values(id),
                    FOREIGN KEY (status_id) REFERENCES student_statuses(id),
                    INDEX idx_student_name (first_name, last_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_enrollments (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    academic_year_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    section_id VARCHAR(36) NOT NULL,
                    roll_no INT,
                    enrollment_date DATE NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (class_id) REFERENCES classes(id),
                    FOREIGN KEY (section_id) REFERENCES sections(id),
                    UNIQUE KEY uk_student_year_enroll (student_id, academic_year_id),
                    INDEX idx_enroll_class_sec (academic_year_id, class_id, section_id, is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_documents (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    title VARCHAR(150) NOT NULL,
                    document_type VARCHAR(50) NOT NULL,
                    file_key VARCHAR(255) NOT NULL,
                    file_size_bytes INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Daily Attendance
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS attendance_sessions (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    section_id VARCHAR(36) NOT NULL,
                    attendance_date DATE NOT NULL,
                    marked_by_user_id VARCHAR(36) NOT NULL,
                    status VARCHAR(30) DEFAULT 'SUBMITTED',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (class_id) REFERENCES classes(id),
                    FOREIGN KEY (section_id) REFERENCES sections(id),
                    FOREIGN KEY (marked_by_user_id) REFERENCES users(id),
                    UNIQUE KEY uk_class_sec_date_att (class_id, section_id, attendance_date),
                    INDEX idx_att_date (attendance_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_daily_attendance (
                    id VARCHAR(36) PRIMARY KEY,
                    session_id VARCHAR(36) NOT NULL,
                    student_id VARCHAR(36) NOT NULL,
                    attendance_status_id VARCHAR(36) NOT NULL,
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (attendance_status_id) REFERENCES lookup_values(id),
                    UNIQUE KEY uk_session_student_att (session_id, student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Penny-Perfect Fee Engine
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_heads (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    is_recurring BOOLEAN DEFAULT TRUE,
                    priority_order INT DEFAULT 1,
                    description VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_fee_priority (priority_order)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_structures (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    total_annual_amount DECIMAL(10, 2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (class_id) REFERENCES classes(id),
                    UNIQUE KEY uk_year_class_fee_struct (academic_year_id, class_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_structure_items (
                    id VARCHAR(36) PRIMARY KEY,
                    fee_structure_id VARCHAR(36) NOT NULL,
                    fee_head_id VARCHAR(36) NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    frequency VARCHAR(50) DEFAULT 'MONTHLY',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE,
                    FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_installment_schedules (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    installment_month INT,
                    due_date DATE NOT NULL,
                    grace_period_days INT DEFAULT 5,
                    late_fine_rate_per_day DECIMAL(10, 2) DEFAULT 10.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_concession_types (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    discount_type VARCHAR(50) DEFAULT 'PERCENTAGE',
                    discount_value DECIMAL(10, 2) NOT NULL,
                    description VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_fee_concessions (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    academic_year_id VARCHAR(36) NOT NULL,
                    concession_type_id VARCHAR(36) NOT NULL,
                    fee_head_id VARCHAR(36),
                    approved_by_user_id VARCHAR(36) NOT NULL,
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (concession_type_id) REFERENCES fee_concession_types(id),
                    FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id),
                    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_fee_demands (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    academic_year_id VARCHAR(36) NOT NULL,
                    installment_schedule_id VARCHAR(36) NOT NULL,
                    fee_head_id VARCHAR(36) NOT NULL,
                    base_amount DECIMAL(10, 2) NOT NULL,
                    concession_amount DECIMAL(10, 2) DEFAULT 0.00,
                    fine_amount DECIMAL(10, 2) DEFAULT 0.00,
                    net_demand_amount DECIMAL(10, 2) NOT NULL,
                    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
                    balance_amount DECIMAL(10, 2) NOT NULL,
                    status VARCHAR(30) DEFAULT 'UNPAID',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (installment_schedule_id) REFERENCES fee_installment_schedules(id),
                    FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id),
                    UNIQUE KEY uk_st_sched_head (student_id, installment_schedule_id, fee_head_id),
                    INDEX idx_demand_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_collections (
                    id VARCHAR(36) PRIMARY KEY,
                    receipt_no VARCHAR(50) UNIQUE NOT NULL,
                    student_id VARCHAR(36) NOT NULL,
                    academic_year_id VARCHAR(36) NOT NULL,
                    collection_date DATE NOT NULL,
                    total_amount_paid DECIMAL(10, 2) NOT NULL,
                    payment_mode_id VARCHAR(36) NOT NULL,
                    transaction_reference_no VARCHAR(100),
                    collected_by_user_id VARCHAR(36) NOT NULL,
                    remarks TEXT,
                    status VARCHAR(30) DEFAULT 'CONFIRMED',
                    reversal_reason TEXT,
                    reversed_by_user_id VARCHAR(36),
                    reversed_at DATETIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(id),
                    FOREIGN KEY (collected_by_user_id) REFERENCES users(id),
                    INDEX idx_receipt_date (collection_date),
                    INDEX idx_receipt_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS fee_collection_items (
                    id VARCHAR(36) PRIMARY KEY,
                    fee_collection_id VARCHAR(36) NOT NULL,
                    student_fee_demand_id VARCHAR(36) NOT NULL,
                    allocated_base_amount DECIMAL(10, 2) DEFAULT 0.00,
                    allocated_fine_amount DECIMAL(10, 2) DEFAULT 0.00,
                    total_allocated_amount DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (fee_collection_id) REFERENCES fee_collections(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_fee_demand_id) REFERENCES student_fee_demands(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Finance & Hisaab-Kitab
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS finance_categories (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    category_type VARCHAR(20) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS finance_vouchers (
                    id VARCHAR(36) PRIMARY KEY,
                    voucher_no VARCHAR(50) UNIQUE NOT NULL,
                    voucher_type VARCHAR(20) NOT NULL,
                    transaction_date DATE NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    category_id VARCHAR(36) NOT NULL,
                    payment_mode_id VARCHAR(36) NOT NULL,
                    party_name VARCHAR(150),
                    reference_no VARCHAR(100),
                    description TEXT,
                    created_by_user_id VARCHAR(36) NOT NULL,
                    status VARCHAR(30) DEFAULT 'POSTED',
                    cancellation_reason TEXT,
                    cancelled_by_user_id VARCHAR(36),
                    cancelled_at DATETIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES finance_categories(id),
                    FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(id),
                    FOREIGN KEY (created_by_user_id) REFERENCES users(id),
                    INDEX idx_vch_date (transaction_date),
                    INDEX idx_vch_type_status (voucher_type, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Examinations & Grading Engine
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS exam_terms (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    weightage_percent DECIMAL(5, 2) DEFAULT 100.00,
                    is_published BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS grading_scales (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS grading_scale_tiers (
                    id VARCHAR(36) PRIMARY KEY,
                    grading_scale_id VARCHAR(36) NOT NULL,
                    min_score_percent DECIMAL(5, 2) NOT NULL,
                    max_score_percent DECIMAL(5, 2) NOT NULL,
                    grade_letter VARCHAR(10) NOT NULL,
                    grade_point DECIMAL(4, 2) DEFAULT 0.00,
                    remarks VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS exam_schedules (
                    id VARCHAR(36) PRIMARY KEY,
                    exam_term_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    subject_id VARCHAR(36) NOT NULL,
                    exam_date DATE NOT NULL,
                    start_time TIME,
                    end_time TIME,
                    max_marks DECIMAL(5, 2) DEFAULT 100.00,
                    pass_marks DECIMAL(5, 2) DEFAULT 33.00,
                    grading_scale_id VARCHAR(36),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (exam_term_id) REFERENCES exam_terms(id) ON DELETE CASCADE,
                    FOREIGN KEY (class_id) REFERENCES classes(id),
                    FOREIGN KEY (subject_id) REFERENCES subjects(id),
                    FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id),
                    UNIQUE KEY uk_term_cls_sub (exam_term_id, class_id, subject_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_exam_marks (
                    id VARCHAR(36) PRIMARY KEY,
                    exam_schedule_id VARCHAR(36) NOT NULL,
                    student_id VARCHAR(36) NOT NULL,
                    marks_obtained DECIMAL(5, 2),
                    is_absent BOOLEAN DEFAULT FALSE,
                    remarks VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_sched_student (exam_schedule_id, student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Public CMS & Communication
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS notices (
                    id VARCHAR(36) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(50) DEFAULT 'GENERAL',
                    published_date DATE NOT NULL,
                    is_pinned BOOLEAN DEFAULT FALSE,
                    is_public BOOLEAN DEFAULT TRUE,
                    attachment_url VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_notice_pub (is_public, published_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS admission_inquiries (
                    id VARCHAR(36) PRIMARY KEY,
                    applicant_name VARCHAR(100) NOT NULL,
                    parent_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    email VARCHAR(255),
                    target_class_name VARCHAR(50) NOT NULL,
                    message TEXT,
                    status VARCHAR(30) DEFAULT 'NEW',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_inq_phone (phone),
                    INDEX idx_inq_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS gallery_media (
                    id VARCHAR(36) PRIMARY KEY,
                    title VARCHAR(150) NOT NULL,
                    album_name VARCHAR(100) DEFAULT 'General',
                    media_url VARCHAR(255) NOT NULL,
                    media_type VARCHAR(20) DEFAULT 'IMAGE',
                    is_published BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Notification Logs
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS notification_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    channel VARCHAR(30) NOT NULL,
                    recipient VARCHAR(100) NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    template_name VARCHAR(100),
                    message_body TEXT NOT NULL,
                    status VARCHAR(30) DEFAULT 'SENT',
                    provider_response_id VARCHAR(255),
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_notif_recipient (recipient),
                    INDEX idx_notif_channel (channel)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Discipline Incidents
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS discipline_incidents (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    incident_date DATE NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    severity_level VARCHAR(30) DEFAULT 'LOW',
                    action_taken VARCHAR(255) NOT NULL,
                    description TEXT,
                    parent_notified BOOLEAN DEFAULT FALSE,
                    reported_by_user_id VARCHAR(36) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (reported_by_user_id) REFERENCES users(id),
                    INDEX idx_disc_student (student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Student Awards
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_awards (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    academic_year_id VARCHAR(36) NOT NULL,
                    award_name VARCHAR(150) NOT NULL,
                    award_category VARCHAR(100) DEFAULT 'ACADEMIC',
                    award_date DATE NOT NULL,
                    description TEXT,
                    certificate_issued BOOLEAN DEFAULT TRUE,
                    awarded_by_user_id VARCHAR(36) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (awarded_by_user_id) REFERENCES users(id),
                    INDEX idx_award_student (student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Class Homework & Assignments
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS class_homework (
                    id VARCHAR(36) PRIMARY KEY,
                    academic_year_id VARCHAR(36) NOT NULL,
                    class_id VARCHAR(36) NOT NULL,
                    section_id VARCHAR(36) NOT NULL,
                    subject_id VARCHAR(36) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    assigned_date DATE NOT NULL,
                    due_date DATE NOT NULL,
                    attachment_url VARCHAR(255),
                    assigned_by_teacher_id VARCHAR(36) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
                    FOREIGN KEY (class_id) REFERENCES classes(id),
                    FOREIGN KEY (section_id) REFERENCES sections(id),
                    FOREIGN KEY (subject_id) REFERENCES subjects(id),
                    FOREIGN KEY (assigned_by_teacher_id) REFERENCES users(id),
                    INDEX idx_hw_class_sec (class_id, section_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Student Leave Requests
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_leave_requests (
                    id VARCHAR(36) PRIMARY KEY,
                    student_id VARCHAR(36) NOT NULL,
                    from_date DATE NOT NULL,
                    to_date DATE NOT NULL,
                    reason VARCHAR(500) NOT NULL,
                    status VARCHAR(30) DEFAULT 'PENDING',
                    approved_by_user_id VARCHAR(36),
                    approval_remarks VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    FOREIGN KEY (approved_by_user_id) REFERENCES users(id),
                    INDEX idx_leave_student (student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                # Audit Logs
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36),
                    user_role VARCHAR(50),
                    action VARCHAR(50) NOT NULL,
                    entity_name VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(50),
                    old_values JSON,
                    new_values JSON,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_audit_entity (entity_name, entity_id),
                    INDEX idx_audit_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

                logger.info(f"Initialized all base tables in tenant database '{db_name}'")
        finally:
            connection.close()

    @staticmethod
    def _seed_tenant_master_data(db_name: str, db_user: str, db_pass: str, school_name: str, admin_email: str, admin_phone: str, admin_password: str):
        """
        Seeds initial roles, permissions, lookups, settings, and school admin user.
        """
        connection = pymysql.connect(
            host=settings.TENANT_MYSQL_HOST,
            port=settings.TENANT_MYSQL_PORT,
            user=db_user,
            password=db_pass,
            database=db_name,
            autocommit=True,
        )
        try:
            with connection.cursor() as cursor:
                # 1. Seed Roles
                admin_role_id = str(uuid.uuid4())
                roles = [
                    (admin_role_id, "School Administrator", "ADMIN", True),
                    (str(uuid.uuid4()), "Principal", "PRINCIPAL", True),
                    (str(uuid.uuid4()), "Teacher", "TEACHER", True),
                    (str(uuid.uuid4()), "Fee Accountant", "ACCOUNTANT", True),
                    (str(uuid.uuid4()), "Parent", "PARENT", True),
                ]
                cursor.executemany("INSERT INTO roles (id, name, code, is_system) VALUES (%s, %s, %s, %s);", roles)

                # 2. Seed Standard Permissions
                permissions = [
                    (str(uuid.uuid4()), "AUTH", "LOGIN", "auth:login"),
                    (str(uuid.uuid4()), "USERS", "MANAGE", "users:manage"),
                    (str(uuid.uuid4()), "ROLES", "MANAGE", "roles:manage"),
                    (str(uuid.uuid4()), "SETTINGS", "MANAGE", "settings:manage"),
                    (str(uuid.uuid4()), "ACADEMICS", "MANAGE", "academics:manage"),
                    (str(uuid.uuid4()), "STUDENTS", "VIEW", "students:view"),
                    (str(uuid.uuid4()), "STUDENTS", "CREATE", "students:create"),
                    (str(uuid.uuid4()), "STUDENTS", "EDIT", "students:edit"),
                    (str(uuid.uuid4()), "ATTENDANCE", "MARK", "attendance:mark"),
                    (str(uuid.uuid4()), "ATTENDANCE", "VIEW", "attendance:view"),
                    (str(uuid.uuid4()), "FEES", "VIEW", "fees:view"),
                    (str(uuid.uuid4()), "FEES", "COLLECT", "fees:collect"),
                    (str(uuid.uuid4()), "FEES", "REVERSE", "fees:reverse"),
                    (str(uuid.uuid4()), "FEES", "VIEW_REPORTS", "fees:view_reports"),
                    (str(uuid.uuid4()), "FINANCE", "VIEW", "finance:view"),
                    (str(uuid.uuid4()), "FINANCE", "VOUCHER_CREATE", "finance:voucher_create"),
                    (str(uuid.uuid4()), "DEVELOPMENT", "EVALUATE", "development:evaluate"),
                    (str(uuid.uuid4()), "DOCUMENTS", "GENERATE", "documents:generate"),
                    (str(uuid.uuid4()), "EXCEL", "IMPORT_EXPORT", "excel:import_export"),
                ]
                cursor.executemany("INSERT INTO permissions (id, module, action, code) VALUES (%s, %s, %s, %s);", permissions)

                # 3. Grant all permissions to ADMIN role
                cursor.execute("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT %s, id FROM permissions;
                """, (admin_role_id,))

                # 4. Seed Dynamic Lookups
                # Gender
                gender_cat_id = str(uuid.uuid4())
                cursor.execute("INSERT INTO lookup_categories (id, code, name, is_system) VALUES (%s, 'GENDER', 'Gender', TRUE);", (gender_cat_id,))
                genders = [
                    (str(uuid.uuid4()), gender_cat_id, "MALE", "Male", 1),
                    (str(uuid.uuid4()), gender_cat_id, "FEMALE", "Female", 2),
                    (str(uuid.uuid4()), gender_cat_id, "OTHER", "Other", 3),
                ]
                cursor.executemany("INSERT INTO lookup_values (id, category_id, code, label, numeric_value) VALUES (%s, %s, %s, %s, %s);", genders)

                # Blood Group
                bg_cat_id = str(uuid.uuid4())
                cursor.execute("INSERT INTO lookup_categories (id, code, name, is_system) VALUES (%s, 'BLOOD_GROUP', 'Blood Group', TRUE);", (bg_cat_id,))
                bg_values = [
                    (str(uuid.uuid4()), bg_cat_id, "A_POS", "A+", 1),
                    (str(uuid.uuid4()), bg_cat_id, "A_NEG", "A-", 2),
                    (str(uuid.uuid4()), bg_cat_id, "B_POS", "B+", 3),
                    (str(uuid.uuid4()), bg_cat_id, "B_NEG", "B-", 4),
                    (str(uuid.uuid4()), bg_cat_id, "O_POS", "O+", 5),
                    (str(uuid.uuid4()), bg_cat_id, "O_NEG", "O-", 6),
                    (str(uuid.uuid4()), bg_cat_id, "AB_POS", "AB+", 7),
                    (str(uuid.uuid4()), bg_cat_id, "AB_NEG", "AB-", 8),
                ]
                cursor.executemany("INSERT INTO lookup_values (id, category_id, code, label, numeric_value) VALUES (%s, %s, %s, %s, %s);", bg_values)

                # Student Statuses
                statuses = [
                    (str(uuid.uuid4()), "ACTIVE", "Active", True, True),
                    (str(uuid.uuid4()), "SUSPENDED", "Suspended", False, False),
                    (str(uuid.uuid4()), "TRANSFERRED", "Transferred / TC Issued", False, False),
                    (str(uuid.uuid4()), "ALUMNI", "Alumni / Graduated", False, False),
                    (str(uuid.uuid4()), "PROVISIONAL", "Provisional Admission", True, True),
                ]
                cursor.executemany("INSERT INTO student_statuses (id, code, name, allow_attendance, allow_fee_demand) VALUES (%s, %s, %s, %s, %s);", statuses)

                # Payment Modes
                payment_modes = [
                    (str(uuid.uuid4()), "CASH", "Cash", False, True),
                    (str(uuid.uuid4()), "UPI_QR", "UPI / QR Code", True, True),
                    (str(uuid.uuid4()), "BANK_TRANSFER", "Bank Transfer (NEFT/IMPS)", True, True),
                    (str(uuid.uuid4()), "CHEQUE", "Cheque", True, True),
                    (str(uuid.uuid4()), "ONLINE_GATEWAY", "Online Payment Gateway", True, True),
                ]
                cursor.executemany("INSERT INTO payment_modes (id, code, name, requires_reference_no, is_active) VALUES (%s, %s, %s, %s, %s);", payment_modes)

                # Attendance Statuses
                att_cat_id = str(uuid.uuid4())
                cursor.execute("INSERT INTO lookup_categories (id, code, name, is_system) VALUES (%s, 'ATTENDANCE_STATUS', 'Attendance Status', TRUE);", (att_cat_id,))
                att_values = [
                    (str(uuid.uuid4()), att_cat_id, "PRESENT", "Present", 1),
                    (str(uuid.uuid4()), att_cat_id, "ABSENT", "Absent", 2),
                    (str(uuid.uuid4()), att_cat_id, "LATE", "Late", 3),
                    (str(uuid.uuid4()), att_cat_id, "HALF_DAY", "Half Day", 4),
                    (str(uuid.uuid4()), att_cat_id, "EXCUSED", "Excused Leave", 5),
                ]
                cursor.executemany("INSERT INTO lookup_values (id, category_id, code, label, numeric_value) VALUES (%s, %s, %s, %s, %s);", att_values)

                # Default Fee Heads
                fee_heads = [
                    (str(uuid.uuid4()), "Tuition Fee", "TUITION", True, 1, "Monthly Academic Tuition"),
                    (str(uuid.uuid4()), "Admission Fee", "ADMISSION", False, 2, "One-time Admission Charge"),
                    (str(uuid.uuid4()), "Examination Fee", "EXAM", False, 3, "Term Examination Fee"),
                    (str(uuid.uuid4()), "Transport / Van Fee", "TRANSPORT", True, 4, "Monthly Bus & Van Charges"),
                    (str(uuid.uuid4()), "Annual Development Charge", "ANNUAL_DEV", False, 5, "Annual Infrastructure Fee"),
                ]
                cursor.executemany("INSERT INTO fee_heads (id, name, code, is_recurring, priority_order, description) VALUES (%s, %s, %s, %s, %s, %s);", fee_heads)

                # Default Finance Categories
                finance_categories = [
                    (str(uuid.uuid4()), "Electricity & Utilities", "EXPENSE", "ELEC_UTIL"),
                    (str(uuid.uuid4()), "Building & Campus Rent", "EXPENSE", "RENT"),
                    (str(uuid.uuid4()), "Staff Salaries & Wages", "EXPENSE", "STAFF_SALARY"),
                    (str(uuid.uuid4()), "Printing & Stationery", "EXPENSE", "STATIONERY"),
                    (str(uuid.uuid4()), "Repairs & Maintenance", "EXPENSE", "MAINTENANCE"),
                    (str(uuid.uuid4()), "Donation & Grants", "INCOME", "DONATION"),
                    (str(uuid.uuid4()), "Miscellaneous Income", "INCOME", "MISC_INCOME"),
                ]
                cursor.executemany("INSERT INTO finance_categories (id, name, category_type, code) VALUES (%s, %s, %s, %s);", finance_categories)

                # Default Grading Scale (CBSE 8-Point)
                scale_id = str(uuid.uuid4())
                cursor.execute("INSERT INTO grading_scales (id, name, description) VALUES (%s, 'CBSE 8-Point Scale', 'Standard secondary grading scale');", (scale_id,))
                tiers = [
                    (str(uuid.uuid4()), scale_id, 91.00, 100.00, "A1", 10.0, "Outstanding"),
                    (str(uuid.uuid4()), scale_id, 81.00, 90.99, "A2", 9.0, "Excellent"),
                    (str(uuid.uuid4()), scale_id, 71.00, 80.99, "B1", 8.0, "Very Good"),
                    (str(uuid.uuid4()), scale_id, 61.00, 70.99, "B2", 7.0, "Good"),
                    (str(uuid.uuid4()), scale_id, 51.00, 60.99, "C1", 6.0, "Above Average"),
                    (str(uuid.uuid4()), scale_id, 41.00, 50.99, "C2", 5.0, "Average"),
                    (str(uuid.uuid4()), scale_id, 33.00, 40.99, "D", 4.0, "Pass"),
                    (str(uuid.uuid4()), scale_id, 0.00, 32.99, "E", 0.0, "Needs Improvement / Fail"),
                ]
                cursor.executemany("INSERT INTO grading_scale_tiers (id, grading_scale_id, min_score_percent, max_score_percent, grade_letter, grade_point, remarks) VALUES (%s, %s, %s, %s, %s, %s, %s);", tiers)

                # 5. Template-Specific Academic Seeding (Classes, Sections, Subjects, Qualitative Criteria)
                year_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO academic_years (id, name, start_date, end_date, is_current)
                VALUES (%s, '2026-2027', '2026-04-01', '2027-03-31', TRUE);
                """, (year_id,))

                # Standard Classes & Sections
                class_names = [
                    ("Nursery", 1), ("LKG", 2), ("UKG", 3),
                    ("Class 1", 4), ("Class 2", 5), ("Class 3", 6), ("Class 4", 7), ("Class 5", 8),
                    ("Class 6", 9), ("Class 7", 10), ("Class 8", 11), ("Class 9", 12), ("Class 10", 13),
                    ("Class 11", 14), ("Class 12", 15),
                ]
                for c_name, order_idx in class_names:
                    cls_id = str(uuid.uuid4())
                    cursor.execute("INSERT INTO classes (id, name, numeric_order, description) VALUES (%s, %s, %s, %s);", (cls_id, c_name, order_idx, f"Standard {c_name}"))
                    # Sections A & B
                    sec_a_id = str(uuid.uuid4())
                    sec_b_id = str(uuid.uuid4())
                    cursor.execute("INSERT INTO sections (id, class_id, name, capacity) VALUES (%s, %s, 'Section A', 45);", (sec_a_id, cls_id))
                    cursor.execute("INSERT INTO sections (id, class_id, name, capacity) VALUES (%s, %s, 'Section B', 45);", (sec_b_id, cls_id))

                # Standard Core Subjects
                subjects = [
                    (str(uuid.uuid4()), "English Language & Literature", "ENG", "CORE"),
                    (str(uuid.uuid4()), "Mathematics", "MATH", "CORE"),
                    (str(uuid.uuid4()), "General Science", "SCI", "CORE"),
                    (str(uuid.uuid4()), "Social Science & History", "SST", "CORE"),
                    (str(uuid.uuid4()), "Hindi Language", "HIN", "CORE"),
                    (str(uuid.uuid4()), "Urdu / Regional Language", "URD", "ELECTIVE"),
                    (str(uuid.uuid4()), "Computer Studies & ICT", "COMP", "CORE"),
                    (str(uuid.uuid4()), "General Knowledge (GK)", "GK", "CORE"),
                    (str(uuid.uuid4()), "Art, Craft & Drawing", "ART", "CO_SCHOLASTIC"),
                ]
                cursor.executemany("INSERT INTO subjects (id, name, code, subject_type) VALUES (%s, %s, %s, %s);", subjects)

                # Standard Qualitative Behavioral Criteria
                qual_criteria = [
                    (str(uuid.uuid4()), "Cleanliness & Personal Hygiene", "CLEANLINESS", "Neatness of uniform, nails, personal hygiene"),
                    (str(uuid.uuid4()), "Discipline & Punctuality", "DISCIPLINE", "Respect for school rules, punctuality in assembly"),
                    (str(uuid.uuid4()), "Leadership & Teamwork", "LEADERSHIP", "Participation in group activities and leadership"),
                    (str(uuid.uuid4()), "Homework & Task Regularity", "HOMEWORK", "Timely completion and submission of homework"),
                    (str(uuid.uuid4()), "Sportsmanship & Physical Activity", "SPORTS", "Active participation in PT and playground games"),
                ]
                cursor.executemany("INSERT INTO development_criteria (id, name, code, description) VALUES (%s, %s, %s, %s);", qual_criteria)

                # 6. Seed Initial System Settings
                settings_list = [
                    (str(uuid.uuid4()), "school_name", f'"{school_name}"', True, "Official School Name"),
                    (str(uuid.uuid4()), "theme_primary_color", '"#1E40AF"', True, "Primary Brand Color"),
                    (str(uuid.uuid4()), "theme_secondary_color", '"#F59E0B"', True, "Secondary Brand Color"),
                    (str(uuid.uuid4()), "currency_symbol", '"₹"', True, "Default Currency Symbol"),
                    (str(uuid.uuid4()), "date_format", '"DD-MM-YYYY"', True, "Default Date Display Format"),
                    (str(uuid.uuid4()), "late_fine_daily_rate", "10.00", False, "Daily Fine Rate in INR after Grace Period"),
                    (str(uuid.uuid4()), "late_fine_grace_days", "5", False, "Grace Period Days for Fee Installment"),
                ]
                cursor.executemany("INSERT INTO system_settings (id, setting_key, setting_value, is_public, description) VALUES (%s, %s, %s, %s, %s);", settings_list)

                # 7. Seed Initial School Admin User
                admin_user_id = str(uuid.uuid4())
                hashed_pass = get_password_hash(admin_password)
                cursor.execute("""
                INSERT INTO users (id, username, email, phone, password_hash, user_type, is_active)
                VALUES (%s, %s, %s, %s, %s, 'STAFF', TRUE);
                """, (admin_user_id, admin_email, admin_email, admin_phone, hashed_pass))

                cursor.execute("""
                INSERT INTO user_roles (user_id, role_id)
                VALUES (%s, %s);
                """, (admin_user_id, admin_role_id))

                logger.info(f"Successfully seeded template master data and admin user ({admin_email}) for tenant DB '{db_name}'")
        finally:
            connection.close()

    @staticmethod
    def _create_tenant_storage(tenant_slug: str):
        """Creates tenant media storage directory structure."""
        base_dir = settings.LOCAL_STORAGE_PATH
        public_dir = os.path.join(base_dir, tenant_slug, "public")
        private_dir = os.path.join(base_dir, tenant_slug, "private")
        os.makedirs(public_dir, exist_ok=True)
        os.makedirs(private_dir, exist_ok=True)
        logger.info(f"Created local storage folders for tenant '{tenant_slug}'")

    @classmethod
    async def provision_new_tenant(cls, req: TenantCreateRequest, db: AsyncSession) -> Tenant:
        """
        Executes the atomic 8-step tenant provisioning pipeline.
        """
        # Step 1: Check slug and domain uniqueness in Control DB
        existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == req.slug))
        if existing_tenant.scalar_one_or_none():
            raise AppException(message=f"Tenant slug '{req.slug}' is already taken", error_code="SLUG_ALREADY_EXISTS")

        existing_domain = await db.execute(select(TenantDomain).where(TenantDomain.domain == req.primary_domain))
        if existing_domain.scalar_one_or_none():
            raise AppException(message=f"Domain '{req.primary_domain}' is already assigned to another school", error_code="DOMAIN_ALREADY_EXISTS")

        db_name = f"tenant_{req.slug}_db"
        db_user = f"user_{req.slug}" if settings.ENVIRONMENT == "production" else "root"
        db_pass = str(uuid.uuid4()).replace("-", "")[:16] if db_user != "root" else settings.TENANT_MYSQL_ADMIN_PASSWORD

        # Step 2: Create Control DB record in PROVISIONING state
        tenant = Tenant(
            slug=req.slug,
            school_name=req.school_name,
            db_name=db_name,
            db_user=db_user,
            db_password_encrypted=db_pass,
            db_host=settings.TENANT_MYSQL_HOST,
            db_port=settings.TENANT_MYSQL_PORT,
            status=TenantStatus.PROVISIONING,
            admin_email=req.admin_email,
            admin_phone=req.admin_phone,
        )
        db.add(tenant)
        await db.flush()

        # Add primary domain
        primary_domain_obj = TenantDomain(
            tenant_id=tenant.id,
            domain=req.primary_domain,
            is_primary=True,
            is_verified=True,
        )
        db.add(primary_domain_obj)

        # Add fallback/additional domains if provided
        if req.additional_domains:
            for add_domain in req.additional_domains:
                db.add(TenantDomain(
                    tenant_id=tenant.id,
                    domain=add_domain,
                    is_primary=False,
                    is_verified=True,
                ))

        # Add enabled modules
        default_modules = req.enabled_modules or ["FEES", "ACADEMICS", "ATTENDANCE", "EXAMS", "DEVELOPMENT", "DOCUMENTS", "CMS", "PARENT_PORTAL"]
        for mod in default_modules:
            db.add(TenantModuleToggle(
                tenant_id=tenant.id,
                module_code=mod,
                is_enabled=True,
            ))

        await db.commit()
        await db.refresh(tenant)

        try:
            # Step 3: Create MySQL Database & User
            cls._create_mysql_database(db_name, db_user, db_pass)

            # Step 4: Initialize Tenant Database Schema
            cls._initialize_tenant_schema(db_name, db_user, db_pass)

            # Step 5: Seed Master Data & School Admin
            cls._seed_tenant_master_data(
                db_name=db_name,
                db_user=db_user,
                db_pass=db_pass,
                school_name=req.school_name,
                admin_email=req.admin_email,
                admin_phone=req.admin_phone,
                admin_password=req.admin_password,
            )

            # Step 6: Create Tenant Storage Directories
            cls._create_tenant_storage(req.slug)

            # Step 7: Update Control DB Status to ACTIVE
            tenant.status = TenantStatus.ACTIVE
            await db.commit()
            await db.refresh(tenant)

            logger.info(f"Provisioning Complete: School '{req.school_name}' (Slug: '{req.slug}', Domain: '{req.primary_domain}') is ACTIVE.")
            return tenant

        except Exception as e:
            logger.error(f"Tenant provisioning failed for '{req.slug}': {e}. Initiating rollback...")
            cls._drop_mysql_database(db_name)
            tenant.status = "FAILED"
            await db.commit()
            raise AppException(message=f"Tenant provisioning failed: {str(e)}", error_code="PROVISIONING_FAILED")
