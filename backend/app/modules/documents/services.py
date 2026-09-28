from datetime import date, datetime
from typing import Dict, Any, Optional, List, Union, Tuple
from app.modules.exams.services import ExamService


class DocumentGeneratorService:
    @staticmethod
    def get_toolbar_component(
        doc_title: str,
        doc_badge: str = "OFFICIAL RECORD",
        brand_color: str = "#1E40AF",
        orientation: str = "portrait",
    ) -> Dict[str, str]:
        """
        Returns enterprise-grade head CSS, floating action toolbar HTML,
        and keyboard/zoom JavaScript for all printable documents.
        """
        css = f"""
        @page {{
            size: A4 {orientation};
            margin: 10mm;
        }}
        * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }}
        body {{
            background: #F1F5F9;
            margin: 0;
            padding: 0;
            color: #0F172A;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }}
        .document-toolbar {{
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: rgba(15, 23, 42, 0.94);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 999999;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
        }}
        .toolbar-brand {{
            display: flex;
            align-items: center;
            gap: 12px;
            overflow: hidden;
        }}
        .toolbar-badge {{
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.4);
            color: #93C5FD;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 4px 10px;
            border-radius: 6px;
            white-space: nowrap;
        }}
        .toolbar-title {{
            color: #FFFFFF;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .toolbar-actions {{
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }}
        .zoom-group {{
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 2px 4px;
            gap: 2px;
        }}
        .btn-tool {{
            background: transparent;
            border: none;
            color: #E2E8F0;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
        }}
        .btn-tool:hover {{
            background: rgba(255, 255, 255, 0.15);
            color: #FFFFFF;
        }}
        .zoom-text {{
            color: #94A3B8;
            font-size: 11px;
            font-weight: 700;
            min-width: 42px;
            text-align: center;
            user-select: none;
        }}
        .btn-print {{
            background: linear-gradient(135deg, #2563EB, #1D4ED8);
            color: #FFFFFF;
            border: none;
            padding: 8px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
            transition: all 0.15s ease;
        }}
        .btn-print:hover {{
            background: linear-gradient(135deg, #1D4ED8, #1E40AF);
            box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
            transform: translateY(-1px);
        }}
        .btn-close {{
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #CBD5E1;
            padding: 8px 14px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }}
        .btn-close:hover {{
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.4);
            color: #FCA5A5;
        }}
        .document-toolbar-spacer {{
            height: 72px;
        }}
        .printable-content {{
            transition: transform 0.15s ease;
            transform-origin: top center;
            padding: 10px 15px 30px 15px;
        }}
        @media print {{
            .no-print, .document-toolbar, .document-toolbar-spacer {{
                display: none !important;
            }}
            body {{
                background: #FFFFFF !important;
                margin: 0 !important;
                padding: 0 !important;
            }}
            .printable-content {{
                transform: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
            }}
        }}
        """

        html = f"""
        <div class="document-toolbar no-print">
            <div class="toolbar-brand">
                <span class="toolbar-badge">{doc_badge}</span>
                <span class="toolbar-title">{doc_title}</span>
            </div>
            <div class="toolbar-actions">
                <div class="zoom-group">
                    <button type="button" class="btn-tool" onclick="changeDocZoom(-0.1)" title="Zoom Out (Ctrl -)">−</button>
                    <span id="doc-zoom-val" class="zoom-text">100%</span>
                    <button type="button" class="btn-tool" onclick="changeDocZoom(0.1)" title="Zoom In (Ctrl +)">+</button>
                    <button type="button" class="btn-tool" onclick="resetDocZoom()" title="Reset Zoom" style="font-size:10px; width:34px;">FIT</button>
                </div>
                <button type="button" class="btn-print" onclick="window.print()" title="Print / Save PDF (Ctrl + P)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    <span>Print / Save PDF</span>
                </button>
                <button type="button" class="btn-close" onclick="window.close()" title="Close Tab (Esc)">
                    ✕ Close
                </button>
            </div>
        </div>
        <div class="document-toolbar-spacer no-print"></div>

        <script>
            var docCurrentZoom = 1.0;
            function changeDocZoom(delta) {{
                docCurrentZoom = Math.min(2.0, Math.max(0.5, Math.round((docCurrentZoom + delta) * 10) / 10));
                var target = document.querySelector('.printable-content') || document.body;
                target.style.transform = 'scale(' + docCurrentZoom + ')';
                var indicator = document.getElementById('doc-zoom-val');
                if (indicator) indicator.textContent = Math.round(docCurrentZoom * 100) + '%';
            }}
            function resetDocZoom() {{
                docCurrentZoom = 1.0;
                var target = document.querySelector('.printable-content') || document.body;
                target.style.transform = 'scale(1.0)';
                var indicator = document.getElementById('doc-zoom-val');
                if (indicator) indicator.textContent = '100%';
            }}
            document.addEventListener('keydown', function(e) {{
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {{
                    e.preventDefault();
                    window.print();
                }} else if (e.key === 'Escape') {{
                    window.close();
                }}
            }});
            window.addEventListener('DOMContentLoaded', function() {{
                var params = new URLSearchParams(window.location.search);
                if (params.get('autoprint') === '1' || params.get('print') === 'true' || params.get('print') === '1') {{
                    setTimeout(function() {{ window.print(); }}, 400);
                }}
            }});
        </script>
        """

        return {"css": css, "html": html}

    @staticmethod
    def generate_fee_receipt_html(
        receipt: Any,
        item_rows: str,
        school_name: str = "7A Model Academy",
        brand_color: str = "#1E40AF",
    ) -> str:
        """
        Renders styled official Fee Receipt with universal print toolbar.
        """
        st_name = f"{receipt.student.first_name} {receipt.student.last_name or ''}".strip() if receipt.student else "Student"
        adm_no = receipt.student.admission_no if receipt.student else "-"
        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Fee Receipt — {receipt.receipt_no} ({st_name})",
            doc_badge="OFFICIAL FEE RECEIPT",
            brand_color=brand_color,
            orientation="portrait",
        )

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fee Receipt - {receipt.receipt_no}</title>
    <style>
        {toolbar['css']}
        .receipt-box {{
            max-width: 640px;
            margin: 0 auto;
            border: 2px solid {brand_color};
            padding: 25px;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid {brand_color};
            padding-bottom: 10px;
            margin-bottom: 15px;
        }}
        .school-banner {{
            font-size: 13px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
        }}
        .title {{
            font-size: 22px;
            font-weight: 800;
            color: {brand_color};
            text-transform: uppercase;
        }}
        .sub-title {{
            font-size: 14px;
            font-weight: 600;
            color: #6B7280;
            margin-top: 3px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 15px;
            font-size: 13px;
            background: #F8FAFC;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #E2E8F0;
        }}
        table.receipt-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
        }}
        table.receipt-table th {{
            background: {brand_color};
            color: #fff;
            padding: 8px 12px;
            border: 1px solid {brand_color};
        }}
        .total-box {{
            text-align: right;
            font-size: 18px;
            font-weight: 800;
            color: {brand_color};
            padding: 10px 0;
            border-top: 2px solid {brand_color};
        }}
        .status-badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            background: {'#D1FAE5' if receipt.status == 'CONFIRMED' else '#FEE2E2'};
            color: {'#065F46' if receipt.status == 'CONFIRMED' else '#991B1B'};
            font-size: 11px;
        }}
        @media print {{
            .receipt-box {{
                border: 2px solid {brand_color} !important;
                box-shadow: none !important;
                padding: 15px !important;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
        <div class="receipt-box">
            <div class="header">
                <div class="school-banner">{school_name}</div>
                <div class="title">OFFICIAL FEE RECEIPT</div>
                <div class="sub-title">Receipt No: <strong>{receipt.receipt_no}</strong></div>
            </div>

            <div class="info-grid">
                <div><strong>Student Name:</strong> {st_name}</div>
                <div><strong>Admission No:</strong> {adm_no}</div>
                <div><strong>Payment Date:</strong> {receipt.collection_date}</div>
                <div><strong>Payment Mode:</strong> {receipt.payment_mode.name if receipt.payment_mode else 'Cash'}</div>
                <div><strong>Status:</strong> <span class="status-badge">{receipt.status}</span></div>
                <div><strong>Cashier:</strong> {receipt.collected_by.username if receipt.collected_by else 'Admin'}</div>
            </div>

            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {item_rows}
                </tbody>
            </table>

            <div class="total-box">
                Total Paid: ₹{receipt.total_amount_paid}
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; color: #6B7280;">
                <div>* Computer-generated official transaction receipt.</div>
                <div style="border-top: 1px solid #9CA3AF; width: 140px; text-align: center; padding-top: 4px;">Authorized Signature</div>
            </div>
        </div>
    </div>
</body>
</html>
"""
        return html
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

        st_name = student.get('student_name', 'Student')
        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Report Card — {st_name} ({student.get('class_name', '')})",
            doc_badge="ACADEMIC REPORT CARD",
            brand_color=brand_color,
            orientation="portrait",
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Report Card - {st_name}</title>
    <style>
        {toolbar['css']}
        .report-card-container {{
            max-width: 820px;
            margin: 0 auto;
            border: 3px double {brand_color};
            padding: 25px;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }}
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
        @media print {{
            .report-card-container {{
                border: 3px double {brand_color} !important;
                box-shadow: none !important;
                padding: 15px !important;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
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
                <div class="sig-box" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
                    {f'<img src="{data.get("principal_signature_image")}" alt="Principal Signature" style="max-height:30px;margin-bottom:2px;object-fit:contain;"/>' if data.get("principal_signature_image") else ''}
                    <span>Principal</span>
                </div>
            </div>
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

        st_name = student.get('full_name') or "Student"
        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Transfer Certificate — {tc_no} ({st_name})",
            doc_badge="SCHOOL LEAVING CERTIFICATE",
            brand_color=brand_color,
            orientation="portrait",
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Transfer Certificate - {tc_no}</title>
    <style>
        {toolbar['css']}
        .tc-border {{
            max-width: 820px;
            margin: 0 auto;
            border: 4px double {brand_color};
            padding: 30px;
            border-radius: 6px;
            background: #ffffff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }}
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
        @media print {{
            .tc-border {{
                border: 4px double {brand_color} !important;
                box-shadow: none !important;
                padding: 20px !important;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
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
                <div class="tc-field"><div class="tc-label">9. Month up to which School Dues Paid:</div><div class="tc-val"><strong>{data.get('dues_status', 'All Clear (Verified)')}</strong></div></div>
                <div class="tc-field"><div class="tc-label">10. Total No. of Working Days in Session:</div><div class="tc-val">220 Days</div></div>
                <div class="tc-field"><div class="tc-label">11. Total No. of Days Present:</div><div class="tc-val">208 Days</div></div>
                <div class="tc-field"><div class="tc-label">12. Reason for Leaving the School:</div><div class="tc-val"><strong>{leaving_reason}</strong></div></div>
                <div class="tc-field"><div class="tc-label">13. General Conduct & Character:</div><div class="tc-val"><strong>{conduct}</strong></div></div>
            </div>

            <div class="qr-zone">
                <div style="display:flex;align-items:center;gap:15px;">
                    <div class="qr-box">
                        <div style="font-size:32px;line-height:1;">📱</div>
                        Scan to Verify
                    </div>
                    {f'<img src="{data.get("school_seal_image")}" alt="School Seal" style="width:75px;height:75px;object-fit:contain;"/>' if data.get("school_seal_image") else ''}
                </div>
                <div class="signatures">
                    <div class="sig">Class Teacher</div>
                    <div class="sig">Checked By (Clerk)</div>
                    <div class="sig" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
                        {f'<img src="{data.get("principal_signature_image")}" alt="Principal Signature" style="max-height:36px;margin-bottom:2px;object-fit:contain;"/>' if data.get("principal_signature_image") else ''}
                        <span>Principal (Seal)</span>
                    </div>
                </div>
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

        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Batch Student ID Cards ({len(students)} Students)",
            doc_badge="IDENTITY CARDS (CR-80)",
            brand_color=brand_color,
            orientation="portrait",
        )

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Batch Student ID Cards</title>
    <style>
        {toolbar['css']}
        .sheet-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            max-width: 760px;
            margin: 0 auto;
        }}
        .id-card {{
            width: 350px;
            height: 220px;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }}
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
        @media print {{
            .sheet-grid {{
                max-width: 100% !important;
                margin: 0 !important;
            }}
            .id-card {{
                box-shadow: none !important;
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
        <div class="sheet-grid">
            {cards_html}
        </div>
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

        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Disciplinary Notice — {ref_no}",
            doc_badge="OFFICIAL WARNING NOTICE",
            brand_color=brand_color,
            orientation="portrait",
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Disciplinary Notice - {ref_no}</title>
    <style>
        {toolbar['css']}
        .notice-border {{
            max-width: 820px;
            margin: 0 auto;
            border: 3px double {brand_color};
            padding: 35px;
            border-radius: 6px;
            background: #ffffff;
            line-height: 1.6;
            font-size: 15px;
            font-family: 'Times New Roman', serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }}
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
        @media print {{
            .notice-border {{
                border: 3px double {brand_color} !important;
                box-shadow: none !important;
                padding: 20px !important;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
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

        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Certificate of Merit — {st.get('student_name', 'Student')}",
            doc_badge="MERIT & HONORS",
            brand_color=brand_color,
            orientation="landscape",
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificate of Merit - {st.get('student_name', 'Student')}</title>
    <style>
        {toolbar['css']}
        .cert-container {{
            max-width: 950px;
            margin: 0 auto;
            border: 8px double {brand_color};
            padding: 35px 50px;
            border-radius: 12px;
            text-align: center;
            position: relative;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            font-family: 'Georgia', 'Times New Roman', serif;
        }}
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
        @media print {{
            .cert-container {{
                border: 8px double {brand_color} !important;
                box-shadow: none !important;
                padding: 25px !important;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
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
    </div>
</body>
</html>
"""
        return html_content

    @staticmethod
    def generate_fee_card_html(data: Dict[str, Any], school_name: str = "7A Model Academy", brand_color: str = "#1E40AF") -> str:
        """
        Renders a 2-sided pocket fee card (Front: Particulars & Rules, Back: Payment Matrix & Ledger)
        matching Indian physical school fee cards.
        """
        student = data.get("student", {})
        academic_year = data.get("academic_year", {})
        installments = data.get("installments", [])
        totals = data.get("totals", {})
        school_info = data.get("school_info", {})
        currency = school_info.get("currency_symbol", "₹")

        matrix_rows = ""
        for item in installments:
            bal = float(item.get("balance", 0.0))
            demand_val = float(item.get("demand", 0.0))
            concession_val = float(item.get("concession", 0.0))
            net_val = float(item.get("net_payable", 0.0))
            paid_val = float(item.get("paid", 0.0))

            balance_style = "color:#DC2626;font-weight:bold;" if bal > 0 else "color:#16A34A;font-weight:bold;"
            receipt_info = f"{item['receipt_no']} ({item['paid_date']})" if item.get('receipt_no') else "-"
            matrix_rows += f"""
            <tr>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; font-weight: 600;">{item.get('name', '-')}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: center; font-size: 11px;">{item.get('due_date', '-')}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right;">{currency}{demand_val:.2f}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right; color: #475569;">{currency}{concession_val:.2f}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right; font-weight: 600;">{currency}{net_val:.2f}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right; font-weight: bold; color: #047857;">{currency}{paid_val:.2f}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: center; font-size: 11px;">{receipt_info}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: right; {balance_style}">{currency}{bal:.2f}</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1; text-align: center; color: #94A3B8; font-size: 10px;">{item.get('cashier_sign', '')}</td>
            </tr>
            """

        empty_needed = max(0, 4 - len(installments))
        for _ in range(empty_needed):
            matrix_rows += f"""
            <tr style="height: 32px;">
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;">&nbsp;</td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
                <td style="padding: 7px 10px; border: 1px solid #CBD5E1;"></td>
            </tr>
            """

        gross_demand = float(totals.get('gross_demand', 0.0))
        concession_total = float(totals.get('concession', 0.0))
        total_paid = float(totals.get('total_paid', 0.0))
        balance_due = float(totals.get('balance_due', 0.0))
        balance_color = "#DC2626" if balance_due > 0 else "#16A34A"

        toolbar = DocumentGeneratorService.get_toolbar_component(
            doc_title=f"Fee Card — {student.get('full_name', 'Student')} ({student.get('admission_no', '')})",
            doc_badge="STUDENT FEE CARD & LEDGER",
            brand_color=brand_color,
            orientation="portrait",
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fee Card - {student.get('full_name', 'Student')} ({student.get('admission_no', '')})</title>
    <style>
        {toolbar['css']}
        @page {{
            size: A4 portrait;
            margin: 10mm;
        }}
        * {{ box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1E293B;
            background: #F8FAFC;
            margin: 0;
            padding: 0;
            font-size: 12px;
        }}
        @media print {{
            body {{ background: #fff; padding: 0; }}
            .card-page {{ page-break-after: always; border: 2px solid {brand_color} !important; box-shadow: none !important; }}
            .card-page:last-child {{ page-break-after: auto; }}
        }}
        .card-page {{
            max-width: 760px;
            margin: 0 auto 25px auto;
            background: #fff;
            border: 2px solid {brand_color};
            border-radius: 10px;
            padding: 22px 26px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            position: relative;
        }}
        .school-header {{
            text-align: center;
            border-bottom: 2px solid {brand_color};
            padding-bottom: 10px;
            margin-bottom: 12px;
        }}
        .school-title {{
            font-size: 24px;
            font-weight: 800;
            color: {brand_color};
            text-transform: uppercase;
            margin: 0;
            letter-spacing: 0.5px;
        }}
        .school-sub {{
            font-size: 11px;
            color: #64748B;
            margin-top: 3px;
        }}
        .card-type-banner {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #EEF2F6;
            border-radius: 6px;
            padding: 6px 14px;
            margin-bottom: 14px;
            font-weight: bold;
        }}
        .badge-session {{
            background: {brand_color};
            color: #fff;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
        }}
        .medium-check {{
            display: flex;
            gap: 12px;
            font-size: 11px;
        }}
        .medium-check span {{
            border: 1px solid #94A3B8;
            padding: 1px 6px;
            border-radius: 3px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
            background: #F1F5F9;
            padding: 12px 14px;
            border-radius: 8px;
            margin-bottom: 14px;
            border: 1px solid #E2E8F0;
        }}
        .info-item {{
            display: flex;
            align-items: baseline;
            gap: 6px;
        }}
        .info-label {{
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            min-width: 110px;
        }}
        .info-val {{
            font-weight: 700;
            color: #0F172A;
            border-bottom: 1px dotted #94A3B8;
            flex: 1;
        }}
        .rules-box {{
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 14px;
            background: #FAFAFA;
        }}
        .rules-title {{
            font-weight: bold;
            font-size: 12px;
            color: {brand_color};
            margin-bottom: 6px;
            text-transform: uppercase;
        }}
        .rules-list {{
            margin: 0;
            padding-left: 18px;
            line-height: 1.6;
            color: #334155;
            font-size: 11px;
        }}
        .sign-row {{
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
            padding-top: 15px;
        }}
        .sign-col {{
            text-align: center;
            width: 170px;
            border-top: 1px solid #475569;
            padding-top: 5px;
            font-size: 11px;
            font-weight: bold;
            color: #334155;
        }}
        table.matrix-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 14px;
            font-size: 11px;
        }}
        table.matrix-table th {{
            background: {brand_color};
            color: #fff;
            padding: 8px;
            border: 1px solid {brand_color};
            text-align: center;
            font-size: 11px;
        }}
        .summary-box {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            background: #F8FAFC;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 16px;
            text-align: center;
        }}
        .summary-card {{
            padding: 6px;
            border-radius: 6px;
            background: #fff;
            border: 1px solid #E2E8F0;
        }}
        .summary-card .label {{
            font-size: 10px;
            color: #64748B;
            text-transform: uppercase;
            font-weight: 600;
        }}
        .summary-card .val {{
            font-size: 14px;
            font-weight: 800;
            margin-top: 2px;
        }}
        .watermark {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 48px;
            color: rgba(30, 64, 175, 0.04);
            font-weight: 900;
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="printable-content">
        <!-- SIDE 1: FRONT -->
    <div class="card-page">
        <div class="watermark">{school_name}</div>
        <div class="school-header">
            <h1 class="school-title">{school_name}</h1>
            <div class="school-sub">{school_info.get('address', 'Recognized & Affiliated Institution')}</div>
            <div class="school-sub">Contact: {school_info.get('phone', 'School Office')} | Email: {school_info.get('email', 'office@school.edu')}</div>
        </div>

        <div class="card-type-banner">
            <span style="color: {brand_color}; font-size: 13px;">STUDENT FEE CARD & IDENTITY RECORD (शुल्क कार्ड)</span>
            <span class="badge-session">Session: {academic_year.get('name', '2026-27')}</span>
            <div class="medium-check">
                <span>[ ] English</span>
                <span>[ ] Hindi</span>
                <span>[ ] Urdu</span>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Admission / Scholar No:</span>
                <span class="info-val">{student.get('admission_no', '-')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Roll Number:</span>
                <span class="info-val">{student.get('roll_no', '-')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Student Name:</span>
                <span class="info-val">{student.get('full_name', '-')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Class & Section:</span>
                <span class="info-val">{student.get('class_name', '-')} - {student.get('section_name', '-')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Father's Name:</span>
                <span class="info-val">{student.get('father_name', '-')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Mother's Name:</span>
                <span class="info-val">{student.get('mother_name', '-')}</span>
            </div>
            <div class="info-item">
                <span class="info-label">S.S.S.M. / UID No:</span>
                <span class="info-val">{student.get('aadhar_no') or student.get('sssm_id') or '-'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Registered Phone:</span>
                <span class="info-val">{student.get('emergency_contact', '-')}</span>
            </div>
            <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Residential Address:</span>
                <span class="info-val">{student.get('address', '-')}</span>
            </div>
        </div>

        <div class="rules-box">
            <div class="rules-title">आवश्यक नियम व निर्देश (Rules & Payment Instructions)</div>
            <ol class="rules-list">
                <li>प्रत्येक छात्र/छात्रा का शुल्क प्रत्येक माह अथवा त्रैमासिक किस्त की नियत तिथि तक कार्यालय में जमा करना अनिवार्य है।</li>
                <li>नियत तिथि के पश्चात विलम्ब शुल्क नियमानुसार देय होगा।</li>
                <li>शुल्क जमा कराते समय यह <strong>शुल्क कार्ड प्रस्तुत करना अनिवार्य</strong> है। बिना कार्ड के फीस स्वीकार नहीं की जाएगी।</li>
                <li>जमा किए गए शुल्क की आधिकारिक कम्प्यूटरीकृत रसीद अनिवार्य रूप से प्राप्त करें एवं संभाल कर रखें।</li>
                <li>शुल्क एक बार जमा होने के पश्चात किसी भी परिस्थिति में वापस अथवा समायोजित नहीं किया जाएगा।</li>
                <li>वार्षिक परीक्षा में सम्मिलित होने हेतु समस्त सत्र का शुल्क पूर्णतः चुकता (No-Dues) होना अनिवार्य है।</li>
            </ol>
        </div>

        <div class="sign-row">
            <div class="sign-col">Parent / Guardian Signature</div>
            <div class="sign-col">Class Teacher Signature</div>
            <div class="sign-col">Principal / Headmaster (Seal)</div>
        </div>
    </div>

    <!-- SIDE 2: BACK -->
    <div class="card-page">
        <div class="watermark">{school_name}</div>
        <div class="school-header" style="padding-bottom: 6px; margin-bottom: 8px;">
            <div style="font-weight: 800; font-size: 16px; color: {brand_color}; text-transform: uppercase;">
                FEE PAYMENT INSTALLMENT RECORD (शुल्क भुगतान विवरणी)
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                Scholar No: <strong>{student.get('admission_no', '-')}</strong> | Student: <strong>{student.get('full_name', '-')}</strong> | Class: <strong>{student.get('class_name', '-')} - {student.get('section_name', '-')}</strong>
            </div>
        </div>

        <table class="matrix-table">
            <thead>
                <tr>
                    <th>Installment / Period</th>
                    <th>Due Date</th>
                    <th>Gross Demand</th>
                    <th>Concession</th>
                    <th>Net Payable</th>
                    <th>Amount Paid</th>
                    <th>Receipt No / Date</th>
                    <th>Balance Due</th>
                    <th>Cashier Sign</th>
                </tr>
            </thead>
            <tbody>
                {matrix_rows}
            </tbody>
        </table>

        <div class="summary-box">
            <div class="summary-card">
                <div class="label">Total Annual Fee</div>
                <div class="val" style="color: #1E293B;">{currency}{gross_demand:.2f}</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Concession</div>
                <div class="val" style="color: #6366F1;">{currency}{concession_total:.2f}</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Paid</div>
                <div class="val" style="color: #059669;">{currency}{total_paid:.2f}</div>
            </div>
            <div class="summary-card">
                <div class="label">Outstanding Dues</div>
                <div class="val" style="color: {balance_color};">
                    {currency}{balance_due:.2f}
                </div>
            </div>
        </div>

        <div style="background: #F1F5F9; border-radius: 6px; padding: 8px 12px; font-size: 10px; color: #475569; border-left: 3px solid {brand_color};">
            <strong>Ledger Note:</strong> This document reflects the verified multi-session student ledger record generated from the School ERP. All payments are backed by system-generated receipt numbers.
        </div>

        <div class="sign-row" style="margin-top: 30px;">
            <div class="sign-col">Prepared By (Cashier)</div>
            <div class="sign-col">Accountant / Office In-Charge</div>
            <div class="sign-col">Principal / Head of School</div>
        </div>
    </div>
    </div>
</body>
</html>"""
        return html_content

    @staticmethod
    def date_to_english_words(d: Optional[date]) -> str:
        """Converts a Python date object into formal Christian English words."""
        if not d:
            return "-"
        days_map = {
            1: "First", 2: "Second", 3: "Third", 4: "Fourth", 5: "Fifth",
            6: "Sixth", 7: "Seventh", 8: "Eighth", 9: "Ninth", 10: "Tenth",
            11: "Eleventh", 12: "Twelfth", 13: "Thirteenth", 14: "Fourteenth", 15: "Fifteenth",
            16: "Sixteenth", 17: "Seventeenth", 18: "Eighteenth", 19: "Nineteenth", 20: "Twentieth",
            21: "Twenty-First", 22: "Twenty-Second", 23: "Twenty-Third", 24: "Twenty-Fourth", 25: "Twenty-Fifth",
            26: "Twenty-Sixth", 27: "Twenty-Seventh", 28: "Twenty-Eighth", 29: "Twenty-Ninth", 30: "Thirtieth",
            31: "Thirty-First"
        }
        months_map = {
            1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
            7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December"
        }

        def num_to_words(n: int) -> str:
            ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                    "Seventeen", "Eighteen", "Nineteen"]
            tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
            if n < 20:
                return ones[n]
            elif n < 100:
                return tens[n // 10] + (" " + ones[n % 10] if n % 10 != 0 else "")
            elif n < 1000:
                return ones[n // 100] + " Hundred" + (" and " + num_to_words(n % 100) if n % 100 != 0 else "")
            elif n < 1000000:
                return num_to_words(n // 1000) + " Thousand" + (" " + num_to_words(n % 1000) if n % 1000 != 0 else "")
            return str(n)

        day_word = days_map.get(d.day, str(d.day))
        month_word = months_map.get(d.month, "")
        year_word = num_to_words(d.year)
        return f"{day_word} {month_word} {year_word}"

    @classmethod
    def generate_general_register_html(
        cls,
        students_records: list,
        school_info: Dict[str, Any],
        brand_color: str = "#1E40AF",
        filter_label: str = "All Enrolled Students",
    ) -> str:
        """
        Renders the Statutory 2-Page General Register (G.R. / Scholar Register)
        matching Gujarat Primary/Secondary Education Regulations and National CBSE Gazette standards.
        Designed for A3/A4 landscape dual-page side-by-side spread printing.
        """
        toolbar = cls.get_toolbar_component(
            doc_title=f"Statutory General Register (G.R. Ledger) — {filter_label}",
            doc_badge="STATUTORY GAZETTE REGISTER",
            brand_color=brand_color,
            orientation="landscape",
        )

        def render_digit_boxes(val: Any, length: int) -> str:
            cleaned = (str(val) if val is not None else "").replace(" ", "").replace("-", "")
            boxes = []
            for i in range(length):
                ch = cleaned[i] if i < len(cleaned) else "&nbsp;"
                boxes.append(f'<span class="digit-box">{ch}</span>')
            return "".join(boxes)

        school_name = school_info.get("school_name", "7A Model Academy")
        dise_code = school_info.get("dise_code", "24070501234")
        affiliation_no = school_info.get("affiliation_no", "CBSE/GUJ/2026/089")
        board_name = school_info.get("board", "State Board of Secondary Education / CBSE")
        school_address = school_info.get("address", "Ahmedabad, Gujarat, India")

        spreads_html = []

        if not students_records:
            spreads_html.append("""
            <div style="background: #fff; padding: 40px; text-align: center; border-radius: 8px; font-size: 15px; color: #64748b;">
                No student records found for the selected General Register query.
            </div>
            """)

        for idx, st in enumerate(students_records, start=1):
            gr_no = st.get("admission_no", "-")
            student_name = st.get("student_name", "-")
            father_name = st.get("father_name", "-")
            surname = st.get("surname", "-")
            mother_name = st.get("mother_name", "-")
            gender = st.get("gender", "-")
            religion = st.get("religion", "-")
            caste = st.get("caste", "-")
            category = st.get("category", "General")
            birth_place_village = st.get("birth_place_village", "-")
            birth_place_taluka = st.get("birth_place_taluka", "-")
            birth_place_district = st.get("birth_place_district", "-")
            birth_place_state = st.get("birth_place_state", "Gujarat")

            dob_obj = st.get("dob_date")
            dob_fig = st.get("dob_fig", "-")
            dob_words = st.get("dob_words") or cls.date_to_english_words(dob_obj)

            apaar_id = st.get("apaar_id", "")
            aadhaar_no = st.get("aadhaar_no", "")
            uid_18 = st.get("uid_18", "")
            pen_11 = st.get("pen_11", "")

            last_school = st.get("last_school", "Direct Admission / None")
            last_standard = st.get("last_standard", "-")
            admission_date = st.get("admission_date", "-")
            class_admitted = st.get("class_admitted", "-")
            current_class = st.get("current_class", "-")
            current_section = st.get("current_section", "-")
            rte_quota = "YES (RTE 25%)" if st.get("is_rte") else "NO"
            progress = st.get("progress", "Satisfactory / Good")
            conduct = st.get("conduct", "Good (ઉત્તમ)")
            leaving_date = st.get("leaving_date", "Currently Studying")
            standard_left = st.get("standard_left", "-")
            reason_leaving = st.get("reason_leaving", "-")
            remarks = st.get("remarks", "Official Enrollment Verified")
            address = st.get("address", "-")
            phone = st.get("phone", "-")

            apaar_boxes = render_digit_boxes(apaar_id, 12)
            aadhaar_boxes = render_digit_boxes(aadhaar_no, 12)
            uid_boxes = render_digit_boxes(uid_18, 18)
            pen_boxes = render_digit_boxes(pen_11, 11)

            spread = f"""
            <div class="ledger-spread">
                <!-- LEFT PAGE: DEMOGRAPHICS & IDENTITY -->
                <div class="ledger-page">
                    <div class="page-side-tag">LEFT PAGE (ડાબો પાન) — DEMOGRAPHICS & IDENTITY</div>
                    <div class="header-box">
                        <div class="school-title">{school_name}</div>
                        <div class="school-subtitle">{school_address}</div>
                        <div class="register-heading">GENERAL REGISTER (જનરલ રજીસ્ટર)</div>
                    </div>

                    <div class="gr-top-row">
                        <div class="gr-badge-box">
                            <span class="gr-label">G.R. NO. / રજીસ્ટર નં.</span>
                            <span class="gr-val">{gr_no}</span>
                        </div>
                        <div class="gr-sub-info">
                            <div><strong>Current Class:</strong> {current_class} - {current_section}</div>
                            <div><strong>Phone:</strong> {phone}</div>
                        </div>
                    </div>

                    <div class="field-section-title">1. STUDENT NAME BREAKDOWN (વિદ્યાર્થી નામ વિગત)</div>
                    <table class="data-table">
                        <tr>
                            <td class="col-lbl" style="width: 38%;">Student Name (વિદ્યાર્થીનું નામ):</td>
                            <td class="col-val"><strong>{student_name}</strong></td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Father's Name (પિતાનું નામ):</td>
                            <td class="col-val">{father_name}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Surname (અટક):</td>
                            <td class="col-val"><strong>{surname}</strong></td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Mother's Name (માતાનું નામ):</td>
                            <td class="col-val">{mother_name}</td>
                        </tr>
                    </table>

                    <div class="field-section-title">2. SOCIAL & COMMUNITY IDENTITY (સામાજિક વિગત)</div>
                    <table class="data-table">
                        <tr>
                            <td class="col-lbl" style="width: 25%;">Gender (જાતિ):</td>
                            <td class="col-val" style="width: 25%;">{gender}</td>
                            <td class="col-lbl" style="width: 25%;">Religion (ધર્મ):</td>
                            <td class="col-val" style="width: 25%;">{religion}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Caste / Sub-Caste:</td>
                            <td class="col-val">{caste}</td>
                            <td class="col-lbl">Social Category:</td>
                            <td class="col-val"><strong>{category}</strong></td>
                        </tr>
                    </table>

                    <div class="field-section-title">3. BIRTHPLACE & DATE OF BIRTH (જન્મ સ્થળ અને જન્મ તારીખ)</div>
                    <table class="data-table">
                        <tr>
                            <td class="col-lbl" style="width: 25%;">Village / Town:</td>
                            <td class="col-val" style="width: 25%;">{birth_place_village}</td>
                            <td class="col-lbl" style="width: 25%;">Taluka / Tehsil:</td>
                            <td class="col-val" style="width: 25%;">{birth_place_taluka}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">District (જિલ્લો):</td>
                            <td class="col-val">{birth_place_district}</td>
                            <td class="col-lbl">State (રાજ્ય):</td>
                            <td class="col-val">{birth_place_state}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">DOB in Figures (અંકમાં):</td>
                            <td class="col-val" colspan="3"><strong style="font-size:12px; color:#1E40AF;">{dob_fig}</strong> (DD/MM/YYYY)</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">DOB in Words (શબ્દોમાં):</td>
                            <td class="col-val" colspan="3"><em>{dob_words}</em></td>
                        </tr>
                    </table>

                    <div class="field-section-title">4. STATUTORY NATIONAL IDENTIFIERS</div>
                    <div class="box-digit-group">
                        <div class="box-digit-title">APAAR ID (Automated Permanent Academic Account Registry - 12 Digits):</div>
                        <div class="digit-box-container">{apaar_boxes}</div>
                    </div>
                    <div class="box-digit-group" style="margin-top:6px;">
                        <div class="box-digit-title">Aadhaar Card No. (12 Digits):</div>
                        <div class="digit-box-container">{aadhaar_boxes}</div>
                    </div>

                    <div style="margin-top: 8px; font-size: 10px; color: #475569;">
                        <strong>Address:</strong> {address}
                    </div>
                </div>

                <!-- RIGHT PAGE: ACADEMIC LIFECYCLE & DISCHARGE -->
                <div class="ledger-page">
                    <div class="page-side-tag">RIGHT PAGE (જમણો પાન) — ACADEMIC LIFECYCLE & DISCHARGE</div>
                    <div class="header-box">
                        <div class="school-title">DISE CODE: {dise_code} | BOARD: {affiliation_no}</div>
                        <div class="school-subtitle">{board_name}</div>
                        <div class="register-heading">ENROLLMENT, PROGRESS & SCHOOL LEAVING RECORD</div>
                    </div>

                    <div class="field-section-title">5. CHILD TRACKING & NATIONAL PORTAL IDS</div>
                    <div class="box-digit-group">
                        <div class="box-digit-title">Gujarat Child Tracking 18-Digit UID:</div>
                        <div class="digit-box-container">{uid_boxes}</div>
                    </div>
                    <div class="box-digit-group" style="margin-top:6px;">
                        <div class="box-digit-title">UDISE+ Permanent Education Number (PEN - 11 Digits):</div>
                        <div class="digit-box-container">{pen_boxes}</div>
                    </div>

                    <div class="field-section-title">6. ADMISSION & PREVIOUS ACADEMIC RECORD</div>
                    <table class="data-table">
                        <tr>
                            <td class="col-lbl" style="width: 35%;">Last School Attended:</td>
                            <td class="col-val" colspan="3">{last_school}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Last Standard Studied:</td>
                            <td class="col-val" style="width: 25%;">{last_standard}</td>
                            <td class="col-lbl" style="width: 20%;">RTE 25% Quota:</td>
                            <td class="col-val" style="width: 20%;"><strong style="color: {'#16A34A' if st.get('is_rte') else '#475569'};">{rte_quota}</strong></td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Date of Admission:</td>
                            <td class="col-val">{admission_date}</td>
                            <td class="col-lbl">Admitted Standard:</td>
                            <td class="col-val"><strong>{class_admitted}</strong></td>
                        </tr>
                    </table>

                    <div class="field-section-title">7. ACADEMIC PROGRESS & CONDUCT</div>
                    <table class="data-table">
                        <tr>
                            <td class="col-lbl" style="width: 35%;">Academic Progress (પ્રગતિ):</td>
                            <td class="col-val" style="width: 65%;">{progress}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Conduct & Character (ચાલચલગત):</td>
                            <td class="col-val"><strong>{conduct}</strong></td>
                        </tr>
                    </table>

                    <div class="field-section-title">8. SCHOOL LEAVING & DISCHARGE (શાળા છોડ્યા વિગત)</div>
                    <table class="data-table">
                        <tr>
                            <td class="col-lbl" style="width: 35%;">Date of Leaving (છોડ્યા તારીખ):</td>
                            <td class="col-val">{leaving_date}</td>
                            <td class="col-lbl" style="width: 25%;">Standard Left:</td>
                            <td class="col-val">{standard_left}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Reason for Leaving (કારણ):</td>
                            <td class="col-val" colspan="3">{reason_leaving}</td>
                        </tr>
                        <tr>
                            <td class="col-lbl">Statutory Remarks (નોંધ):</td>
                            <td class="col-val" colspan="3">{remarks}</td>
                        </tr>
                    </table>

                    <div class="sign-section">
                        <div class="sign-block">
                            <div class="sign-line"></div>
                            <div class="sign-title">Class Teacher Signature</div>
                        </div>
                        <div class="sign-block">
                            <div class="sign-line"></div>
                            <div class="sign-title">Head Clerk / Registrar</div>
                        </div>
                        <div class="sign-block">
                            <div class="sign-line"></div>
                            <div class="sign-title">Principal / Headmaster (with Seal)</div>
                        </div>
                    </div>
                </div>
            </div>
            """
            spreads_html.append(spread)

        spreads_content = "\n".join(spreads_html)

        html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>General Register (G.R. Ledger) — {school_name}</title>
    <style>
        {toolbar['css']}
        
        .ledger-wrapper {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        .ledger-spread {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            background: #FFFFFF;
            border: 2px solid #0F172A;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 28px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            page-break-inside: avoid;
            page-break-after: always;
            break-after: page;
        }}
        
        .ledger-page {{
            border: 1.5px solid #334155;
            padding: 12px 14px;
            background: #FCFDFE;
            position: relative;
            font-size: 11px;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        
        .page-side-tag {{
            font-size: 9px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-bottom: 1px dashed #CBD5E1;
            padding-bottom: 3px;
            margin-bottom: 6px;
        }}
        
        .header-box {{
            text-align: center;
            border-bottom: 1.5px solid #0F172A;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }}
        
        .school-title {{
            font-size: 14px;
            font-weight: 800;
            color: {brand_color};
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .school-subtitle {{
            font-size: 10px;
            color: #475569;
        }}
        
        .register-heading {{
            font-size: 11px;
            font-weight: 800;
            color: #0F172A;
            margin-top: 3px;
            letter-spacing: 0.5px;
        }}
        
        .gr-top-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 8px;
        }}
        
        .gr-badge-box {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        
        .gr-label {{
            font-size: 10px;
            font-weight: 700;
            color: #475569;
        }}
        
        .gr-val {{
            font-size: 15px;
            font-weight: 900;
            color: {brand_color};
            background: #FFFFFF;
            border: 1px solid #94A3B8;
            padding: 2px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }}
        
        .gr-sub-info {{
            font-size: 10px;
            color: #334155;
            text-align: right;
        }}
        
        .field-section-title {{
            font-size: 10px;
            font-weight: 800;
            color: #1E293B;
            background: #E2E8F0;
            padding: 3px 6px;
            border-left: 3px solid {brand_color};
            margin-top: 8px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }}
        
        .data-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
        }}
        
        .data-table td {{
            border: 1px solid #E2E8F0;
            padding: 3.5px 6px;
            vertical-align: middle;
        }}
        
        .col-lbl {{
            background: #F8FAFC;
            color: #475569;
            font-weight: 600;
            font-size: 10px;
        }}
        
        .col-val {{
            color: #0F172A;
        }}
        
        .box-digit-group {{
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: 4px 6px;
        }}
        
        .box-digit-title {{
            font-size: 9px;
            font-weight: 700;
            color: #475569;
            margin-bottom: 3px;
        }}
        
        .digit-box-container {{
            display: flex;
            gap: 3px;
            flex-wrap: wrap;
        }}
        
        .digit-box {{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 18px;
            border: 1px solid #475569;
            background: #FFFFFF;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            font-weight: 800;
            color: #0F172A;
            border-radius: 2px;
        }}
        
        .sign-section {{
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-top: 20px;
            padding-top: 10px;
        }}
        
        .sign-block {{
            text-align: center;
        }}
        
        .sign-line {{
            border-bottom: 1px solid #475569;
            height: 24px;
            margin-bottom: 4px;
        }}
        
        .sign-title {{
            font-size: 9px;
            font-weight: 700;
            color: #334155;
        }}
        
        @media print {{
            .ledger-wrapper {{
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }}
            .ledger-spread {{
                border: 2px solid #000000 !important;
                box-shadow: none !important;
                margin-bottom: 0 !important;
            }}
            .ledger-page {{
                border: 1px solid #000000 !important;
                background: #FFFFFF !important;
            }}
        }}
    </style>
</head>
<body>
    {toolbar['html']}
    <div class="document-toolbar-spacer no-print"></div>

    <div class="printable-content">
        <div class="ledger-wrapper">
            {spreads_content}
        </div>
    </div>
</body>
</html>"""
        return html_doc


