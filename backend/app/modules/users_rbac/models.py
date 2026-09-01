from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.shared.base_models import BaseTenantModel, Base


class User(BaseTenantModel):
    __tablename__ = "users"

    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(50), nullable=False)  # 'STAFF', 'PARENT', 'STUDENT'
    is_active = Column(Boolean, default=True, nullable=False)

    roles = relationship("Role", secondary="user_roles", back_populates="users")


class Role(BaseTenantModel):
    __tablename__ = "roles"

    name = Column(String(100), nullable=False)       # 'School Admin', 'Principal', 'Accountant'
    code = Column(String(50), unique=True, nullable=False, index=True)  # 'ADMIN', 'ACCOUNTANT'
    is_system = Column(Boolean, default=False, nullable=False)

    users = relationship("User", secondary="user_roles", back_populates="roles")
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True)
    module = Column(String(50), nullable=False, index=True)  # 'FEES', 'STUDENTS', 'EXAMS'
    action = Column(String(50), nullable=False)              # 'VIEW', 'CREATE', 'EDIT', 'DELETE', 'COLLECT', 'REVERSE'
    code = Column(String(100), unique=True, nullable=False, index=True)  # 'fees:collect', 'fees:reverse'

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
