from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response, paginated_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.cms.models import Notice, AdmissionInquiry, GalleryMedia
from app.modules.cms.schemas import (
    NoticeCreate,
    AdmissionInquiryCreate,
    GalleryMediaCreate,
)

router = APIRouter(prefix="/cms", tags=["Public School Website CMS & Notices"])


# ==========================================
# 1. Public & Internal Notices
# ==========================================
@router.get("/notices/public")
async def list_public_notices(db: AsyncSession = Depends(get_tenant_db)):
    """Public Endpoint: Returns public notices for Next.js School Website."""
    stmt = (
        select(Notice)
        .where(Notice.is_public == True)
        .order_by(Notice.is_pinned.desc(), Notice.published_date.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    notices = result.scalars().all()

    return success_response(
        data=[
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "category": n.category,
                "published_date": str(n.published_date),
                "is_pinned": n.is_pinned,
                "attachment_url": n.attachment_url,
            }
            for n in notices
        ]
    )


@router.post("/notices", dependencies=[Depends(RequirePermission("settings:manage"))], status_code=status.HTTP_201_CREATED)
async def create_notice(req: NoticeCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Admin Action: Publishes a new circular or notice."""
    notice = Notice(
        title=req.title,
        content=req.content,
        category=req.category,
        published_date=req.published_date or date.today(),
        is_pinned=req.is_pinned,
        is_public=req.is_public,
        attachment_url=req.attachment_url,
    )
    db.add(notice)
    await db.commit()
    await db.refresh(notice)
    return success_response(data={"id": notice.id, "title": notice.title}, message="Notice published successfully")


# ==========================================
# 2. Public Admission Inquiries
# ==========================================
@router.post("/inquiries", status_code=status.HTTP_201_CREATED)
async def submit_admission_inquiry(req: AdmissionInquiryCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Public Endpoint: prospective parents submit admission inquiry form on school website."""
    inquiry = AdmissionInquiry(
        applicant_name=req.applicant_name,
        parent_name=req.parent_name,
        phone=req.phone,
        email=req.email,
        target_class_name=req.target_class_name,
        message=req.message,
        status="NEW",
    )
    db.add(inquiry)
    await db.commit()
    await db.refresh(inquiry)
    return success_response(data={"id": inquiry.id}, message="Admission inquiry received. School office will contact you soon.")


@router.get("/inquiries", dependencies=[Depends(RequirePermission("students:view"))])
async def list_admission_inquiries(
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Admin Endpoint: Lists leads/inquiries received from public website."""
    stmt = select(AdmissionInquiry).order_by(AdmissionInquiry.created_at.desc())
    if status_filter:
        stmt = stmt.where(AdmissionInquiry.status == status_filter.upper())
    result = await db.execute(stmt)
    inquiries = result.scalars().all()

    return success_response(
        data=[
            {
                "id": i.id,
                "applicant_name": i.applicant_name,
                "parent_name": i.parent_name,
                "phone": i.phone,
                "email": i.email,
                "target_class": i.target_class_name,
                "message": i.message,
                "status": i.status,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in inquiries
        ]
    )


# ==========================================
# 3. Public Media Gallery
# ==========================================
@router.get("/gallery/public")
async def get_public_gallery(album: Optional[str] = Query(None), db: AsyncSession = Depends(get_tenant_db)):
    """Public Endpoint: Returns photo/video albums for public school website."""
    stmt = select(GalleryMedia).where(GalleryMedia.is_published == True).order_by(GalleryMedia.created_at.desc())
    if album:
        stmt = stmt.where(GalleryMedia.album_name == album)
    result = await db.execute(stmt)
    media = result.scalars().all()

    return success_response(
        data=[
            {
                "id": m.id,
                "title": m.title,
                "album_name": m.album_name,
                "media_url": m.media_url,
                "media_type": m.media_type,
            }
            for m in media
        ]
    )


@router.post("/gallery", dependencies=[Depends(RequirePermission("settings:manage"))], status_code=status.HTTP_201_CREATED)
async def add_gallery_media(req: GalleryMediaCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Admin Action: Adds media to school public gallery."""
    media = GalleryMedia(
        title=req.title,
        album_name=req.album_name,
        media_url=req.media_url,
        media_type=req.media_type,
        is_published=req.is_published,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return success_response(data={"id": media.id, "title": media.title}, message="Gallery media added")
