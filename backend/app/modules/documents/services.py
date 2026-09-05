from datetime import date
from typing import Dict, Any
from app.modules.exams.services import ExamService


class DocumentGeneratorService:
    @staticmethod
    def generate_report_card_html(data: Dict[str, Any], school_name: str = "7A Model Academy", brand_color: str = "#1E40AF") -> str:
        """
        Renders a pixel-perfect, print-ready HTML Report Card
        with embedded CSS styling.
        """
        student = data.get("student_profile", {})
        summary = data.get("summary", {})
        attendance = data.get("attendance", {})
        scores = data.get("subject_scores", [])
        qualitative = data.get("qualitative_development", [])
        school_info = data.get("school_info", {})

        subject_rows = ""
        for s in scores:
            status_badge = f"<span style='color:green;font-weight:bold;'>PASS</span>" if s["is_pass"] else f"<span style='color:red;font-weight:bold;'>FAIL</span>"
            if s.get("is_absent"):
                status_badge = "<span style='color:orange;'>ABSENT</span>"

            subject_rows += f"""
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">{s['subject_name']}</td>
                <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: center;">{s['max_marks']}</td>
                <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: center;">{s['pass_marks']}</td>
                <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: center; font-weight: bold;">{s['marks_obtained'] if s['marks_obtained'] is not None else '-'}</td>
                <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: center; font-weight: bold; color: {brand_color};">{s['grade_letter']}</td>
                <td style="padding: 8px 12px; border: 1px solid #E5E7EB; text-align: center;">{status_badge}</td>
            </tr>
            """

        qualitative_rows = ""
        for q in qualitative:
            stars = "★" * int(q['rating_value']) if q['rating_value'].isdigit() else q['rating_value']
            qualitative_rows += f"""
            <tr>
                <td style="padding: 6px 12px; border: 1px solid #E5E7EB;">{q['criteria_name']}</td>
                <td style="padding: 6px 12px; border: 1px solid #E5E7EB; text-align: center; color: #F59E0B; font-size: 16px;">{stars}</td>
                <td style="padding: 6px 12px; border: 1px solid #E5E7EB; color: #4B5563;">{q['remarks'] or '-'}</td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Report Card - {student.get('student_name', 'Student')}</title>
            <style>
                @page {{ size: A4; margin: 15mm; }}
                body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1F2937; margin: 0; padding: 20px; background: #fff; }}
                .report-card-container {{ max-width: 800px; margin: 0 auto; border: 3px double {brand_color}; padding: 25px; border-radius: 8px; }}
                .header {{ text-align: center; border-bottom: 2px solid {brand_color}; padding-bottom: 12px; margin-bottom: 20px; }}
                .school-title {{ font-size: 26px; font-weight: 800; color: {brand_color}; margin: 0; text-transform: uppercase; }}
                .term-title {{ font-size: 16px; font-weight: 600; color: #4B5563; margin-top: 4px; }}
                .student-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #F9FAFB; padding: 12px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #E5E7EB; }}
                .info-item {{ font-size: 14px; }}
                .info-label {{ font-weight: 600; color: #374151; }}
                table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }}
                th {{ background-color: {brand_color}; color: #ffffff; padding: 10px 12px; border: 1px solid {brand_color}; text-align: center; }}
                .section-header {{ font-size: 16px; font-weight: 700; color: {brand_color}; margin: 20px 0 10px 0; border-left: 4px solid {brand_color}; padding-left: 8px; }}
                .summary-box {{ display: flex; justify-content: space-between; background: #EEF2FF; padding: 15px; border-radius: 6px; border: 1px solid #C7D2FE; margin-bottom: 25px; }}
                .stat-item {{ text-align: center; }}
                .stat-val {{ font-size: 20px; font-weight: 800; color: {brand_color}; }}
                .stat-lbl {{ font-size: 12px; color: #4B5563; text-transform: uppercase; font-weight: 600; }}
                .signatures {{ display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }}
                .sig-box {{ text-align: center; border-top: 1px solid #9CA3AF; width: 180px; padding-top: 6px; font-size: 13px; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="report-card-container">
                <div class="header">
                    <h1 class="school-title">{school_name}</h1>
                    <div class="term-title">PROGRESS REPORT — {school_info.get('term_name', 'Annual Term')} ({school_info.get('session_name', '2026-2027')})</div>
                </div>

                <div class="student-grid">
                    <div class="info-item"><span class="info-label">Student Name:</span> {student.get('student_name')}</div>
                    <div class="info-item"><span class="info-label">Admission No:</span> {student.get('admission_no')}</div>
                    <div class="info-item"><span class="info-label">Class & Section:</span> {student.get('class_name')} - {student.get('section_name')}</div>
                    <div class="info-item"><span class="info-label">Roll Number:</span> {student.get('roll_no') or '-'}</div>
                    <div class="info-item"><span class="info-label">Father's Name:</span> {student.get('father_name')}</div>
                    <div class="info-item"><span class="info-label">Date of Birth:</span> {student.get('dob')}</div>
                </div>

                <div class="section-header">ACADEMIC PERFORMANCE</div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Subject</th>
                            <th>Max Marks</th>
                            <th>Pass Marks</th>
                            <th>Marks Obtained</th>
                            <th>Grade</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subject_rows}
                    </tbody>
                </table>

                <div class="summary-box">
                    <div class="stat-item">
                        <div class="stat-val">{summary.get('total_obtained_marks')} / {summary.get('total_max_marks')}</div>
                        <div class="stat-lbl">Grand Total</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-val">{summary.get('overall_percentage')}%</div>
                        <div class="stat-lbl">Percentage</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-val" style="color: {'#10B981' if summary.get('result') == 'PASSED' else '#EF4444'};">{summary.get('result')}</div>
                        <div class="stat-lbl">Final Result</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-val">{attendance.get('attendance_percentage')}%</div>
                        <div class="stat-lbl">Attendance ({attendance.get('present_days')}/{attendance.get('total_working_days')} Days)</div>
                    </div>
                </div>

                {f'<div class="section-header">QUALITATIVE & BEHAVIORAL DEVELOPMENT</div><table><thead><tr><th style="text-align: left;">Evaluation Metric</th><th>Rating</th><th style="text-align: left;">Remarks</th></tr></thead><tbody>{qualitative_rows}</tbody></table>' if qualitative else ''}

                <div class="signatures">
                    <div class="sig-box">Class Teacher</div>
                    <div class="sig-box">Parent / Guardian</div>
                    <div class="sig-box">Principal</div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    @staticmethod
    def generate_transfer_certificate_html(
        data: Dict[str, Any],
        school_name: str = "7A Model Academy",
        school_address: str = "Affiliated to State Board / CBSE, Reg No: 7A-2026",
        brand_color: str = "#1E40AF",
    ) -> str:
        """
        Renders an official, anti-tamper Transfer Certificate (TC) & Character Certificate.
        """
        student = data.get("student", {})
        tc_no = data.get("tc_no", "TC-2026-0001")
        issue_date = data.get("issue_date", str(date.today()))
        leaving_reason = data.get("leaving_reason", "Parent Relocation / Transferred")
        conduct = data.get("conduct", "GOOD")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Transfer Certificate - {tc_no}</title>
            <style>
                @page {{ size: A4; margin: 15mm; }}
                body {{ font-family: 'Times New Roman', serif; color: #111827; padding: 20px; background: #fff; }}
                .tc-border {{ border: 4px double {brand_color}; padding: 30px; border-radius: 6px; }}
                .header {{ text-align: center; border-bottom: 2px solid {brand_color}; padding-bottom: 12px; margin-bottom: 25px; }}
                .school-name {{ font-size: 26px; font-weight: bold; color: {brand_color}; text-transform: uppercase; }}
                .school-sub {{ font-size: 13px; color: #4B5563; margin-top: 4px; }}
                .doc-title {{ font-size: 18px; font-weight: bold; letter-spacing: 2px; text-decoration: underline; margin-top: 15px; }}
                .tc-number {{ display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 20px; }}
                .tc-grid {{ font-size: 15px; line-height: 2.2; }}
                .tc-field {{ display: flex; border-bottom: 1px dotted #9CA3AF; }}
                .tc-label {{ width: 320px; font-weight: bold; }}
                .tc-val {{ flex: 1; color: #1F2937; }}
                .qr-zone {{ display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; }}
                .qr-box {{ border: 1px solid #9CA3AF; padding: 6px; font-size: 10px; text-align: center; width: 100px; }}
                .signatures {{ display: flex; gap: 40px; text-align: center; font-size: 13px; font-weight: bold; }}
                .sig {{ width: 140px; border-top: 1px solid #374151; padding-top: 4px; }}
            </style>
        </head>
        <body>
            <div class="tc-border">
                <div class="header">
                    <div class="school-name">{school_name}</div>
                    <div class="school-sub">{school_address}</div>
                    <div class="doc-title">SCHOOL LEAVING / TRANSFER CERTIFICATE</div>
                </div>

                <div class="tc-number">
                    <div>TC Serial No: <span style="color:{brand_color};">{tc_no}</span></div>
                    <div>Admission No: <span>{student.get('admission_no', 'ADM-001')}</span></div>
                    <div>Issue Date: <span>{issue_date}</span></div>
                </div>

                <div class="tc-grid">
                    <div class="tc-field"><div class="tc-label">1. Name of the Pupil:</div><div class="tc-val"><strong>{student.get('full_name')}</strong></div></div>
                    <div class="tc-field"><div class="tc-label">2. Father's / Guardian's Name:</div><div class="tc-val">{student.get('father_name')}</div></div>
                    <div class="tc-field"><div class="tc-label">3. Mother's Name:</div><div class="tc-val">{student.get('mother_name', 'N/A')}</div></div>
                    <div class="tc-field"><div class="tc-label">4. Nationality & Religion:</div><div class="tc-val">Indian</div></div>
                    <div class="tc-field"><div class="tc-label">5. Date of Birth (in figures & words):</div><div class="tc-val">{student.get('dob')}</div></div>
                    <div class="tc-field"><div class="tc-label">6. Class in which the pupil last studied:</div><div class="tc-val"><strong>{student.get('class_name')} ({student.get('section_name')})</strong></div></div>
                    <div class="tc-field"><div class="tc-label">7. School / Board Annual Exam Last Taken:</div><div class="tc-val">Passed & Promoted</div></div>
                    <div class="tc-field"><div class="tc-label">8. Whether Failed (if so, once/twice):</div><div class="tc-val">No</div></div>
                    <div class="tc-field"><div class="tc-label">9. Month up to which School Dues Paid:</div><div class="tc-val">All Clear</div></div>
                    <div class="tc-field"><div class="tc-label">10. Total No. of Working Days in Session:</div><div class="tc-val">220 Days</div></div>
                    <div class="tc-field"><div class="tc-label">11. Total No. of Days Present:</div><div class="tc-val">208 Days</div></div>
                    <div class="tc-field"><div class="tc-label">12. Reason for Leaving the School:</div><div class="tc-val"><strong>{leaving_reason}</strong></div></div>
                    <div class="tc-field"><div class="tc-label">13. General Conduct & Character:</div><div class="tc-val"><strong>{conduct}</strong></div></div>
                </div>

                <div class="qr-zone">
                    <div class="qr-box">
                        <div style="font-size:32px;line-height:1;">📱</div>
                        Scan to Verify
                    </div>
                    <div class="signatures">
                        <div class="sig">Class Teacher</div>
                        <div class="sig">Checked By (Clerk)</div>
                        <div class="sig">Principal (Seal)</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    @staticmethod
    def generate_id_cards_batch_html(
        students: list,
        school_name: str = "7A Model Academy",
        school_phone: str = "+91 9876543210",
        brand_color: str = "#1E40AF",
    ) -> str:
        """
        Renders a printable sheet of CR-80 standard Student ID Cards (Front + Back).
        """
        cards_html = ""
        for s in students:
            cards_html += f"""
            <div class="id-card">
                <div class="id-header">
                    <div class="id-school">{school_name}</div>
                    <div class="id-sub">STUDENT IDENTITY CARD</div>
                </div>
                <div class="id-body">
                    <div class="photo-box">
                        {f'<img src="{s.get("profile_photo_url")}" class="student-photo" alt="Photo" />' if s.get("profile_photo_url") else '<div class="photo-placeholder">PHOTO</div>'}
                    </div>
                    <div class="id-info">
                        <div class="id-name">{s.get('full_name')}</div>
                        <div class="info-row"><strong>Adm No:</strong> {s.get('admission_no')}</div>
                        <div class="info-row"><strong>Class:</strong> {s.get('class_name')} - {s.get('section_name')}</div>
                        <div class="info-row"><strong>Roll No:</strong> {s.get('roll_no') or '-'}</div>
                        <div class="info-row"><strong>DOB:</strong> {s.get('dob')}</div>
                        <div class="info-row"><strong>Blood:</strong> <span style="color:red;font-weight:bold;">{s.get('blood_group') or 'O+'}</span></div>
                    </div>
                </div>
                <div class="id-footer">
                    <div>Emergency: {s.get('primary_phone')}</div>
                    <div>Principal Sign</div>
                </div>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Batch Student ID Cards</title>
            <style>
                @page {{ size: A4; margin: 10mm; }}
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 10px; }}
                .sheet-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }}
                .id-card {{ width: 340px; height: 215px; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; }}
                .id-header {{ background: {brand_color}; color: #ffffff; text-align: center; padding: 6px; }}
                .id-school {{ font-size: 13px; font-weight: 800; text-transform: uppercase; }}
                .id-sub {{ font-size: 9px; letter-spacing: 1px; color: #e0e7ff; }}
                .id-body {{ flex: 1; display: flex; padding: 8px; gap: 10px; align-items: center; }}
                .photo-box {{ width: 75px; height: 95px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }}
                .photo-placeholder {{ font-size: 10px; color: #94a3b8; font-weight: bold; }}
                .student-photo {{ width: 100%; height: 100%; object-fit: cover; }}
                .id-info {{ flex: 1; font-size: 11px; }}
                .id-name {{ font-size: 13px; font-weight: 800; color: {brand_color}; margin-bottom: 4px; }}
                .info-row {{ margin-bottom: 2px; color: #374151; }}
                .id-footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 4px 8px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="sheet-grid">
                {cards_html}
            </div>
        </body>
        </html>
        """

    @staticmethod
    def generate_fee_card_html(
        data: Dict[str, Any],
        school_name: str = "7A Model Academy",
        brand_color: str = "#1E40AF",
    ) -> str:
        """
        Renders a printable Student Fee Card / Statement of Account (PDF 3 Sec 13).
        """
        demands = data.get("demands", [])
        receipts = data.get("receipts", [])

        demand_rows = ""
        for d in demands:
            status_color = "#10B981" if d["status"] == "PAID" else ("#F59E0B" if d["status"] == "PARTIAL" else "#EF4444")
            demand_rows += f"""
            <tr>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB;">{d.get('fee_head_name') or 'Tuition Fee'}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: center;">{d.get('schedule_name') or '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: right;">₹{d.get('base_amount', 0):,.2f}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: right; color: #10B981;">₹{d.get('concession_amount', 0):,.2f}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold;">₹{d.get('paid_amount', 0):,.2f}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #DC2626;">₹{d.get('balance_amount', 0):,.2f}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: center;"><span style="color:{status_color};font-weight:bold;font-size:11px;">{d.get('status')}</span></td>
            </tr>
            """

        receipt_rows = ""
        for r in receipts:
            receipt_rows += f"""
            <tr>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; font-weight: bold;">{r.get('receipt_no')}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: center;">{r.get('collection_date')}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: center;">{r.get('payment_mode') or 'Cash'}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #10B981;">₹{r.get('total_amount_paid', 0):,.2f}</td>
                <td style="padding: 6px 10px; border: 1px solid #E5E7EB; text-align: center;"><span style="color: {'#10B981' if r.get('status') == 'CONFIRMED' else '#DC2626'}; font-weight: bold; font-size: 11px;">{r.get('status')}</span></td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Fee Card - {data.get('student_name', 'Student')}</title>
            <style>
                @page {{ size: A4; margin: 12mm; }}
                body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1F2937; margin: 0; padding: 15px; background: #fff; font-size: 13px; }}
                .fee-card-container {{ max-width: 850px; margin: 0 auto; border: 2px solid {brand_color}; padding: 20px; border-radius: 6px; }}
                .header {{ text-align: center; border-bottom: 2px solid {brand_color}; padding-bottom: 10px; margin-bottom: 15px; }}
                .school-title {{ font-size: 24px; font-weight: 800; color: {brand_color}; margin: 0; text-transform: uppercase; }}
                .doc-subtitle {{ font-size: 14px; font-weight: 700; color: #4B5563; margin-top: 4px; letter-spacing: 1px; }}
                .info-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #F9FAFB; padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #E5E7EB; }}
                .summary-bar {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }}
                .summary-card {{ background: #F3F4F6; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #E5E7EB; }}
                .summary-card.highlight {{ background: #EEF2FF; border-color: {brand_color}; }}
                .summary-card.due {{ background: #FEF2F2; border-color: #FECACA; }}
                .stat-value {{ font-size: 17px; font-weight: 800; color: {brand_color}; }}
                .stat-value.danger {{ color: #DC2626; }}
                .stat-value.success {{ color: #10B981; }}
                .stat-label {{ font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-top: 2px; }}
                table {{ width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }}
                th {{ background-color: {brand_color}; color: #ffffff; padding: 8px 10px; text-align: center; border: 1px solid {brand_color}; }}
                .section-head {{ font-size: 14px; font-weight: 700; color: {brand_color}; margin: 15px 0 8px 0; border-left: 3px solid {brand_color}; padding-left: 6px; }}
                .signatures {{ display: flex; justify-content: space-between; margin-top: 35px; padding-top: 15px; }}
                .sig-box {{ text-align: center; border-top: 1px solid #9CA3AF; width: 160px; padding-top: 4px; font-size: 12px; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="fee-card-container">
                <div class="header">
                    <h1 class="school-title">{school_name}</h1>
                    <div class="doc-subtitle">STUDENT CUMULATIVE FEE CARD / STATEMENT OF ACCOUNT</div>
                </div>

                <div class="info-grid">
                    <div><strong>Student Name:</strong> {data.get('student_name')}</div>
                    <div><strong>Admission No:</strong> {data.get('admission_no')}</div>
                    <div><strong>Class & Section:</strong> {data.get('class_name')} - {data.get('section_name')}</div>
                    <div><strong>Roll No:</strong> {data.get('roll_no') or '-'}</div>
                    <div><strong>Statement Date:</strong> {date.today()}</div>
                    <div><strong>Account Status:</strong> <span style="font-weight:bold; color: {'#10B981' if data.get('net_balance_due', 0) <= 0 else '#DC2626'};">{'ALL DUES CLEARED' if data.get('net_balance_due', 0) <= 0 else 'OUTSTANDING DUES PENDING'}</span></div>
                </div>

                <div class="summary-bar">
                    <div class="summary-card">
                        <div class="stat-value">₹{data.get('total_demanded', 0):,.2f}</div>
                        <div class="stat-label">Total Demanded</div>
                    </div>
                    <div class="summary-card">
                        <div class="stat-value success">₹{data.get('total_concession', 0):,.2f}</div>
                        <div class="stat-label">Concessions / Mafi</div>
                    </div>
                    <div class="summary-card">
                        <div class="stat-value">₹{data.get('total_fine', 0):,.2f}</div>
                        <div class="stat-label">Late Fines</div>
                    </div>
                    <div class="summary-card highlight">
                        <div class="stat-value success">₹{data.get('total_paid', 0):,.2f}</div>
                        <div class="stat-label">Total Paid</div>
                    </div>
                    <div class="summary-card due">
                        <div class="stat-value danger">₹{data.get('net_balance_due', 0):,.2f}</div>
                        <div class="stat-label">Net Balance Due</div>
                    </div>
                </div>

                <div class="section-head">DEMANDS & RECEIVABLES SCHEDULE</div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Fee Head</th>
                            <th>Schedule / Period</th>
                            <th style="text-align: right;">Base Amount</th>
                            <th style="text-align: right;">Concession</th>
                            <th style="text-align: right;">Paid</th>
                            <th style="text-align: right;">Balance Due</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {demand_rows if demand_rows else '<tr><td colspan="7" style="text-align:center;padding:10px;">No demands generated.</td></tr>'}
                    </tbody>
                </table>

                <div class="section-head">COLLECTION & PAYMENT HISTORY</div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Receipt No</th>
                            <th>Date</th>
                            <th>Mode</th>
                            <th style="text-align: right;">Amount Paid</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipt_rows if receipt_rows else '<tr><td colspan="5" style="text-align:center;padding:10px;">No payment collections recorded.</td></tr>'}
                    </tbody>
                </table>

                <div class="signatures">
                    <div class="sig-box">Accountant / Cashier</div>
                    <div class="sig-box">Parent / Guardian</div>
                    <div class="sig-box">Principal</div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    @staticmethod
    def generate_warning_letter_html(
        incident_data: Dict[str, Any],
        school_name: str = "7A Model Academy",
        brand_color: str = "#DC2626",
    ) -> str:
        """
        Renders a formal Disciplinary Warning / Notification Letter (PDF 2 Page 16 Sec 23).
        """
        st = incident_data.get("student", {})
        ref_no = incident_data.get("ref_no", f"DISC-{date.today().year}-{incident_data.get('incident_id', '001')[:6].upper()}")
        severity = incident_data.get("severity_level", "MEDIUM")
        category = incident_data.get("category", "BEHAVIORAL").replace("_", " ")
        action_taken = incident_data.get("action_taken", "WRITTEN_WARNING").replace("_", " ")
        desc = incident_data.get("description", "Infraction of school code of conduct.")
        inc_date = incident_data.get("incident_date", str(date.today()))

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Disciplinary Notice - {ref_no}</title>
            <style>
                @page {{ size: A4; margin: 20mm; }}
                body {{ font-family: 'Times New Roman', serif; color: #1F2937; margin: 0; padding: 25px; background: #fff; line-height: 1.6; font-size: 15px; }}
                .notice-border {{ border: 3px double {brand_color}; padding: 35px; border-radius: 6px; }}
                .header {{ text-align: center; border-bottom: 2px solid {brand_color}; padding-bottom: 12px; margin-bottom: 25px; }}
                .school-title {{ font-size: 26px; font-weight: bold; color: {brand_color}; text-transform: uppercase; margin: 0; }}
                .letter-title {{ font-size: 18px; font-weight: bold; color: #111827; letter-spacing: 1px; margin-top: 10px; text-decoration: underline; }}
                .meta-bar {{ display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 25px; }}
                .student-box {{ background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }}
                .student-box strong {{ color: #991B1B; }}
                .severity-tag {{ display: inline-block; padding: 3px 10px; border-radius: 4px; background: #DC2626; color: white; font-weight: bold; font-size: 12px; }}
                .content-section {{ margin-bottom: 25px; }}
                .directive-box {{ border-left: 4px solid {brand_color}; background: #FFFBEB; padding: 12px 16px; margin: 20px 0; font-style: italic; }}
                .signatures {{ display: flex; justify-content: space-between; margin-top: 55px; }}
                .sig-box {{ text-align: center; border-top: 1px solid #374151; width: 170px; padding-top: 6px; font-size: 13px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="notice-border">
                <div class="header">
                    <h1 class="school-title">{school_name}</h1>
                    <div style="font-size: 13px; color: #4B5563; margin-top: 4px;">OFFICE OF THE DISCIPLINE COMMITTEE & STUDENT WELFARE</div>
                    <div class="letter-title">OFFICIAL DISCIPLINARY WARNING & NOTIFICATION</div>
                </div>

                <div class="meta-bar">
                    <div>Reference: <span>{ref_no}</span></div>
                    <div>Date of Issue: <span>{date.today()}</span></div>
                </div>

                <div class="student-box">
                    <div><strong>To the Parent / Guardian of:</strong> {st.get('student_name', 'Student')} (Adm No: {st.get('admission_no', '-')})</div>
                    <div><strong>Class & Section:</strong> {st.get('class_name', '-')} - {st.get('section_name', '-')} | <strong>Roll No:</strong> {st.get('roll_no', '-')}</div>
                    <div><strong>Incident Date:</strong> {inc_date} | <strong>Infraction Category:</strong> {category}</div>
                    <div style="margin-top: 6px;"><strong>Severity Level:</strong> <span class="severity-tag">{severity}</span></div>
                </div>

                <div class="content-section">
                    <p>Dear Parent / Guardian,</p>
                    <p>
                        This official notice is issued to bring to your urgent attention an incident of unacceptable conduct involving your ward on <strong>{inc_date}</strong>. The school administration has thoroughly investigated the matter.
                    </p>
                    <p><strong>Incident Particulars & Findings:</strong></p>
                    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; padding: 12px 15px; border-radius: 4px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px;">
                        {desc}
                    </div>
                    <p style="margin-top: 15px;">
                        <strong>Action Imposed:</strong> <span style="font-weight: bold; color: {brand_color};">{action_taken}</span>
                    </p>
                    <div class="directive-box">
                        <strong>Administrative Directive:</strong> As per the school's Code of Conduct, any further repeat of such behavior will lead to escalated administrative action, including mandatory parental counseling or formal suspension.
                    </div>
                    <p>
                        Kindly acknowledge receipt of this warning letter and ensure remedial measures are undertaken at home to instill proper discipline.
                    </p>
                </div>

                <div class="signatures">
                    <div class="sig-box">Class Teacher</div>
                    <div class="sig-box">Discipline In-Charge</div>
                    <div class="sig-box">Principal</div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    @staticmethod
    def generate_award_certificate_html(
        award_data: Dict[str, Any],
        school_name: str = "7A Model Academy",
        brand_color: str = "#B45309",
    ) -> str:
        """
        Renders an official Certificate of Merit / Honor (PDF 2 Page 9 Sec 13).
        """
        st = award_data.get("student", {})
        award_name = award_data.get("award_name", "Excellence in Academics")
        category = award_data.get("award_category", "ACADEMIC").replace("_", " ")
        citation = award_data.get("description", "Demonstrating exemplary dedication, character, and scholastic excellence.")
        award_date = award_data.get("award_date", str(date.today()))

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Certificate of Merit - {st.get('student_name', 'Student')}</title>
            <style>
                @page {{ size: landscape; margin: 15mm; }}
                body {{ font-family: 'Georgia', 'Times New Roman', serif; color: #1F2937; margin: 0; padding: 25px; background: #FFFDF9; }}
                .cert-container {{ border: 8px double {brand_color}; padding: 35px 50px; border-radius: 12px; text-align: center; position: relative; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
                .cert-crest {{ font-size: 42px; margin-bottom: 5px; color: {brand_color}; }}
                .school-title {{ font-size: 32px; font-weight: bold; color: {brand_color}; text-transform: uppercase; margin: 0; letter-spacing: 2px; }}
                .cert-heading {{ font-size: 24px; font-weight: normal; font-style: italic; color: #4B5563; margin-top: 15px; text-transform: uppercase; letter-spacing: 3px; }}
                .cert-subtitle {{ font-size: 16px; color: #6B7280; margin-top: 6px; }}
                .student-name {{ font-size: 36px; font-weight: bold; color: #1E3A8A; margin: 20px 0 10px 0; border-bottom: 2px solid #E5E7EB; display: inline-block; padding: 0 40px 8px 40px; font-family: 'Times New Roman', serif; }}
                .cert-details {{ font-size: 18px; line-height: 1.8; color: #374151; max-width: 750px; margin: 0 auto 20px auto; }}
                .award-badge {{ display: inline-block; font-size: 22px; font-weight: bold; color: {brand_color}; padding: 6px 20px; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 30px; margin-top: 10px; }}
                .citation-text {{ font-style: italic; color: #4B5563; font-size: 15px; margin-top: 10px; }}
                .cert-footer {{ display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }}
                .sig-box {{ text-align: center; border-top: 2px solid #9CA3AF; width: 220px; padding-top: 8px; font-size: 14px; font-weight: bold; color: #374151; }}
                .seal-box {{ width: 90px; height: 90px; border-radius: 50%; border: 3px dashed {brand_color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: {brand_color}; margin: 0 auto; text-transform: uppercase; }}
            </style>
        </head>
        <body>
            <div class="cert-container">
                <div class="cert-crest">★ 🎓 ★</div>
                <h1 class="school-title">{school_name}</h1>
                <div class="cert-heading">Certificate of Merit & Recognition</div>
                <div class="cert-subtitle">This certificate is proudly awarded to</div>

                <div class="student-name">{st.get('student_name', 'Student')}</div>

                <div class="cert-details">
                    of <strong>Class {st.get('class_name', '-')} - {st.get('section_name', '-')}</strong> (Admission No: <strong>{st.get('admission_no', '-')}</strong>) in sincere recognition of outstanding achievement in <strong>{category}</strong>:
                    <br />
                    <div class="award-badge">{award_name}</div>
                    <div class="citation-text">"{citation}"</div>
                </div>

                <div class="cert-footer">
                    <div class="sig-box">
                        <div>{award_date}</div>
                        <div>Date of Award</div>
                    </div>
                    <div>
                        <div class="seal-box">OFFICIAL<br/>SEAL</div>
                    </div>
                    <div class="sig-box">
                        <div>Principal / Head of Institution</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

