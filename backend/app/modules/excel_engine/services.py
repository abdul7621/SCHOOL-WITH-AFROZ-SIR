import io
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppException
from app.core.security import get_password_hash
from app.modules.users_rbac.models import User, Role, UserRole
from app.modules.students.models import Student, Parent, StudentEnrollment
from app.modules.academics.models import ClassLevel, Section, AcademicYear
from app.modules.lookups.models import StudentStatus, LookupValue
from app.modules.fees.models import StudentFeeDemand, FeeHead, FeeInstallmentSchedule
from app.modules.excel_engine.schemas import ExcelDryRunResponse, DryRunValidationError


class ExcelMigrationService:
    @staticmethod
    def generate_student_import_template() -> bytes:
        """
        Creates a styled, standardized .xlsx template for Bulk Student Admissions.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Students_Import_Template"

        # Headers
        headers = [
            "Admission_No (Required)",
            "First_Name (Required)",
            "Last_Name",
            "Gender (MALE/FEMALE/OTHER)",
            "Date_Of_Birth (YYYY-MM-DD)",
            "Class_Name (Required e.g. Class 1)",
            "Section_Name (Required e.g. Section A)",
            "Roll_No (Optional)",
            "Father_Name (Required)",
            "Mother_Name",
            "Primary_Phone (10-digits Required)",
            "WhatsApp_Phone",
            "Address",
            "Blood_Group (e.g. A+, B+, O+)",
        ]

        # Styling
        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        border = Border(
            left=Side(style='thin', color='E5E7EB'),
            right=Side(style='thin', color='E5E7EB'),
            top=Side(style='thin', color='E5E7EB'),
            bottom=Side(style='thin', color='E5E7EB')
        )

        ws.append(headers)
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 24

        # Sample Row
        sample_row = [
            "ADM-2026-0001",
            "Ayaan",
            "Khan",
            "MALE",
            "2015-05-14",
            "Class 5",
            "Section A",
            1,
            "Farhan Khan",
            "Shabana Khan",
            "9876543210",
            "9876543210",
            "12/A Civil Lines, City",
            "O+",
        ]
        ws.append(sample_row)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()

    @classmethod
    async def dry_run_student_import(
        cls,
        file_bytes: bytes,
        academic_year_id: str,
        db: AsyncSession,
    ) -> ExcelDryRunResponse:
        """
        Parses Excel, performs deep schema and database constraint validation,
        and returns a dry-run validation preview without altering the DB.
        """
        try:
            wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
            ws = wb.active
        except Exception as e:
            raise AppException(f"Invalid Excel format or corrupted file: {str(e)}")

        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            return ExcelDryRunResponse(
                total_rows=0,
                valid_rows_count=0,
                invalid_rows_count=0,
                can_proceed=False,
                errors=[DryRunValidationError(row_number=1, field="file", value="", error_message="Excel file has no data rows")],
            )

        # 1. Preload DB caches for fast validation
        cls_stmt = select(ClassLevel).options(selectinload(ClassLevel.sections))
        cls_res = await db.execute(cls_stmt)
        classes = cls_res.scalars().all()
        class_map = {c.name.strip().lower(): c for c in classes}

        adm_stmt = select(Student.admission_no)
        adm_res = await db.execute(adm_stmt)
        existing_admission_nos = set(adm_res.scalars().all())

        errors: List[DryRunValidationError] = []
        preview_data: List[Dict[str, Any]] = []
        seen_admissions_in_file = set()

        for idx, row in enumerate(rows[1:], start=2):
            if not row or all(v is None for v in row):
                continue  # Skip empty lines

            adm_no = str(row[0]).strip() if row[0] is not None else ""
            first_name = str(row[1]).strip() if row[1] is not None else ""
            last_name = str(row[2]).strip() if row[2] is not None else ""
            gender = str(row[3]).strip().upper() if row[3] is not None else "MALE"
            dob_raw = row[4]
            class_name = str(row[5]).strip() if row[5] is not None else ""
            section_name = str(row[6]).strip() if row[6] is not None else ""
            roll_no = int(row[7]) if row[7] is not None and str(row[7]).isdigit() else None
            father_name = str(row[8]).strip() if row[8] is not None else ""
            mother_name = str(row[9]).strip() if row[9] is not None else ""
            phone = str(row[10]).strip() if row[10] is not None else ""
            wa_phone = str(row[11]).strip() if row[11] is not None else phone
            address = str(row[12]).strip() if row[12] is not None else ""
            blood_group = str(row[13]).strip().upper() if row[13] is not None else ""

            row_has_error = False

            # Validations
            if not adm_no:
                errors.append(DryRunValidationError(row_number=idx, field="Admission_No", value="", error_message="Admission No is mandatory"))
                row_has_error = True
            elif adm_no in existing_admission_nos:
                errors.append(DryRunValidationError(row_number=idx, field="Admission_No", value=adm_no, error_message=f"Admission No '{adm_no}' already exists in School Database"))
                row_has_error = True
            elif adm_no in seen_admissions_in_file:
                errors.append(DryRunValidationError(row_number=idx, field="Admission_No", value=adm_no, error_message=f"Duplicate Admission No '{adm_no}' found in this Excel sheet"))
                row_has_error = True
            else:
                seen_admissions_in_file.add(adm_no)

            if not first_name:
                errors.append(DryRunValidationError(row_number=idx, field="First_Name", value="", error_message="First Name is required"))
                row_has_error = True

            if not father_name:
                errors.append(DryRunValidationError(row_number=idx, field="Father_Name", value="", error_message="Father Name is required"))
                row_has_error = True

            if not phone or len(phone) < 10:
                errors.append(DryRunValidationError(row_number=idx, field="Primary_Phone", value=phone, error_message="Valid 10-digit primary phone is required"))
                row_has_error = True

            # Class & Section Check
            matched_class = class_map.get(class_name.lower())
            matched_section = None
            if not matched_class:
                errors.append(DryRunValidationError(row_number=idx, field="Class_Name", value=class_name, error_message=f"Class '{class_name}' does not exist in Academics master"))
                row_has_error = True
            else:
                matched_section = next((s for s in matched_class.sections if s.name.strip().lower() == section_name.lower()), None)
                if not matched_section:
                    errors.append(DryRunValidationError(row_number=idx, field="Section_Name", value=section_name, error_message=f"Section '{section_name}' not found under '{matched_class.name}'"))
                    row_has_error = True

            # Parse DOB
            dob = None
            if isinstance(dob_raw, (date, datetime)):
                dob = dob_raw.date() if isinstance(dob_raw, datetime) else dob_raw
            elif isinstance(dob_raw, str) and dob_raw.strip():
                try:
                    dob = datetime.strptime(dob_raw.strip(), "%Y-%m-%d").date()
                except ValueError:
                    errors.append(DryRunValidationError(row_number=idx, field="Date_Of_Birth", value=dob_raw, error_message="DOB must be in YYYY-MM-DD format"))
                    row_has_error = True

            preview_data.append({
                "row_number": idx,
                "admission_no": adm_no,
                "full_name": f"{first_name} {last_name}".strip(),
                "class_name": class_name,
                "section_name": section_name,
                "class_id": matched_class.id if matched_class else None,
                "section_id": matched_section.id if matched_section else None,
                "father_name": father_name,
                "primary_phone": phone,
                "dob": str(dob) if dob else None,
                "gender": gender,
                "has_error": row_has_error,
            })

        total = len(preview_data)
        invalid = len(set(e.row_number for e in errors))
        valid = total - invalid

        return ExcelDryRunResponse(
            total_rows=total,
            valid_rows_count=valid,
            invalid_rows_count=invalid,
            can_proceed=(invalid == 0 and total > 0),
            errors=errors,
            preview_data=preview_data[:50],  # Return up to first 50 rows for preview
        )

    @classmethod
    async def execute_student_import_commit(
        cls,
        file_bytes: bytes,
        academic_year_id: str,
        db: AsyncSession,
    ) -> int:
        """
        Executes atomic database commit of all students in the Excel file.
        Rolls back entirely if any database violation occurs.
        """
        dry_run = await cls.dry_run_student_import(file_bytes, academic_year_id, db)
        if not dry_run.can_proceed:
            raise AppException(f"Cannot commit Excel with {dry_run.invalid_rows_count} validation errors. Fix errors first.")

        wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))

        # DB lookups
        cls_stmt = select(ClassLevel).options(selectinload(ClassLevel.sections))
        cls_res = await db.execute(cls_stmt)
        classes = cls_res.scalars().all()
        class_map = {c.name.strip().lower(): c for c in classes}

        # Active student status & Lookups
        status_stmt = select(StudentStatus).where(StudentStatus.code == "ACTIVE")
        st_res = await db.execute(status_stmt)
        active_status = st_res.scalar_one_or_none()
        status_id = active_status.id if active_status else None

        from app.modules.lookups.models import LookupCategory
        gender_stmt = select(LookupValue).join(LookupCategory).where(LookupCategory.code == "GENDER")
        gender_res = await db.execute(gender_stmt)
        genders = {g.code.upper(): g.id for g in gender_res.scalars().all()}

        bg_stmt = select(LookupValue).join(LookupCategory).where(LookupCategory.code == "BLOOD_GROUP")
        bg_res = await db.execute(bg_stmt)
        blood_groups = {b.code.upper(): b.id for b in bg_res.scalars().all()}
        default_bg_id = list(blood_groups.values())[0] if blood_groups else None

        imported_count = 0

        for row in rows[1:]:
            if not row or all(v is None for v in row):
                continue

            adm_no = str(row[0]).strip()
            first_name = str(row[1]).strip()
            last_name = str(row[2]).strip() if row[2] else ""
            gender = str(row[3]).strip().upper() if row[3] else "MALE"
            dob_raw = row[4]
            class_name = str(row[5]).strip()
            section_name = str(row[6]).strip()
            roll_no = int(row[7]) if row[7] and str(row[7]).isdigit() else None
            father_name = str(row[8]).strip()
            mother_name = str(row[9]).strip() if row[9] else ""
            phone = str(row[10]).strip()
            wa_phone = str(row[11]).strip() if row[11] else phone
            address = str(row[12]).strip() if row[12] else ""
            blood_group = str(row[13]).strip().upper() if row[13] else None

            # Date parsing
            dob = date(2015, 1, 1)
            if isinstance(dob_raw, (date, datetime)):
                dob = dob_raw.date() if isinstance(dob_raw, datetime) else dob_raw
            elif isinstance(dob_raw, str) and dob_raw.strip():
                dob = datetime.strptime(dob_raw.strip(), "%Y-%m-%d").date()

            matched_class = class_map[class_name.lower()]
            matched_section = next(s for s in matched_class.sections if s.name.strip().lower() == section_name.lower())

            # 1. Find or create Parent & Parent User account
            parent_stmt = select(Parent).where(Parent.primary_phone == phone)
            parent_res = await db.execute(parent_stmt)
            parent = parent_res.scalar_one_or_none()

            parent_user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
            if not parent_user:
                parent_role = (await db.execute(select(Role).where(Role.code == "PARENT"))).scalar_one_or_none()
                parent_user = User(
                    username=phone,
                    phone=phone,
                    password_hash=get_password_hash("Parent@123"),
                    user_type="PARENT",
                    is_active=True,
                )
                db.add(parent_user)
                await db.flush()
                if parent_role:
                    db.add(UserRole(user_id=parent_user.id, role_id=parent_role.id))
                    await db.flush()

            if not parent:
                parent = Parent(
                    user_id=parent_user.id if parent_user else None,
                    father_name=father_name,
                    mother_name=mother_name,
                    primary_phone=phone,
                    whatsapp_phone=wa_phone,
                    address=address,
                )
                db.add(parent)
                await db.flush()
            elif not parent.user_id and parent_user:
                parent.user_id = parent_user.id
                await db.flush()

            # 2. Create Student
            student = Student(
                parent_id=parent.id,
                admission_no=adm_no,
                first_name=first_name,
                last_name=last_name,
                gender_id=genders.get(gender, list(genders.values())[0] if genders else None),
                dob=dob,
                blood_group_id=blood_groups.get(blood_group, default_bg_id) if blood_group else default_bg_id,
                status_id=status_id,
            )
            db.add(student)
            await db.flush()

            # 3. Create Enrollment
            enrollment = StudentEnrollment(
                student_id=student.id,
                academic_year_id=academic_year_id,
                class_id=matched_class.id,
                section_id=matched_section.id,
                roll_no=roll_no,
                enrollment_date=date.today(),
                is_active=True,
            )
            db.add(enrollment)
            imported_count += 1

        await db.commit()
        return imported_count

    @staticmethod
    def export_students_to_excel(students_data: List[Dict[str, Any]], school_name: str) -> bytes:
        """
        Exports clean, formatted .xlsx spreadsheet of enrolled students.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Enrolled_Students"

        # Title
        ws.merge_cells("A1:G1")
        title_cell = ws["A1"]
        title_cell.value = f"{school_name} — ACTIVE STUDENTS DIRECTORY"
        title_cell.font = Font(name="Segoe UI", size=14, bold=True, color="1E40AF")
        title_cell.alignment = Alignment(horizontal="center", vertical="center")

        headers = ["Admission No", "Student Name", "Class", "Section", "Roll No", "Father Name", "Phone"]
        ws.append([])  # Row 2 empty
        ws.append(headers)  # Row 3

        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=3, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 22

        for st in students_data:
            ws.append([
                st.get("admission_no"),
                st.get("full_name"),
                st.get("class_name"),
                st.get("section_name"),
                st.get("roll_no") or "-",
                st.get("father_name"),
                st.get("primary_phone"),
            ])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_udise_plus_to_excel(
        students_data: List[Dict[str, Any]],
        school_name: str,
        dise_code: str = "24070501234",
        academic_year: str = "2026-2027",
    ) -> bytes:
        """
        Generates official Government NIC UDISE+ SDMS (Student Database Management System)
        35-Column standard bulk data upload spreadsheet.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "UDISE_PLUS_SDMS_DATA"

        # Top Banner Title
        ws.merge_cells("A1:AI1")
        title_cell = ws["A1"]
        title_cell.value = f"UDISE+ SDMS 2026-27 COMPLIANT STUDENT DATA EXPORT — {school_name.upper()} (DISE: {dise_code})"
        title_cell.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
        title_cell.fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        title_cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 32

        # Subtitle Info Row
        ws.merge_cells("A2:AI2")
        sub_cell = ws["A2"]
        sub_cell.value = f"Ministry of Education / NIC SDMS Format | Total Students: {len(students_data)} | Academic Session: {academic_year} | Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}"
        sub_cell.font = Font(name="Segoe UI", size=9.5, italic=True, color="E2E8F0")
        sub_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        sub_cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[2].height = 20

        # Official 35 Columns
        headers = [
            "1. Student_PEN (11-Digits)",
            "2. Student_Full_Name",
            "3. Gender_Code (1:M, 2:F, 3:T)",
            "4. DOB (DD/MM/YYYY)",
            "5. Mother_Name",
            "6. Father_Name",
            "7. Guardian_Name",
            "8. Aadhaar_Number (12-Digits)",
            "9. Name_as_per_Aadhaar",
            "10. Student_Address",
            "11. Pincode",
            "12. Mobile_Number",
            "13. Alternate_Mobile",
            "14. Contact_Email",
            "15. Mother_Tongue",
            "16. Social_Category (1:Gen, 2:SC, 3:ST, 4:OBC)",
            "17. Minority_Group (0:None, 1:Muslim, 2:Christian...)",
            "18. BPL_Beneficiary (1:Yes, 2:No)",
            "19. AAY_Beneficiary (1:Yes, 2:No)",
            "20. CWSN_Status (1:Yes, 2:No)",
            "21. CWSN_Type",
            "22. Indian_National (1:Yes, 2:No)",
            "23. Out_of_School_Child (1:Yes, 2:No)",
            "24. Student_Admission_No",
            "25. Admission_Date (DD/MM/YYYY)",
            "26. Class_Enrolled",
            "27. Section",
            "28. Roll_Number",
            "29. Academic_Stream",
            "30. Previous_School_Status (1:Same, 2:Other, 3:None)",
            "31. Previous_Class_Studied",
            "32. Previous_Exam_Status (1:Passed, 2:Failed)",
            "33. Previous_Marks_Percentage",
            "34. RTE_Admission_Status (1:Yes, 2:No)",
            "35. APAAR_ID (12-Digits)",
        ]

        ws.append(headers)  # Row 3
        ws.row_dimensions[3].height = 28

        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=3, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = border
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 20

        # Adjust specific column widths
        ws.column_dimensions["A"].width = 24  # PEN
        ws.column_dimensions["B"].width = 26  # Name
        ws.column_dimensions["E"].width = 22  # Mother
        ws.column_dimensions["F"].width = 22  # Father
        ws.column_dimensions["H"].width = 22  # Aadhaar
        ws.column_dimensions["J"].width = 32  # Address
        ws.column_dimensions["X"].width = 22  # Admission No
        ws.column_dimensions["AI"].width = 22 # APAAR ID

        # Append Data Rows
        row_font = Font(name="Segoe UI", size=10, color="0F172A")
        alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

        for r_idx, st in enumerate(students_data, start=4):
            # Gender code
            gender_val = str(st.get("gender", "")).upper()
            g_code = 1 if "MALE" in gender_val and "FEMALE" not in gender_val else (2 if "FEMALE" in gender_val else 3)

            # Social Category code
            cat_val = str(st.get("category", "")).upper()
            c_code = 2 if "SC" in cat_val else (3 if "ST" in cat_val else (4 if "OBC" in cat_val or "SEBC" in cat_val else 1))

            # RTE
            rte_code = 1 if st.get("is_rte") else 2

            row = [
                st.get("pen_11") or st.get("pen") or "-",
                st.get("full_name") or f"{st.get('first_name', '')} {st.get('last_name', '')}".strip(),
                g_code,
                st.get("dob_str") or "-",
                st.get("mother_name") or "-",
                st.get("father_name") or "-",
                st.get("guardian_name") or st.get("father_name") or "-",
                st.get("aadhaar_no") or st.get("aadhar") or "-",
                st.get("name_as_per_aadhaar") or st.get("full_name") or "-",
                st.get("address") or "-",
                st.get("pincode") or "380001",
                st.get("primary_phone") or "-",
                st.get("alternate_phone") or "-",
                st.get("email") or "-",
                st.get("mother_tongue") or "Gujarati",
                c_code,
                st.get("minority_code", 0),
                st.get("bpl_code", 2),
                st.get("aay_code", 2),
                st.get("cwsn_code", 2),
                st.get("cwsn_type", "NA"),
                1,  # Indian National
                2,  # Out of School
                st.get("admission_no") or "-",
                st.get("admission_date_str") or "-",
                st.get("class_name") or "-",
                st.get("section_name") or "A",
                st.get("roll_no") or "-",
                st.get("academic_stream") or "General",
                st.get("prev_school_code", 1),
                st.get("prev_class", "-"),
                st.get("prev_exam_code", 1),
                st.get("prev_marks_pct", "80.00"),
                rte_code,
                st.get("apaar_id") or "-",
            ]
            ws.append(row)

            # Apply row styling
            is_even = (r_idx % 2 == 0)
            for col_idx in range(1, len(row) + 1):
                cell = ws.cell(row=r_idx, column=col_idx)
                cell.font = row_font
                cell.border = border
                if is_even:
                    cell.fill = alt_fill

        # Freeze Panes under Header Row (Row 3)
        ws.freeze_panes = "C4"

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()

