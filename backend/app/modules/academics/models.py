from datetime import date, time
from sqlalchemy import Column, String, Integer, Boolean, Date, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class AcademicYear(BaseTenantModel):
    __tablename__ = "academic_years"

    name = Column(String(50), nullable=False)                  # '2026-2027'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False, index=True)
    is_locked = Column(Boolean, default=False, nullable=False)


class ClassLevel(BaseTenantModel):
    __tablename__ = "classes"

    name = Column(String(50), nullable=False)                  # 'Class 10', 'Nursery'
    numeric_order = Column(Integer, nullable=False, index=True)  # 10 (for sorting)
    description = Column(String(255), nullable=True)

    sections = relationship("Section", back_populates="class_level", cascade="all, delete-orphan")
    class_subjects = relationship("ClassSubject", back_populates="class_level", cascade="all, delete-orphan")


class Section(BaseTenantModel):
    __tablename__ = "sections"

    class_id = Column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(20), nullable=False)                  # 'A', 'B', 'Rose'
    capacity = Column(Integer, default=45, nullable=False)

    class_level = relationship("ClassLevel", back_populates="sections")

    __table_args__ = (
        UniqueConstraint("class_id", "name", name="uk_class_section_name"),
    )


class Subject(BaseTenantModel):
    __tablename__ = "subjects"

    code = Column(String(50), unique=True, nullable=False, index=True)  # 'MATH_10', 'ENG_01'
    name = Column(String(100), nullable=False)                          # 'Mathematics', 'English Literature'
    subject_type = Column(String(50), default="THEORY", nullable=False) # 'THEORY', 'PRACTICAL', 'BOTH'
    is_elective = Column(Boolean, default=False, nullable=False)

    class_subjects = relationship("ClassSubject", back_populates="subject", cascade="all, delete-orphan")


class ClassSubject(BaseTenantModel):
    __tablename__ = "class_subjects"

    class_id = Column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    is_mandatory = Column(Boolean, default=True, nullable=False)

    class_level = relationship("ClassLevel", back_populates="class_subjects")
    subject = relationship("Subject", back_populates="class_subjects")

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", name="uk_class_subject"),
    )


class ClassTeacher(BaseTenantModel):
    __tablename__ = "class_teachers"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    academic_year = relationship("AcademicYear")
    class_level = relationship("ClassLevel")
    section = relationship("Section")

    __table_args__ = (
        UniqueConstraint("academic_year_id", "class_id", "section_id", name="uk_year_class_section_teacher"),
    )


class ClassHomework(BaseTenantModel):
    __tablename__ = "class_homework"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=False)
    assigned_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    attachment_url = Column(String(255), nullable=True)
    assigned_by_teacher_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    class_level = relationship("ClassLevel")
    section = relationship("Section")
    subject = relationship("Subject")
    assigned_by = relationship("app.modules.users_rbac.models.User")


class StudentLeaveRequest(BaseTenantModel):
    __tablename__ = "student_leave_requests"

    student_id = Column(String(36), ForeignKey("students.id"), nullable=False, index=True)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    reason = Column(String(500), nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)  # 'PENDING', 'APPROVED', 'REJECTED'
    approved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    approval_remarks = Column(String(255), nullable=True)

    student = relationship("app.modules.students.models.Student")


class TimetablePeriod(BaseTenantModel):
    __tablename__ = "timetable_periods"

    period_number = Column(Integer, nullable=False)             # 1, 2, 3...
    name = Column(String(100), nullable=False)                  # 'Period 1', 'Recess / Lunch'
    start_time = Column(Time, nullable=False)                   # 08:30:00
    end_time = Column(Time, nullable=False)                     # 09:15:00
    is_break = Column(Boolean, default=False, nullable=False)   # True for lunch/assembly
    sort_order = Column(Integer, default=1, nullable=False)


class TimetableSlot(BaseTenantModel):
    __tablename__ = "timetable_slots"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(String(15), nullable=False, index=True)  # 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
    period_id = Column(String(36), ForeignKey("timetable_periods.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    room_number = Column(String(50), nullable=True)

    academic_year = relationship("AcademicYear")
    class_level = relationship("ClassLevel")
    section = relationship("Section")
    period = relationship("TimetablePeriod")
    subject = relationship("Subject")
    teacher = relationship("app.modules.users_rbac.models.User")

    __table_args__ = (
        UniqueConstraint("academic_year_id", "class_id", "section_id", "day_of_week", "period_id", name="uk_class_sec_day_period"),
    )


