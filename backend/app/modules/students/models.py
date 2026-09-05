from sqlalchemy import Column, String, Integer, Date, Boolean, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class Parent(BaseTenantModel):
    __tablename__ = "parents"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    father_name = Column(String(150), nullable=False)
    mother_name = Column(String(150), nullable=True)
    primary_phone = Column(String(20), nullable=False, index=True)
    whatsapp_phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    father_occupation = Column(String(100), nullable=True)
    mother_occupation = Column(String(100), nullable=True)

    students = relationship("Student", back_populates="parent")
    user = relationship("app.modules.users_rbac.models.User")


class Student(BaseTenantModel):
    __tablename__ = "students"

    admission_no = Column(String(50), unique=True, nullable=False, index=True)  # e.g. 'UME-2026-0045'
    first_name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=True)
    dob = Column(Date, nullable=False)
    gender_id = Column(String(36), ForeignKey("lookup_values.id"), nullable=True)
    blood_group_id = Column(String(36), ForeignKey("lookup_values.id"), nullable=True)
    religion_id = Column(String(36), ForeignKey("lookup_values.id"), nullable=True)
    caste_category_id = Column(String(36), ForeignKey("lookup_values.id"), nullable=True)
    parent_id = Column(String(36), ForeignKey("parents.id"), nullable=False, index=True)
    status_id = Column(String(36), ForeignKey("student_statuses.id"), nullable=False, index=True)
    profile_photo_url = Column(Text, nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    custom_attributes = Column(JSON, nullable=True)  # Variable school fields (e.g. BPL card, Aadhar, etc.)

    parent = relationship("Parent", back_populates="students")
    enrollments = relationship("StudentEnrollment", back_populates="student", cascade="all, delete-orphan")
    documents = relationship("StudentDocument", back_populates="student", cascade="all, delete-orphan")
    status = relationship("app.modules.lookups.models.StudentStatus")
    gender = relationship("app.modules.lookups.models.LookupValue", foreign_keys=[gender_id])


class StudentEnrollment(BaseTenantModel):
    __tablename__ = "student_enrollments"

    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False, index=True)
    roll_no = Column(Integer, nullable=True)
    enrollment_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    student = relationship("Student", back_populates="enrollments")
    academic_year = relationship("app.modules.academics.models.AcademicYear")
    class_level = relationship("app.modules.academics.models.ClassLevel")
    section = relationship("app.modules.academics.models.Section")

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uk_student_year_enrollment"),
    )


class StudentDocument(BaseTenantModel):
    __tablename__ = "student_documents"

    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)        # 'Birth Certificate', 'Aadhar Card'
    document_type = Column(String(50), nullable=False) # 'IDENTITY', 'ACADEMIC', 'MEDICAL'
    file_key = Column(String(255), nullable=False)     # Storage relative key
    file_size_bytes = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="documents")
