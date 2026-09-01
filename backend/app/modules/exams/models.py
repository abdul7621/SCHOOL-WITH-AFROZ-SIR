from sqlalchemy import Column, String, Integer, Numeric, Boolean, Date, Time, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class ExamTerm(BaseTenantModel):
    __tablename__ = "exam_terms"

    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)                  # 'Term 1 / Half-Yearly', 'Term 2 / Annual', 'Unit Test 1'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    weightage_percent = Column(Numeric(5, 2), default=100.00, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)

    academic_year = relationship("app.modules.academics.models.AcademicYear")
    schedules = relationship("ExamSchedule", back_populates="exam_term", cascade="all, delete-orphan")


class GradingScale(BaseTenantModel):
    __tablename__ = "grading_scales"

    name = Column(String(100), nullable=False)                  # 'CBSE 8-Point Scale', 'Primary Letter Grade'
    description = Column(String(255), nullable=True)

    tiers = relationship("GradingScaleTier", back_populates="grading_scale", cascade="all, delete-orphan")


class GradingScaleTier(BaseTenantModel):
    __tablename__ = "grading_scale_tiers"

    grading_scale_id = Column(String(36), ForeignKey("grading_scales.id", ondelete="CASCADE"), nullable=False, index=True)
    min_score_percent = Column(Numeric(5, 2), nullable=False)   # 91.00
    max_score_percent = Column(Numeric(5, 2), nullable=False)   # 100.00
    grade_letter = Column(String(10), nullable=False)           # 'A1', 'A2', 'B1', 'F'
    grade_point = Column(Numeric(4, 2), default=0.00, nullable=False) # 10.0, 9.0
    remarks = Column(String(100), nullable=True)                # 'Outstanding', 'Excellent'

    grading_scale = relationship("GradingScale", back_populates="tiers")


class ExamSchedule(BaseTenantModel):
    __tablename__ = "exam_schedules"

    exam_term_id = Column(String(36), ForeignKey("exam_terms.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False, index=True)
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    max_marks = Column(Numeric(5, 2), default=100.00, nullable=False)
    pass_marks = Column(Numeric(5, 2), default=33.00, nullable=False)
    grading_scale_id = Column(String(36), ForeignKey("grading_scales.id"), nullable=True)

    exam_term = relationship("ExamTerm", back_populates="schedules")
    class_level = relationship("app.modules.academics.models.ClassLevel")
    subject = relationship("app.modules.academics.models.Subject")
    grading_scale = relationship("GradingScale")
    marks = relationship("StudentExamMark", back_populates="schedule", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("exam_term_id", "class_id", "subject_id", name="uk_term_class_subject_schedule"),
    )


class StudentExamMark(BaseTenantModel):
    __tablename__ = "student_exam_marks"

    exam_schedule_id = Column(String(36), ForeignKey("exam_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Numeric(5, 2), nullable=True)       # Null if absent
    is_absent = Column(Boolean, default=False, nullable=False)
    remarks = Column(String(255), nullable=True)

    schedule = relationship("ExamSchedule", back_populates="marks")
    student = relationship("app.modules.students.models.Student")

    __table_args__ = (
        UniqueConstraint("exam_schedule_id", "student_id", name="uk_schedule_student_mark"),
    )
