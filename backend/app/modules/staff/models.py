from sqlalchemy import Column, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel


class Department(BaseTenantModel):
    __tablename__ = "departments"

    name = Column(String(100), nullable=False)                  # 'Science & Mathematics', 'Administration'
    code = Column(String(50), unique=True, nullable=False, index=True) # 'SCI_MATH', 'ADMIN'


class Designation(BaseTenantModel):
    __tablename__ = "designations"

    title = Column(String(100), nullable=False)                 # 'Principal', 'Senior Teacher (PGT)', 'Clerk'
    code = Column(String(50), unique=True, nullable=False, index=True)  # 'PRIN', 'PGT', 'CLERK'


class StaffProfile(BaseTenantModel):
    __tablename__ = "staff_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)  # e.g. 'EMP-0012'
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    designation_id = Column(String(36), ForeignKey("designations.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    qualification = Column(String(150), nullable=True)          # 'M.Sc B.Ed'
    joining_date = Column(Date, nullable=False)
    emergency_contact = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("app.modules.users_rbac.models.User")
    designation = relationship("Designation")
    department = relationship("Department")
