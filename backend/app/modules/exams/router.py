from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.exams.models import (
    ExamTerm,
    GradingScale,
    GradingScaleTier,
    ExamSchedule,
)
from app.modules.exams.schemas import (
    ExamTermCreate,
    GradingScaleCreate,
    ExamScheduleCreate,
    SubmitMarksGridRequest,
)
from app.modules.exams.services import ExamService

router = APIRouter(prefix="/exams", tags=["Examinations, Grading & Report Cards"])


# ==========================================
# 1. Exam Terms
# ==========================================
@router.get("/terms", dependencies=[Depends(RequirePermission("academics:manage"))])
async def list_exam_terms(
    academic_year_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists all examination terms (e.g. Half-Yearly, Annual)."""
    stmt = select(ExamTerm).order_by(ExamTerm.start_date.asc())
    if academic_year_id:
        stmt = stmt.where(ExamTerm.academic_year_id == academic_year_id)
    result = await db.execute(stmt)
    terms = result.scalars().all()
    return success_response(
        data=[
            {
                "id": t.id,
                "academic_year_id": t.academic_year_id,
                "name": t.name,
                "start_date": str(t.start_date),
                "end_date": str(t.end_date),
                "weightage_percent": float(t.weightage_percent),
                "is_published": t.is_published,
            }
            for t in terms
        ]
    )


@router.post("/terms", dependencies=[Depends(RequirePermission("academics:manage"))], status_code=status.HTTP_201_CREATED)
async def create_exam_term(req: ExamTermCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new exam term."""
    term = ExamTerm(
        academic_year_id=req.academic_year_id,
        name=req.name,
        start_date=req.start_date,
        end_date=req.end_date,
        weightage_percent=req.weightage_percent,
        is_published=req.is_published,
    )
    db.add(term)
    await db.commit()
    await db.refresh(term)
    return success_response(data={"id": term.id, "name": term.name}, message="Exam term created successfully")


# ==========================================
# 2. Grading Scales
# ==========================================
@router.get("/grading-scales", dependencies=[Depends(RequirePermission("academics:manage"))])
async def list_grading_scales(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all configured grading scales with score tiers."""
    stmt = select(GradingScale).options(selectinload(GradingScale.tiers)).order_by(GradingScale.name.asc())
    result = await db.execute(stmt)
    scales = result.scalars().all()
    return success_response(
        data=[
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "tiers": [
                    {
                        "min_percent": float(t.min_score_percent),
                        "max_percent": float(t.max_score_percent),
                        "grade_letter": t.grade_letter,
                        "grade_point": float(t.grade_point),
                        "remarks": t.remarks,
                    }
                    for t in sorted(s.tiers, key=lambda x: x.min_score_percent, reverse=True)
                ],
            }
            for s in scales
        ]
    )


@router.post("/grading-scales", dependencies=[Depends(RequirePermission("academics:manage"))], status_code=status.HTTP_201_CREATED)
async def create_grading_scale(req: GradingScaleCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new grading scale (e.g. CBSE 8-Point)."""
    scale = GradingScale(name=req.name, description=req.description)
    db.add(scale)
    await db.flush()

    for tier_input in req.tiers:
        tier = GradingScaleTier(
            grading_scale_id=scale.id,
            min_score_percent=tier_input.min_score_percent,
            max_score_percent=tier_input.max_score_percent,
            grade_letter=tier_input.grade_letter,
            grade_point=tier_input.grade_point,
            remarks=tier_input.remarks,
        )
        db.add(tier)

    await db.commit()
    await db.refresh(scale)
    return success_response(data={"id": scale.id, "name": scale.name}, message="Grading scale created successfully")


# ==========================================
# 3. Exam Schedules
# ==========================================
@router.get("/schedules", dependencies=[Depends(RequirePermission("academics:manage"))])
async def list_exam_schedules(
    exam_term_id: str = Query(...),
    class_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists subject exam dates and timings for a term."""
    stmt = (
        select(ExamSchedule)
        .options(
            selectinload(ExamSchedule.subject),
            selectinload(ExamSchedule.class_level),
            selectinload(ExamSchedule.grading_scale),
        )
        .where(ExamSchedule.exam_term_id == exam_term_id)
        .order_by(ExamSchedule.exam_date.asc())
    )
    if class_id:
        stmt = stmt.where(ExamSchedule.class_id == class_id)

    result = await db.execute(stmt)
    schedules = result.scalars().all()

    return success_response(
        data=[
            {
                "id": s.id,
                "class_name": s.class_level.name if s.class_level else None,
                "subject_name": s.subject.name if s.subject else None,
                "exam_date": str(s.exam_date),
                "max_marks": float(s.max_marks),
                "pass_marks": float(s.pass_marks),
            }
            for s in schedules
        ]
    )


@router.post("/schedules", dependencies=[Depends(RequirePermission("academics:manage"))], status_code=status.HTTP_201_CREATED)
async def create_exam_schedule(req: ExamScheduleCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Schedules a subject exam for a class in an exam term."""
    schedule = ExamSchedule(
        exam_term_id=req.exam_term_id,
        class_id=req.class_id,
        subject_id=req.subject_id,
        exam_date=req.exam_date,
        start_time=req.start_time,
        end_time=req.end_time,
        max_marks=req.max_marks,
        pass_marks=req.pass_marks,
        grading_scale_id=req.grading_scale_id,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return success_response(data={"id": schedule.id}, message="Exam schedule created")


# ==========================================
# 4. Marks Entry Grid & Report Cards
# ==========================================
@router.get("/schedules/{schedule_id}/roster", dependencies=[Depends(RequirePermission("academics:manage"))])
async def get_marks_entry_roster(schedule_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Teacher Marks Entry Grid: Fetches enrolled students with previously entered scores."""
    roster = await ExamService.get_marks_roster(schedule_id, db)
    return success_response(data=roster)


@router.post("/schedules/{schedule_id}/marks", dependencies=[Depends(RequirePermission("academics:manage"))])
async def submit_marks_grid(
    schedule_id: str,
    req: SubmitMarksGridRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Teacher Action: Saves batch subject marks for the entire class."""
    req.exam_schedule_id = schedule_id
    count = await ExamService.submit_marks_grid(req, db)
    return success_response(data={"records_updated": count}, message=f"Marks saved for {count} students")


@router.get("/terms/{term_id}/students/{student_id}/report-card", dependencies=[Depends(RequirePermission("academics:manage"))])
async def get_student_report_card_data(
    term_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Compiles complete term report card including marks, grades, qualitative ratings, and attendance."""
    report = await ExamService.compile_student_term_report(
        exam_term_id=term_id,
        student_id=student_id,
        db=db,
    )
    return success_response(data=report)
