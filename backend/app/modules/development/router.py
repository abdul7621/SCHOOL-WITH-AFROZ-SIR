from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission, CurrentTenantUser, get_current_user
from app.modules.students.models import Student, StudentEnrollment
from app.modules.development.models import (
    DevelopmentCriteria,
    DevelopmentScale,
    DevelopmentRule,
    StudentDevelopmentRecord,
)
from app.modules.development.schemas import (
    DevelopmentCriteriaCreate,
    DevelopmentScaleCreate,
    DevelopmentRuleCreate,
    SubmitDevelopmentEvaluationsRequest,
)

router = APIRouter(prefix="/development", tags=["Qualitative Development & Behavioral Assessment"])


@router.get("/criteria", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def list_criteria(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all qualitative assessment criteria (e.g. Cleanliness, Discipline, Leadership)."""
    stmt = select(DevelopmentCriteria).where(DevelopmentCriteria.is_active == True).order_by(DevelopmentCriteria.name.asc())
    result = await db.execute(stmt)
    criteria = result.scalars().all()
    return success_response(
        data=[{"id": c.id, "name": c.name, "code": c.code, "description": c.description} for c in criteria]
    )


@router.post("/criteria", dependencies=[Depends(RequirePermission("settings:manage"))], status_code=status.HTTP_201_CREATED)
async def create_criteria(req: DevelopmentCriteriaCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new qualitative assessment metric."""
    crit = DevelopmentCriteria(
        name=req.name,
        code=req.code.upper(),
        description=req.description,
        is_active=req.is_active,
    )
    db.add(crit)
    await db.commit()
    await db.refresh(crit)
    return success_response(data={"id": crit.id, "name": crit.name}, message="Criteria created successfully")


@router.get("/scales", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def list_scales(db: AsyncSession = Depends(get_tenant_db)):
    """Lists qualitative rating scale configurations (e.g. 5-Star, Letter Grade)."""
    stmt = select(DevelopmentScale).order_by(DevelopmentScale.name.asc())
    result = await db.execute(stmt)
    scales = result.scalars().all()
    return success_response(
        data=[{"id": s.id, "name": s.name, "scale_type": s.scale_type, "options": s.options} for s in scales]
    )


@router.post("/scales", dependencies=[Depends(RequirePermission("settings:manage"))], status_code=status.HTTP_201_CREATED)
async def create_scale(req: DevelopmentScaleCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new qualitative rating scale."""
    scale = DevelopmentScale(
        name=req.name,
        scale_type=req.scale_type,
        options=req.options,
    )
    db.add(scale)
    await db.commit()
    await db.refresh(scale)
    return success_response(data={"id": scale.id, "name": scale.name}, message="Rating scale created successfully")


@router.get("/evaluations/roster", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def get_evaluation_roster(
    academic_year_id: str = Query(...),
    class_id: str = Query(...),
    section_id: str = Query(...),
    evaluation_period: str = Query(..., example="Term-1"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Teacher Evaluation Sheet: Returns enrolled students and all active
    qualitative criteria with existing recorded ratings for that period.
    """
    # 1. Enrolled students
    st_stmt = (
        select(Student, StudentEnrollment)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .where(
            StudentEnrollment.academic_year_id == academic_year_id,
            StudentEnrollment.class_id == class_id,
            StudentEnrollment.section_id == section_id,
            StudentEnrollment.is_active == True,
        )
        .order_by(StudentEnrollment.roll_no.asc())
    )
    st_res = await db.execute(st_stmt)
    students = st_res.all()

    # 2. Active Criteria
    crit_stmt = select(DevelopmentCriteria).where(DevelopmentCriteria.is_active == True).order_by(DevelopmentCriteria.name.asc())
    crit_res = await db.execute(crit_stmt)
    criteria = crit_res.scalars().all()

    # 3. Existing Records
    rec_stmt = select(StudentDevelopmentRecord).where(
        StudentDevelopmentRecord.academic_year_id == academic_year_id,
        StudentDevelopmentRecord.evaluation_period == evaluation_period,
    )
    rec_res = await db.execute(rec_stmt)
    records = rec_res.scalars().all()
    rec_map = {(r.student_id, r.criteria_id): r for r in records}

    student_list = []
    for st, enroll in students:
        evals = {}
        for c in criteria:
            r = rec_map.get((st.id, c.id))
            evals[c.id] = {
                "rating_value": r.rating_value if r else None,
                "remarks": r.remarks if r else None,
            }

        student_list.append({
            "student_id": st.id,
            "admission_no": st.admission_no,
            "student_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "roll_no": enroll.roll_no,
            "evaluations": evals,
        })

    return success_response(
        data={
            "evaluation_period": evaluation_period,
            "criteria": [{"id": c.id, "name": c.name, "code": c.code} for c in criteria],
            "students": student_list,
        }
    )


@router.post("/evaluations", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def submit_evaluations(
    req: SubmitDevelopmentEvaluationsRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Teacher Action: Saves batch qualitative ratings for students."""
    count = 0
    for item in req.evaluations:
        stmt = select(StudentDevelopmentRecord).where(
            StudentDevelopmentRecord.student_id == item.student_id,
            StudentDevelopmentRecord.academic_year_id == req.academic_year_id,
            StudentDevelopmentRecord.criteria_id == item.criteria_id,
            StudentDevelopmentRecord.evaluation_period == req.evaluation_period,
        )
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()

        if record:
            record.rating_value = item.rating_value
            record.remarks = item.remarks
            record.evaluated_by_staff_id = current_user.id
        else:
            record = StudentDevelopmentRecord(
                student_id=item.student_id,
                academic_year_id=req.academic_year_id,
                criteria_id=item.criteria_id,
                rating_value=item.rating_value,
                remarks=item.remarks,
                evaluated_by_staff_id=current_user.id,
                evaluation_period=req.evaluation_period,
            )
            db.add(record)
        count += 1

    await db.commit()
    return success_response(data={"evaluations_saved": count}, message=f"Saved {count} qualitative evaluation ratings")


# ==============================================================================
# Discipline Management (Proposal Section 12)
# ==============================================================================
@router.post("/discipline/incidents", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def report_discipline_incident(
    req: DisciplineIncidentCreate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Logs a student disciplinary incident with severity and action taken."""
    from datetime import datetime, date
    inc_date = date.today()
    if req.incident_date:
        inc_date = datetime.strptime(req.incident_date, "%Y-%m-%d").date()

    incident = DisciplineIncident(
        student_id=req.student_id,
        incident_date=inc_date,
        category=req.category,
        severity_level=req.severity_level,
        action_taken=req.action_taken,
        description=req.description,
        parent_notified=req.parent_notified,
        reported_by_user_id=current_user.id,
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return success_response(data={"incident_id": incident.id}, message="Disciplinary incident recorded successfully.")


@router.get("/discipline/incidents", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def list_discipline_incidents(
    student_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Retrieves disciplinary history records."""
    stmt = (
        select(DisciplineIncident)
        .options(
            selectinload(DisciplineIncident.student),
            selectinload(DisciplineIncident.reported_by),
        )
        .order_by(DisciplineIncident.incident_date.desc())
    )
    if student_id:
        stmt = stmt.where(DisciplineIncident.student_id == student_id)

    res = await db.execute(stmt)
    records = res.scalars().all()
    return success_response(
        data=[
            {
                "id": r.id,
                "student_id": r.student_id,
                "student_name": f"{r.student.first_name} {r.student.last_name or ''}".strip() if r.student else "-",
                "incident_date": str(r.incident_date),
                "category": r.category,
                "severity_level": r.severity_level,
                "action_taken": r.action_taken,
                "description": r.description,
                "parent_notified": r.parent_notified,
                "reported_by": r.reported_by.username if r.reported_by else "Staff",
            }
            for r in records
        ]
    )


# ==============================================================================
# Awards & Recognitions (Proposal Section 13)
# ==============================================================================
@router.post("/awards", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def grant_student_award(
    req: StudentAwardCreate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Grants student achievement award / Student of the Month."""
    from datetime import datetime, date
    aw_date = date.today()
    if req.award_date:
        aw_date = datetime.strptime(req.award_date, "%Y-%m-%d").date()

    award = StudentAward(
        student_id=req.student_id,
        academic_year_id=req.academic_year_id,
        award_name=req.award_name,
        award_category=req.award_category,
        award_date=aw_date,
        description=req.description,
        certificate_issued=req.certificate_issued,
        awarded_by_user_id=current_user.id,
    )
    db.add(award)
    await db.commit()
    await db.refresh(award)
    return success_response(data={"award_id": award.id}, message="Award conferred successfully.")


@router.get("/awards", dependencies=[Depends(RequirePermission("development:evaluate"))])
async def list_student_awards(
    student_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists awarded students and achievements."""
    stmt = (
        select(StudentAward)
        .options(
            selectinload(StudentAward.student),
            selectinload(StudentAward.awarded_by),
        )
        .order_by(StudentAward.award_date.desc())
    )
    if student_id:
        stmt = stmt.where(StudentAward.student_id == student_id)

    res = await db.execute(stmt)
    records = res.scalars().all()
    return success_response(
        data=[
            {
                "id": a.id,
                "student_id": a.student_id,
                "student_name": f"{a.student.first_name} {a.student.last_name or ''}".strip() if a.student else "-",
                "award_name": a.award_name,
                "award_category": a.award_category,
                "award_date": str(a.award_date),
                "description": a.description,
                "certificate_issued": a.certificate_issued,
                "awarded_by": a.awarded_by.username if a.awarded_by else "Principal",
            }
            for a in records
        ]
    )

