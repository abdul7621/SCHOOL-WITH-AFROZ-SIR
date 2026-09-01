from sqlalchemy import Column, String, Boolean, Date, Text, ForeignKey
from app.shared.base_models import BaseTenantModel


class Notice(BaseTenantModel):
    __tablename__ = "notices"

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), default="GENERAL", nullable=False)  # 'GENERAL', 'ACADEMIC', 'EXAM', 'HOLIDAY'
    published_date = Column(Date, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=True, nullable=False)         # Visible on public school website
    attachment_url = Column(String(255), nullable=True)


class AdmissionInquiry(BaseTenantModel):
    __tablename__ = "admission_inquiries"

    applicant_name = Column(String(100), nullable=False)
    parent_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    target_class_name = Column(String(50), nullable=False)            # e.g. 'Class 6'
    message = Column(Text, nullable=True)
    status = Column(String(30), default="NEW", nullable=False)        # 'NEW', 'CONTACTED', 'CONVERTED', 'REJECTED'


class GalleryMedia(BaseTenantModel):
    __tablename__ = "gallery_media"

    title = Column(String(150), nullable=False)
    album_name = Column(String(100), default="General", nullable=False)
    media_url = Column(String(255), nullable=False)
    media_type = Column(String(20), default="IMAGE", nullable=False)  # 'IMAGE', 'VIDEO'
    is_published = Column(Boolean, default=True, nullable=False)
