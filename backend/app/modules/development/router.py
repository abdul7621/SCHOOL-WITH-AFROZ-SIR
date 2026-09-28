from typing import List, Optional
from datetime import date, datetime
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
    DisciplineIncident,
    StudentAward,
    StudentDailyHabit,
    PrincipalActionItem,
    NotebookCorrectionAudit,
)
from app.modules.development.schemas import (
    DevelopmentCriteriaCreate,
    DevelopmentScaleCreate,
    DevelopmentRuleCreate,
    SubmitDevelopmentEvaluationsRequest,
    DisciplineIncidentCreate,
    StudentAwardCreate,
    SubmitDailyHabitsRequest,
    PrincipalActionItemCreate,
    PrincipalActionItemStatusUpdate,
    NotebookCorrectionAuditCreate,
    ConferHonorAwardRequest,
)
from app.modules.development.services import HabitService, PmrService


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


# ==============================================================================
# Module 1: 60-Second 9-Point Daily Habit & Discipline Engine
# ==============================================================================

@router.get("/habits/grid")
async def get_daily_habit_grid(
    academic_year_id: Optional[str] = Query(None),
    class_id: str = Query(...),
    section_id: str = Query(...),
    habit_date: date = Query(default_factory=date.today),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Teacher 60-Second Fast Grid: Returns class roster initialized at 9/9
    with today's attendance sync and pre-existing habit exception flags.
    """
    grid = await HabitService.get_daily_habit_grid(
        academic_year_id=academic_year_id,
        class_id=class_id,
        section_id=section_id,
        habit_date=habit_date,
        db=db,
    )
    return success_response(data=grid)


@router.post("/habits/submit")
async def submit_daily_habits(
    req: SubmitDailyHabitsRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Fast Grid Batch Submit: Atomically saves daily habit exceptions and scores.
    """
    result = await HabitService.submit_daily_habits(
        req=req,
        recorded_by_user_id=current_user.id,
        db=db,
    )
    return success_response(
        data=result,
        message=f"Successfully marked 9-Point Habits for {result['saved_count']} students."
    )


@router.get("/habits/student/{student_id}/journal")
async def get_student_habit_journal(
    student_id: str,
    days: int = Query(30, ge=1, le=180),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Parent & Student Habit Journal: Returns streak, weekly average score,
    frequent exceptions, and day-by-day habit evaluation history.
    """
    journal = await HabitService.get_student_habit_journal(
        student_id=student_id,
        db=db,
        days=days,
    )
    return success_response(data=journal)


@router.get("/habits/school-radar")
async def get_school_habit_radar(
    academic_year_id: Optional[str] = Query(None),
    target_date: Optional[date] = Query(None),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Principal Habit Radar Heatmap: Returns school-wide Class Habit Index (CHI),
    dimension compliance rates, red alerts (<6/9), and Friday Assembly Honor Roll.
    """
    radar = await HabitService.get_school_habit_radar(
        academic_year_id=academic_year_id,
        target_date=target_date,
        db=db,
    )
    return success_response(data=radar)


# ==========================================
# Module 2 Bridge: 1-Click Honor Roll Award Conferral
# ==========================================
@router.post("/awards/confer-honor")
async def confer_honor_roll_award(
    req: ConferHonorAwardRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    1-Click Bridge: Automatically confers official award and generates certificate
    for a top-performing student from the Friday Assembly Honor Roll.
    """
    from app.modules.academics.models import AcademicYear

    ay_id = req.academic_year_id
    if not ay_id:
        ay_res = await db.execute(select(AcademicYear.id).where(AcademicYear.is_current == True))
        ay_id = ay_res.scalar_one_or_none()
        if not ay_id:
            ay_res = await db.execute(select(AcademicYear.id).order_by(AcademicYear.start_date.desc()))
            ay_id = ay_res.scalar_one_or_none()

    award_date_obj = datetime.strptime(req.award_date, "%Y-%m-%d").date() if req.award_date else date.today()

    award = StudentAward(
        student_id=req.student_id,
        academic_year_id=ay_id or "ay_default",
        award_name=req.award_name,
        award_category=req.award_category,
        award_date=award_date_obj,
        description=req.description,
        certificate_issued=True,
        awarded_by_user_id=current_user.id,
    )
    db.add(award)
    await db.commit()
    await db.refresh(award)

    return success_response(
        data={
            "award_id": award.id,
            "student_id": award.student_id,
            "award_name": award.award_name,
            "award_date": str(award.award_date),
            "certificate_url": f"/api/v1/documents/award-certificate/{award.id}/html",
        },
        message=f"Award '{award.award_name}' successfully conferred. Certificate generated.",
    )


# ==========================================
# Module 4: Principal Monitoring Report (PMR) Scorecard
# ==========================================
@router.get("/pmr/weekly-scorecard")
async def get_weekly_pmr_scorecard(
    academic_year_id: Optional[str] = Query(None),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    PMR Executive Scorecard: Returns attendance velocity, fee pace, habit health,
    notebook audit quality score, and action item overdue telemetry.
    """
    scorecard = await PmrService.get_weekly_pmr_scorecard(
        academic_year_id=academic_year_id,
        db=db,
    )
    return success_response(data=scorecard)


# ==========================================
# Module 4: Executive Action Items Tracker
# ==========================================
@router.get("/action-items")
async def list_action_items(
    status_filter: Optional[str] = Query(None),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists executive administrative action items with overdue detection."""
    from app.modules.users_rbac.models import User

    stmt = (
        select(PrincipalActionItem)
        .options(selectinload(PrincipalActionItem.assigned_to))
        .order_by(PrincipalActionItem.deadline.asc())
    )
    if status_filter:
        stmt = stmt.where(PrincipalActionItem.status == status_filter.upper())

    res = await db.execute(stmt)
    items = res.scalars().all()

    today = date.today()
    results = []
    for item in items:
        is_overdue = item.status != "RESOLVED" and item.deadline < today
        eff_status = "OVERDUE" if is_overdue and item.status == "OPEN" else item.status

        assigned_name = "Assigned Staff"
        if item.assigned_to:
            assigned_name = item.assigned_to.username.replace("_", " ").title()

        results.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "category": item.category,
            "assigned_to_user_id": item.assigned_to_user_id,
            "assigned_to_name": assigned_name,
            "deadline": str(item.deadline),
            "status": eff_status,
            "resolution_notes": item.resolution_notes,
            "is_overdue": is_overdue,
            "created_by_user_id": item.created_by_user_id,
            "created_at": str(item.created_at),
        })

    return success_response(data=results)


@router.post("/action-items", status_code=status.HTTP_201_CREATED)
async def create_action_item(
    req: PrincipalActionItemCreate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Principal Action: Logs new institutional action item with assignee & deadline."""
    dl_obj = datetime.strptime(req.deadline, "%Y-%m-%d").date()

    item = PrincipalActionItem(
        title=req.title.strip(),
        description=req.description.strip(),
        category=req.category.upper(),
        assigned_to_user_id=req.assigned_to_user_id,
        deadline=dl_obj,
        status="OPEN",
        created_by_user_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return success_response(data={"id": item.id, "title": item.title}, message="Action item logged successfully.")


@router.patch("/action-items/{item_id}/status")
async def update_action_item_status(
    item_id: str,
    req: PrincipalActionItemStatusUpdate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Updates action item status ('IN_PROGRESS', 'RESOLVED') and resolution notes."""
    stmt = select(PrincipalActionItem).where(PrincipalActionItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise ResourceNotFoundException("PrincipalActionItem", item_id)

    item.status = req.status.upper()
    if req.resolution_notes:
        item.resolution_notes = req.resolution_notes.strip()

    await db.commit()
    await db.refresh(item)
    return success_response(data={"id": item.id, "status": item.status}, message="Action item status updated.")


@router.delete("/action-items/{item_id}")
async def delete_action_item(
    item_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Deletes an action item."""
    stmt = select(PrincipalActionItem).where(PrincipalActionItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise ResourceNotFoundException("PrincipalActionItem", item_id)

    await db.delete(item)
    await db.commit()
    return success_response(data={"id": item_id}, message="Action item deleted successfully.")


# ==========================================
# Module 4: Notebook / Workbook Correction Audits
# ==========================================
@router.post("/notebook-audits", status_code=status.HTTP_201_CREATED)
async def create_notebook_correction_audit(
    req: NotebookCorrectionAuditCreate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Quality Audit Sampling: Records 5-notebook random correction audit
    scored across 5 rubric criteria (0 to 10 each = 50 pts total).
    """
    from app.modules.academics.models import AcademicYear

    ay_id = req.academic_year_id
    if not ay_id:
        ay_res = await db.execute(select(AcademicYear.id).where(AcademicYear.is_current == True))
        ay_id = ay_res.scalar_one_or_none()
        if not ay_id:
            ay_res = await db.execute(select(AcademicYear.id).order_by(AcademicYear.start_date.desc()))
            ay_id = ay_res.scalar_one_or_none()

    audit_dt = datetime.strptime(req.audit_date, "%Y-%m-%d").date() if req.audit_date else date.today()

    total_pts = (
        req.index_score
        + req.date_score
        + req.red_pen_correction_score
        + req.spelling_correction_score
        + req.teacher_signature_score
    )
    score_pct = round((total_pts / 50.0) * 100.0, 1)

    audit = NotebookCorrectionAudit(
        academic_year_id=ay_id or "ay_default",
        class_id=req.class_id,
        section_id=req.section_id,
        subject_id=req.subject_id,
        teacher_user_id=req.teacher_user_id,
        audit_date=audit_dt,
        notebooks_checked_count=req.notebooks_checked_count,
        index_score=req.index_score,
        date_score=req.date_score,
        red_pen_correction_score=req.red_pen_correction_score,
        spelling_correction_score=req.spelling_correction_score,
        teacher_signature_score=req.teacher_signature_score,
        total_score_pct=score_pct,
        auditor_user_id=current_user.id,
        remarks=req.remarks.strip() if req.remarks else None,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    return success_response(
        data={"id": audit.id, "total_score_pct": score_pct},
        message=f"Notebook correction audit logged successfully (Score: {score_pct}%).",
    )


@router.get("/notebook-audits")
async def list_notebook_correction_audits(
    teacher_id: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists recent notebook quality audits with teacher scores."""
    from app.modules.users_rbac.models import User
    from app.modules.academics.models import ClassLevel, Section, Subject

    stmt = (
        select(NotebookCorrectionAudit)
        .options(
            selectinload(NotebookCorrectionAudit.teacher),
            selectinload(NotebookCorrectionAudit.class_level),
            selectinload(NotebookCorrectionAudit.section),
            selectinload(NotebookCorrectionAudit.subject),
        )
        .order_by(NotebookCorrectionAudit.audit_date.desc(), NotebookCorrectionAudit.created_at.desc())
    )
    if teacher_id:
        stmt = stmt.where(NotebookCorrectionAudit.teacher_user_id == teacher_id)
    if class_id:
        stmt = stmt.where(NotebookCorrectionAudit.class_id == class_id)

    res = await db.execute(stmt)
    audits = res.scalars().all()

    items = []
    for a in audits:
        pct = float(a.total_score_pct)
        grade = "A (Exemplary)" if pct >= 85 else ("B (Good)" if pct >= 70 else ("C (Needs Focus)" if pct >= 50 else "D (Critical Alert)"))
        teacher_name = a.teacher.username.replace("_", " ").title() if a.teacher else "Staff Teacher"

        items.append({
            "id": a.id,
            "teacher_user_id": a.teacher_user_id,
            "teacher_name": teacher_name,
            "class_name": a.class_level.name if a.class_level else "-",
            "section_name": a.section.name if a.section else "-",
            "subject_name": a.subject.name if a.subject else "-",
            "audit_date": str(a.audit_date),
            "notebooks_checked_count": a.notebooks_checked_count,
            "scores": {
                "index_score": a.index_score,
                "date_score": a.date_score,
                "red_pen_correction": a.red_pen_correction_score,
                "spelling_correction": a.spelling_correction_score,
                "teacher_signature": a.teacher_signature_score,
            },
            "total_score_pct": pct,
            "grade_quality": grade,
            "remarks": a.remarks or "",
        })

    return success_response(data=items)



