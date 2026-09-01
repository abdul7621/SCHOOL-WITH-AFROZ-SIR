from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppException, ResourceNotFoundException
from app.modules.students.models import Student, StudentEnrollment, Parent
from app.modules.academics.models import ClassLevel, Section, Subject, AcademicYear
from app.modules.attendance.models import AttendanceSession, StudentDailyAttendance
from app.modules.development.models import StudentDevelopmentRecord, DevelopmentCriteria
from app.modules.lookups.models import LookupValue
from app.modules.exams.models import (
    ExamTerm,
    GradingScale,
    GradingScaleTier,
    ExamSchedule,
    StudentExamMark,
)
from app.modules.exams.schemas import SubmitMarksGridRequest


class ExamService:
    @staticmethod
    def _calculate_grade_tier(score_percent: Decimal, tiers: List[GradingScaleTier]) -> Tuple[str, str]:
        """Matches percentage to appropriate grading tier (e.g. 95% -> ('A1', 'Outstanding'))."""
        for tier in tiers:
            if Decimal(str(tier.min_score_percent)) <= score_percent <= Decimal(str(tier.max_score_percent)):
                return tier.grade_letter, tier.remarks or ""
        return "F", "Needs Improvement"

    @classmethod
    async def get_marks_roster(cls, exam_schedule_id: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Retrieves the list of enrolled students for an exam schedule,
        including previously entered marks and grading scale details.
        """
        # 1. Fetch Exam Schedule
        stmt = (
            select(ExamSchedule)
            .options(
                selectinload(ExamSchedule.exam_term),
                selectinload(ExamSchedule.class_level),
                selectinload(ExamSchedule.subject),
                selectinload(ExamSchedule.grading_scale).selectinload(GradingScale.tiers),
                selectinload(ExamSchedule.marks),
            )
            .where(ExamSchedule.id == exam_schedule_id)
        )
        res = await db.execute(stmt)
        schedule = res.scalar_one_or_none()
        if not schedule:
            raise ResourceNotFoundException("ExamSchedule", exam_schedule_id)

        # 2. Query enrolled students in this class
        st_stmt = (
            select(Student, StudentEnrollment)
            .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
            .where(
                StudentEnrollment.academic_year_id == schedule.exam_term.academic_year_id,
                StudentEnrollment.class_id == schedule.class_id,
                StudentEnrollment.is_active == True,
            )
            .order_by(StudentEnrollment.roll_no.asc(), Student.first_name.asc())
        )
        st_res = await db.execute(st_stmt)
        enrolled_students = st_res.all()

        # 3. Existing marks mapping
        marks_map = {m.student_id: m for m in schedule.marks}
        tiers = sorted(schedule.grading_scale.tiers, key=lambda x: x.min_score_percent, reverse=True) if schedule.grading_scale else []

        students_roster = []
        for student, enroll in enrolled_students:
            mark_rec = marks_map.get(student.id)
            marks_obtained = Decimal(str(mark_rec.marks_obtained)) if mark_rec and mark_rec.marks_obtained is not None else None
            is_absent = mark_rec.is_absent if mark_rec else False
            remarks = mark_rec.remarks if mark_rec else None

            grade_letter = None
            if marks_obtained is not None and schedule.max_marks > 0 and tiers:
                pct = (marks_obtained / Decimal(str(schedule.max_marks))) * Decimal("100.00")
                grade_letter, _ = cls._calculate_grade_tier(pct, tiers)

            students_roster.append({
                "student_id": student.id,
                "admission_no": student.admission_no,
                "full_name": f"{student.first_name} {student.last_name or ''}".strip(),
                "roll_no": enroll.roll_no,
                "marks_obtained": float(marks_obtained) if marks_obtained is not None else None,
                "is_absent": is_absent,
                "grade_letter": grade_letter,
                "remarks": remarks,
            })

        return {
            "exam_schedule_id": schedule.id,
            "exam_term_name": schedule.exam_term.name,
            "class_name": schedule.class_level.name,
            "subject_name": schedule.subject.name,
            "exam_date": str(schedule.exam_date),
            "max_marks": float(schedule.max_marks),
            "pass_marks": float(schedule.pass_marks),
            "students": students_roster,
        }

    @classmethod
    async def submit_marks_grid(cls, req: SubmitMarksGridRequest, db: AsyncSession) -> int:
        """
        Atomically saves or updates marks obtained by students in an exam schedule.
        """
        sched_stmt = select(ExamSchedule).options(selectinload(ExamSchedule.marks)).where(ExamSchedule.id == req.exam_schedule_id)
        sched_res = await db.execute(sched_stmt)
        schedule = sched_res.scalar_one_or_none()
        if not schedule:
            raise ResourceNotFoundException("ExamSchedule", req.exam_schedule_id)

        max_marks = Decimal(str(schedule.max_marks))
        existing_marks_map = {m.student_id: m for m in schedule.marks}
        updated_count = 0

        for item in req.marks:
            if item.marks_obtained is not None and item.marks_obtained > max_marks:
                raise AppException(f"Marks obtained ({item.marks_obtained}) cannot exceed maximum marks ({max_marks})")

            if item.student_id in existing_marks_map:
                record = existing_marks_map[item.student_id]
                record.marks_obtained = item.marks_obtained if not item.is_absent else None
                record.is_absent = item.is_absent
                record.remarks = item.remarks
            else:
                record = StudentExamMark(
                    exam_schedule_id=schedule.id,
                    student_id=item.student_id,
                    marks_obtained=item.marks_obtained if not item.is_absent else None,
                    is_absent=item.is_absent,
                    remarks=item.remarks,
                )
                db.add(record)
            updated_count += 1

        await db.commit()
        return updated_count

    @classmethod
    async def compile_student_term_report(
        cls,
        exam_term_id: str,
        student_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Compiles complete comprehensive Term Report Card:
        1. Academic subject-wise scores & grades.
        2. Qualitative behavioral assessment ratings (5-Stars/Grades).
        3. Term attendance percentage.
        4. Overall summary stats.
        """
        # 1. Fetch Exam Term & Student details
        term_stmt = select(ExamTerm).where(ExamTerm.id == exam_term_id)
        term_res = await db.execute(term_stmt)
        term = term_res.scalar_one_or_none()
        if not term:
            raise ResourceNotFoundException("ExamTerm", exam_term_id)

        st_stmt = (
            select(Student, StudentEnrollment, ClassLevel, Section, Parent)
            .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
            .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
            .join(Section, StudentEnrollment.section_id == Section.id)
            .join(Parent, Student.parent_id == Parent.id)
            .where(
                Student.id == student_id,
                StudentEnrollment.academic_year_id == term.academic_year_id,
                StudentEnrollment.is_active == True,
            )
        )
        st_res = await db.execute(st_stmt)
        st_row = st_res.first()
        if not st_row:
            raise ResourceNotFoundException("Student Enrollment", student_id)

        student, enroll, cls_lvl, sec, parent = st_row

        # 2. Query all exam schedules in this term for this class
        sched_stmt = (
            select(ExamSchedule)
            .options(
                selectinload(ExamSchedule.subject),
                selectinload(ExamSchedule.grading_scale).selectinload(GradingScale.tiers),
                selectinload(ExamSchedule.marks),
            )
            .where(
                ExamSchedule.exam_term_id == exam_term_id,
                ExamSchedule.class_id == cls_lvl.id,
            )
            .order_by(ExamSchedule.exam_date.asc())
        )
        sched_res = await db.execute(sched_stmt)
        schedules = sched_res.scalars().all()

        subject_scores = []
        total_max_marks = Decimal("0.00")
        total_obtained_marks = Decimal("0.00")
        has_failed = False

        for sched in schedules:
            mark_entry = next((m for m in sched.marks if m.student_id == student.id), None)
            max_m = Decimal(str(sched.max_marks))
            pass_m = Decimal(str(sched.pass_marks))
            total_max_marks += max_m

            marks_val = Decimal(str(mark_entry.marks_obtained)) if mark_entry and mark_entry.marks_obtained is not None else None
            is_absent = mark_entry.is_absent if mark_entry else False

            if marks_val is not None and not is_absent:
                total_obtained_marks += marks_val
                pct = (marks_val / max_m) * Decimal("100.00") if max_m > 0 else Decimal("0.00")
                is_pass = marks_val >= pass_m
                if not is_pass:
                    has_failed = True
            else:
                pct = Decimal("0.00")
                is_pass = False
                has_failed = True

            tiers = sorted(sched.grading_scale.tiers, key=lambda x: x.min_score_percent, reverse=True) if sched.grading_scale else []
            grade_letter, grade_remarks = cls._calculate_grade_tier(pct, tiers) if not is_absent and marks_val is not None else ("AB", "Absent")

            subject_scores.append({
                "subject_code": sched.subject.code,
                "subject_name": sched.subject.name,
                "max_marks": float(max_m),
                "pass_marks": float(pass_m),
                "marks_obtained": float(marks_val) if marks_val is not None else None,
                "percentage": float(pct) if marks_val is not None else 0.0,
                "grade_letter": grade_letter,
                "is_absent": is_absent,
                "is_pass": is_pass,
            })

        overall_percentage = round(float((total_obtained_marks / total_max_marks * 100)), 2) if total_max_marks > 0 else 0.0
        final_result = "FAILED" if has_failed else "PASSED"

        # 3. Attendance Stats in the Term period
        att_stmt = (
            select(LookupValue.code, func.count(StudentDailyAttendance.id))
            .join(AttendanceSession, StudentDailyAttendance.session_id == AttendanceSession.id)
            .join(LookupValue, StudentDailyAttendance.attendance_status_id == LookupValue.id)
            .where(
                StudentDailyAttendance.student_id == student.id,
                AttendanceSession.attendance_date >= term.start_date,
                AttendanceSession.attendance_date <= term.end_date,
            )
            .group_by(LookupValue.code)
        )
        att_res = await db.execute(att_stmt)
        att_counts = {r[0]: r[1] for r in att_res.all()}
        pres_count = att_counts.get("PRESENT", 0) + (att_counts.get("LATE", 0) * 0.5)
        total_working_days = sum(att_counts.values())
        att_pct = round((pres_count / total_working_days * 100), 1) if total_working_days > 0 else 100.0

        # 4. Qualitative Behavioral Assessment Records
        qual_stmt = (
            select(StudentDevelopmentRecord, DevelopmentCriteria)
            .join(DevelopmentCriteria, StudentDevelopmentRecord.criteria_id == DevelopmentCriteria.id)
            .where(
                StudentDevelopmentRecord.student_id == student.id,
                StudentDevelopmentRecord.academic_year_id == term.academic_year_id,
            )
        )
        qual_res = await db.execute(qual_stmt)
        qual_rows = qual_res.all()

        qualitative_evaluations = [
            {
                "criteria_name": crit.name,
                "criteria_code": crit.code,
                "rating_value": rec.rating_value,
                "remarks": rec.remarks,
            }
            for rec, crit in qual_rows
        ]

        return {
            "school_info": {
                "term_name": term.name,
                "session_name": "2026-2027",
            },
            "student_profile": {
                "student_id": student.id,
                "admission_no": student.admission_no,
                "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
                "father_name": parent.father_name,
                "mother_name": parent.mother_name,
                "dob": str(student.dob),
                "class_name": cls_lvl.name,
                "section_name": sec.name,
                "roll_no": enroll.roll_no,
            },
            "subject_scores": subject_scores,
            "summary": {
                "total_max_marks": float(total_max_marks),
                "total_obtained_marks": float(total_obtained_marks),
                "overall_percentage": overall_percentage,
                "result": final_result,
            },
            "attendance": {
                "total_working_days": total_working_days,
                "present_days": pres_count,
                "attendance_percentage": att_pct,
            },
            "qualitative_development": qualitative_evaluations,
        }
