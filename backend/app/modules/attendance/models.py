from sqlalchemy import Column, String, Date, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class AttendanceSession(BaseTenantModel):
    __tablename__ = "attendance_sessions"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False, index=True)
    attendance_date = Column(Date, nullable=False, index=True)
    marked_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(30), default="SUBMITTED", nullable=False)  # 'SUBMITTED', 'LOCKED'

    academic_year = relationship("app.modules.academics.models.AcademicYear")
    class_level = relationship("app.modules.academics.models.ClassLevel")
    section = relationship("app.modules.academics.models.Section")
    marked_by = relationship("app.modules.users_rbac.models.User")
    records = relationship("StudentDailyAttendance", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("class_id", "section_id", "attendance_date", name="uk_class_sec_date_attendance"),
    )


class StudentDailyAttendance(BaseTenantModel):
    __tablename__ = "student_daily_attendance"

    session_id = Column(String(36), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_status_id = Column(String(36), ForeignKey("lookup_values.id"), nullable=False)
    remarks = Column(Text, nullable=True)

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("app.modules.students.models.Student")
    status_lookup = relationship("app.modules.lookups.models.LookupValue")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uk_session_student_attendance"),
    )
