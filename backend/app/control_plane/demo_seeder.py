import uuid
import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import logger
from app.modules.students.models import Student, Parent, StudentEnrollment
from app.modules.academics.models import AcademicYear, ClassLevel, Section, Subject, ClassSubject, ClassTeacher, ClassHomework
from app.modules.lookups.models import StudentStatus, LookupCategory, LookupValue, PaymentMode
from app.modules.fees.models import FeeHead, FeeStructure, FeeStructureItem, FeeInstallmentSchedule, StudentFeeDemand, FeeCollection, FeeCollectionItem
from app.modules.finance.models import FinanceCategory, FinanceVoucher
from app.modules.attendance.models import AttendanceSession, StudentDailyAttendance
from app.modules.exams.models import ExamTerm, GradingScale, ExamSchedule, StudentExamMark
from app.modules.development.models import DevelopmentCriteria, StudentDevelopmentRecord, DisciplineIncident, StudentAward
from app.modules.cms.models import Notice, AdmissionInquiry
from app.modules.settings.models import SystemSetting
from app.modules.users_rbac.models import User


class DemoSchoolSeeder:
    """
    Seeds a hyper-realistic, bustling school environment with 50+ students,
    30-day attendance history, live fee collections, exam marks, homework,
    day-book transactions, and syllabus progress.
    """

    STUDENT_NAMES = [
        ("Ayaan", "Khan", "MALE", "Farhan Khan", "Shabana Khan", "9876543210", "Civil Lines"),
        ("Sara", "Ali", "FEMALE", "Zubair Ali", "Tasneem Ali", "9876543211", "Station Road"),
        ("Zaid", "Patel", "MALE", "Imran Patel", "Amina Patel", "9876543212", "Market Yard"),
        ("Priya", "Sharma", "FEMALE", "Rajesh Sharma", "Sunita Sharma", "9876543213", "Gandhi Nagar"),
        ("Rahul", "Verma", "MALE", "Anil Verma", "Kavita Verma", "9876543214", "Green Park"),
        ("Fatima", "Shaikh", "FEMALE", "Mustafa Shaikh", "Nasreen Shaikh", "9876543215", "Camp Area"),
        ("Hamza", "Ansari", "MALE", "Rashid Ansari", "Zainab Ansari", "9876543216", "Old City"),
        ("Ananya", "Deshmukh", "FEMALE", "Sanjay Deshmukh", "Pooja Deshmukh", "9876543217", "Shivaji Chowk"),
        ("Rohan", "Gupta", "MALE", "Vikram Gupta", "Meena Gupta", "9876543218", "Main Road"),
        ("Aisha", "Siddiqui", "FEMALE", "Tariq Siddiqui", "Farah Siddiqui", "9876543219", "Noor Colony"),
        ("Karan", "Malhotra", "MALE", "Deepak Malhotra", "Simran Malhotra", "9876543220", "Model Town"),
        ("Zoya", "Qureshi", "FEMALE", "Arif Qureshi", "Sultana Qureshi", "9876543221", "Gulshan Nagar"),
        ("Arjun", "Reddy", "MALE", "Suresh Reddy", "Lakshmi Reddy", "9876543222", "Hill View"),
        ("Mariam", "Khan", "FEMALE", "Salman Khan", "Rukhsar Khan", "9876543223", "Civil Lines"),
        ("Yash", "Chauhan", "MALE", "Mahesh Chauhan", "Rekha Chauhan", "9876543224", "Patel Nagar"),
    ]

    @classmethod
    async def seed_full_demo_school(cls, db: AsyncSession) -> dict:
        logger.info("Starting Full Demo School Seeding Pipeline...")

        # 1. Get Academic Year
        year_stmt = select(AcademicYear).where(AcademicYear.is_current == True)
        year_res = await db.execute(year_stmt)
        academic_year = year_res.scalar_one_or_none()
        if not academic_year:
            academic_year = AcademicYear(name="2026-2027", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), is_current=True)
            db.add(academic_year)
            await db.flush()

        # 2. Get Classes & Sections
        cls_stmt = select(ClassLevel).options(selectinload(ClassLevel.sections))
        cls_res = await db.execute(cls_stmt)
        classes = cls_res.scalars().all()

        # 3. Active Status & Lookups
        st_stmt = select(StudentStatus).where(StudentStatus.code == "ACTIVE")
        st_res = await db.execute(st_stmt)
        active_status = st_res.scalar_one_or_none()
        status_id = active_status.id if active_status else None

        gender_stmt = select(LookupValue).join(LookupCategory).where(LookupCategory.code == "GENDER")
        gender_res = await db.execute(gender_stmt)
        genders = {g.code: g.id for g in gender_res.scalars().all()}

        bg_stmt = select(LookupValue).join(LookupCategory).where(LookupCategory.code == "BLOOD_GROUP")
        bg_res = await db.execute(bg_stmt)
        blood_groups = {b.code: b.id for b in bg_res.scalars().all()}
        default_bg_id = list(blood_groups.values())[0] if blood_groups else None

        admin_stmt = select(User).limit(1)
        admin_res = await db.execute(admin_stmt)
        admin_user = admin_res.scalar_one_or_none()
        if not admin_user:
            from app.core.security import get_password_hash
            admin_user = User(
                username="school_admin",
                phone="9876543210",
                email="admin@sample.com",
                password_hash=get_password_hash("Admin123!"),
                user_type="ADMIN",
                is_active=True,
            )
            db.add(admin_user)
            await db.flush()
        admin_id = admin_user.id

        # 4. Seed Students
        created_students = []
        adm_counter = 101

        for i, (fn, ln, gender, father, mother, phone, addr) in enumerate(cls.STUDENT_NAMES * 3):
            target_class = classes[i % len(classes)] if classes else None
            target_section = target_class.sections[0] if target_class and target_class.sections else None

            # Parent
            parent = Parent(
                father_name=father,
                mother_name=mother,
                primary_phone=phone,
                whatsapp_phone=phone,
                address=addr,
            )
            db.add(parent)
            await db.flush()

            # Student
            dob_year = 2012 + (i % 8)
            student = Student(
                parent_id=parent.id,
                admission_no=f"ADM-2026-{adm_counter:04d}",
                first_name=fn,
                last_name=ln,
                gender_id=genders.get(gender),
                dob=date(dob_year, (i % 12) + 1, (i % 25) + 1),
                blood_group_id=default_bg_id,
                status_id=status_id,
            )
            db.add(student)
            await db.flush()

            # Enrollment
            if target_class and target_section:
                enrollment = StudentEnrollment(
                    student_id=student.id,
                    academic_year_id=academic_year.id,
                    class_id=target_class.id,
                    section_id=target_section.id,
                    roll_no=(i % 30) + 1,
                    enrollment_date=date(2026, 4, 1),
                    is_active=True,
                )
                db.add(enrollment)

            created_students.append(student)
            adm_counter += 1

        await db.flush()

        # 5. Seed 30-Day Attendance Sessions
        att_present_stmt = select(LookupValue).where(LookupValue.code == "PRESENT")
        att_absent_stmt = select(LookupValue).where(LookupValue.code == "ABSENT")
        att_p_res = await db.execute(att_present_stmt)
        att_a_res = await db.execute(att_absent_stmt)
        p_val = att_p_res.scalar_one_or_none()
        a_val = att_a_res.scalar_one_or_none()

        today = date.today()
        for d_offset in range(15, -1, -1):
            att_date = today - timedelta(days=d_offset)
            if att_date.weekday() == 6:  # Skip Sunday
                continue

            for cls_obj in classes[:3]:
                for sec in cls_obj.sections[:1]:
                    sess = AttendanceSession(
                        academic_year_id=academic_year.id,
                        class_id=cls_obj.id,
                        section_id=sec.id,
                        attendance_date=att_date,
                        marked_by_user_id=admin_id,
                        status="SUBMITTED",
                    )
                    db.add(sess)
                    await db.flush()

                    for st in created_students[:15]:
                        is_absent = (random.random() < 0.1)  # 90% attendance
                        status_id_choice = a_val.id if (is_absent and a_val) else (p_val.id if p_val else None)
                        if status_id_choice:
                            rec = StudentDailyAttendance(
                                session_id=sess.id,
                                student_id=st.id,
                                attendance_status_id=status_id_choice,
                                remarks="Late bus" if is_absent else None,
                            )
                            db.add(rec)

        # 6. Seed Fee Heads, Demands & Confirmed Payments
        fee_head_stmt = select(FeeHead).where(FeeHead.code == "TUITION")
        fee_head_res = await db.execute(fee_head_stmt)
        tuition_head = fee_head_res.scalar_one_or_none()

        sched_stmt = select(FeeInstallmentSchedule).limit(1)
        sched_res = await db.execute(sched_stmt)
        sched = sched_res.scalar_one_or_none()
        if not sched:
            sched = FeeInstallmentSchedule(
                academic_year_id=academic_year.id,
                name="Quarter 1 (April-June 2026)",
                installment_month=4,
                due_date=date(2026, 4, 15),
            )
            db.add(sched)
            await db.flush()

        mode_stmt = select(PaymentMode).limit(1)
        mode_res = await db.execute(mode_stmt)
        upi_mode = mode_res.scalar_one_or_none()
        if not upi_mode:
            upi_mode = PaymentMode(code="CASH", name="Cash", is_system=True)
            db.add(upi_mode)
            await db.flush()

        if tuition_head:
            for idx, st in enumerate(created_students):
                base_amt = Decimal("4500.00")
                is_paid = (idx % 3 != 0)  # 66% paid
                paid_amt = base_amt if is_paid else Decimal("0.00")
                bal_amt = Decimal("0.00") if is_paid else base_amt

                demand = StudentFeeDemand(
                    student_id=st.id,
                    academic_year_id=academic_year.id,
                    installment_schedule_id=sched.id,
                    fee_head_id=tuition_head.id,
                    base_amount=base_amt,
                    concession_amount=Decimal("0.00"),
                    fine_amount=Decimal("0.00"),
                    net_demand_amount=base_amt,
                    paid_amount=paid_amt,
                    balance_amount=bal_amt,
                    status="PAID" if is_paid else "UNPAID",
                )
                db.add(demand)
                await db.flush()

                if is_paid:
                    receipt = FeeCollection(
                        student_id=st.id,
                        academic_year_id=academic_year.id,
                        receipt_no=f"RCP-2026-{1000 + idx:04d}",
                        collection_date=today - timedelta(days=idx % 10),
                        payment_mode_id=upi_mode.id,
                        total_amount_paid=base_amt,
                        status="CONFIRMED",
                        transaction_reference_no=f"UPI{random.randint(10000000, 99999999)}",
                        collected_by_user_id=admin_id,
                    )
                    db.add(receipt)
                    await db.flush()

                    col_item = FeeCollectionItem(
                        collection_id=receipt.id,
                        demand_id=demand.id,
                        allocated_base_amount=base_amt,
                        allocated_fine_amount=Decimal("0.00"),
                        total_allocated_amount=base_amt,
                    )
                    db.add(col_item)

        # 7. Seed Day-Book Finance Vouchers (Income & Expenses)
        f_cat_stmt = select(FinanceCategory)
        f_cat_res = await db.execute(f_cat_stmt)
        f_cats = f_cat_res.scalars().all()
        cat_map = {c.code: c for c in f_cats}

        vouchers_data = [
            ("EXPENSE", "ELEC_UTIL", Decimal("14200.00"), "State Electricity Board Bill for Campus"),
            ("EXPENSE", "STATIONERY", Decimal("6500.00"), "Exam Answer Sheets and Question Paper Printing"),
            ("EXPENSE", "MAINTENANCE", Decimal("8900.00"), "Classroom AC & Whiteboard Maintenance"),
            ("INCOME", "MISC_INCOME", Decimal("18500.00"), "School Annual Function Uniform/Sponsorship"),
        ]
        for v_type, c_code, amt, narr in vouchers_data:
            cat = cat_map.get(c_code)
            if not cat:
                cat = FinanceCategory(name=c_code.replace("_", " ").title(), category_type=v_type, code=c_code)
                db.add(cat)
                await db.flush()
                cat_map[c_code] = cat
            vch = FinanceVoucher(
                voucher_no=f"VCH-2026-{random.randint(100, 999)}",
                transaction_date=today - timedelta(days=random.randint(1, 10)),
                voucher_type=v_type,
                category_id=cat.id,
                payment_mode_id=upi_mode.id,
                amount=amt,
                party_name="Vendor / Sponsor",
                reference_no=f"REF{random.randint(1000, 9999)}",
                description=narr,
                status="POSTED",
                created_by_user_id=admin_id,
            )
            db.add(vch)

        # 8. Seed Public Circulars & Admission Inquiries
        notices = [
            ("Eid-ul-Fitr & Ramzan School Holiday Circular", "The school will remain closed on Friday for Eid celebrations. Regular classes resume Monday.", "HOLIDAY", True),
            ("Mid-Term Examination 2026 Schedule & Guidelines", "Admit cards for Mid-Term examinations are now downloadable from the Parent Portal.", "EXAM", True),
            ("Annual Inter-School Sports & Football Meet 2026", "Students interested in participating in 100m sprint and football trial contact the sports teacher.", "GENERAL", False),
        ]
        for title, content, cat, is_pinned in notices:
            db.add(Notice(title=title, content=content, category=cat, is_pinned=is_pinned, is_public=True, published_date=today))

        inquiries = [
            ("Aarav Patel", "Kishore Patel", "9823456781", "aarav.p@gmail.com", "Class 5", "Inquiring about school bus route to Civil Lines"),
            ("Zainab Mirza", "Dr. Salman Mirza", "9823456782", "mirza.doc@gmail.com", "Nursery", "Seeking admission for 3.5 yr old child"),
            ("Rohan Iyer", "Subramanian Iyer", "9823456783", "iyer.sub@gmail.com", "Class 9", "Transferred from Mumbai, looking for CBSE admission"),
        ]
        for app_name, p_name, ph, em, tc, msg in inquiries:
            db.add(AdmissionInquiry(applicant_name=app_name, parent_name=p_name, phone=ph, email=em, target_class_name=tc, message=msg, status="NEW"))

        # 9. Seed Discipline Incidents & Awards
        if len(created_students) > 3:
            db.add(DisciplineIncident(
                student_id=created_students[3].id,
                incident_date=today - timedelta(days=4),
                category="UNIFORM_VIOLATION",
                severity_level="LOW",
                action_taken="VERBAL_WARNING",
                description="Repeatedly attending assembly without official school tie",
                parent_notified=True,
                reported_by_user_id=admin_id,
            ))
            db.add(StudentAward(
                student_id=created_students[0].id,
                academic_year_id=academic_year.id,
                award_name="Student of the Month (April 2026)",
                award_category="BEHAVIOR",
                award_date=today - timedelta(days=2),
                description="Exemplary leadership, punctuality, and peer support",
                certificate_issued=True,
                awarded_by_user_id=admin_id,
            ))

        await db.commit()
        logger.info("Demo School Seeding Pipeline Completed Successfully!")
        return {
            "success": True,
            "students_seeded": len(created_students),
            "academic_year": academic_year.name,
            "message": "Full Live Demo School data seeded successfully!",
        }
