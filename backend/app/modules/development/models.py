from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, JSON, Date, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import date, datetime
from app.shared.base_models import BaseTenantModel


class DevelopmentCriteria(BaseTenantModel):
    __tablename__ = "development_criteria"

    code = Column(String(50), unique=True, nullable=False, index=True)  # 'CLEANLINESS', 'DISCIPLINE', 'LEADERSHIP'
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class DevelopmentScale(BaseTenantModel):
    __tablename__ = "development_scales"

    name = Column(String(100), nullable=False)        # '5-Star Scale', 'Grade A-E'
    scale_type = Column(String(50), nullable=False)   # 'STAR', 'GRADE', 'NUMERIC'
    options = Column(JSON, nullable=False)            # [{"label": "Excellent", "value": 5}, {"label": "Good", "value": 4}]


class DevelopmentRule(BaseTenantModel):
    __tablename__ = "development_rules"

    academic_year_id = Column(String(36), nullable=False, index=True)
    class_id = Column(String(36), nullable=False, index=True)
    criteria_id = Column(String(36), ForeignKey("development_criteria.id"), nullable=False)
    scale_id = Column(String(36), ForeignKey("development_scales.id"), nullable=False)
    weightage = Column(Integer, default=1, nullable=False)
    evaluation_frequency = Column(String(50), default="MONTHLY", nullable=False)  # 'MONTHLY', 'TERM_WISE'

    criteria = relationship("DevelopmentCriteria")
    scale = relationship("DevelopmentScale")


class StudentDevelopmentRecord(BaseTenantModel):
    __tablename__ = "student_development_records"

    student_id = Column(String(36), nullable=False, index=True)
    academic_year_id = Column(String(36), nullable=False, index=True)
    criteria_id = Column(String(36), ForeignKey("development_criteria.id"), nullable=False)
    rating_value = Column(String(50), nullable=False)  # '5', 'A', 'Good'
    remarks = Column(Text, nullable=True)
    evaluated_by_staff_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    evaluation_period = Column(String(50), nullable=False)  # 'April-2026', 'Term-1'

    criteria = relationship("DevelopmentCriteria")


class DisciplineIncident(BaseTenantModel):
    __tablename__ = "discipline_incidents"

    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    incident_date = Column(Date, default=date.today, nullable=False)
    category = Column(String(100), nullable=False)  # 'LATE_COMING', 'UNIFORM_VIOLATION', 'BEHAVIORAL', 'ACADEMIC_DISHONESTY'
    severity_level = Column(String(30), default="LOW", nullable=False)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    action_taken = Column(String(255), nullable=False)  # 'VERBAL_WARNING', 'WRITTEN_WARNING', 'PARENT_CALLED', 'SUSPENSION'
    description = Column(Text, nullable=True)
    parent_notified = Column(Boolean, default=False)
    reported_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    student = relationship("app.modules.students.models.Student")
    reported_by = relationship("app.modules.users_rbac.models.User")


class StudentAward(BaseTenantModel):
    __tablename__ = "student_awards"

    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    award_name = Column(String(150), nullable=False)  # 'Student of the Month', '100% Attendance', 'Best in Mathematics'
    award_category = Column(String(100), default="ACADEMIC")  # 'ACADEMIC', 'ATTENDANCE', 'BEHAVIOR', 'SPORTS', 'CO_CURRICULAR'
    award_date = Column(Date, default=date.today, nullable=False)
    description = Column(Text, nullable=True)
    certificate_issued = Column(Boolean, default=True)
    awarded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    student = relationship("app.modules.students.models.Student")
    awarded_by = relationship("app.modules.users_rbac.models.User")


class StudentDailyHabit(BaseTenantModel):
    __tablename__ = "student_daily_habits"

    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=True, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False, index=True)
    habit_date = Column(Date, default=date.today, nullable=False, index=True)

    # 9 Dimension Toggles (Boolean - 1=True=Green/Good, 0=False=Red/Exception)
    attendance_status = Column(String(20), default="PRESENT", nullable=False)  # 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
    habit_punctuality = Column(Boolean, default=True, nullable=False)
    habit_uniform = Column(Boolean, default=True, nullable=False)
    habit_material = Column(Boolean, default=True, nullable=False)  # Books/Stationery
    habit_homework = Column(Boolean, default=True, nullable=False)
    habit_classwork = Column(Boolean, default=True, nullable=False)
    habit_healthy_lunch = Column(Boolean, default=True, nullable=False)
    habit_discipline = Column(Boolean, default=True, nullable=False)
    habit_neatness = Column(Boolean, default=True, nullable=False)

    # Precomputed Composite Metrics
    daily_score = Column(Integer, default=9, nullable=False)  # 0 to 9
    exception_notes = Column(Text, nullable=True)  # quick tags or summary
    recorded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    student = relationship("app.modules.students.models.Student")
    recorded_by = relationship("app.modules.users_rbac.models.User")

    __table_args__ = (
        UniqueConstraint("student_id", "habit_date", name="uk_student_habit_date"),
    )


class PrincipalActionItem(BaseTenantModel):
    __tablename__ = "principal_action_items"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="ACADEMIC", nullable=False) # 'ACADEMIC', 'DISCIPLINE', 'FACILITY', 'FEES', 'COMPLIANCE', 'STAFF'
    assigned_to_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    deadline = Column(Date, nullable=False)
    status = Column(String(30), default="OPEN", nullable=False, index=True) # 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE'
    resolution_notes = Column(Text, nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    assigned_to = relationship("app.modules.users_rbac.models.User", foreign_keys=[assigned_to_user_id])
    created_by = relationship("app.modules.users_rbac.models.User", foreign_keys=[created_by_user_id])


class NotebookCorrectionAudit(BaseTenantModel):
    __tablename__ = "notebook_correction_audits"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    teacher_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    audit_date = Column(Date, default=date.today, nullable=False)
    notebooks_checked_count = Column(Integer, default=5, nullable=False)
    index_score = Column(Integer, nullable=False)          # 0-10
    date_score = Column(Integer, nullable=False)           # 0-10
    red_pen_correction_score = Column(Integer, nullable=False) # 0-10
    spelling_correction_score = Column(Integer, nullable=False) # 0-10
    teacher_signature_score = Column(Integer, nullable=False)  # 0-10
    total_score_pct = Column(Float, nullable=False)        # e.g. 84.0%
    auditor_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    remarks = Column(Text, nullable=True)

    teacher = relationship("app.modules.users_rbac.models.User", foreign_keys=[teacher_user_id])
    class_level = relationship("app.modules.academics.models.ClassLevel")
    section = relationship("app.modules.academics.models.Section")
    subject = relationship("app.modules.academics.models.Subject")


