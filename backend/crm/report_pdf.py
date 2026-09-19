from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from .analytics import PDF_COLUMNS, display_name, percentage


REPORT_FILE_NAMES = {
    "lead-sources": "Lead_Source_Report",
    "lead-conversion": "Lead_Conversion_Report",
    "lead-status": "Assessment_Status_Report",
    "sales-rep-performance": "Sales_Rep_Performance_Report",
    "deals": "Deal_Pipeline_Report",
}


@dataclass(frozen=True)
class PdfReport:
    content: bytes
    filename: str


def _humanize(value: str) -> str:
    return value.replace("_", " ").title()


def _display_cell(key: str, value: Any) -> str:
    if value in (None, ""):
        return "-"
    if key == "assessment_stage":
        return _humanize(str(value))
    if key.endswith("_at") or key == "created_at":
        try:
            parsed = datetime.fromisoformat(str(value))
            if timezone.is_aware(parsed):
                parsed = timezone.localtime(parsed)
            return parsed.strftime("%d %b %Y")
        except ValueError:
            return str(value)
    return str(value)


def _filter_rows(filters: dict[str, Any], options: dict[str, Any], report_name: str):
    option_maps = {
        "source": {item["value"]: item["label"] for item in options["sources"]},
        "status": {item["value"]: item["label"] for item in options["statuses"]},
        "assessment_stage": {
            item["value"]: item["label"] for item in options["assessment_stages"]
        },
        "final_decision": {
            item["value"]: item["label"] for item in options["final_decisions"]
        },
        "deal_status": {
            item["value"]: item["label"] for item in options["deal_statuses"]
        },
    }
    rep_names = {item["id"]: item["name"] for item in options["sales_reps"]}
    rows = [
        ("Reporting Period", f'{filters["date_from"].strftime("%d %B %Y")} - {filters["date_to"].strftime("%d %B %Y")}'),
        ("Sales Representative", rep_names.get(filters.get("sales_rep"), "All Sales Representatives")),
        ("Lead Source", option_maps["source"].get(filters.get("source"), "All Sources")),
        ("Lead Status", option_maps["status"].get(filters.get("status"), "All Statuses")),
        ("Assessment Stage", option_maps["assessment_stage"].get(filters.get("assessment_stage"), "All Stages")),
        ("Final Decision", option_maps["final_decision"].get(filters.get("final_decision"), "All Decisions")),
    ]
    if report_name == "deals":
        rows.append(("Deal Status", option_maps["deal_status"].get(filters.get("deal_status"), "All Deal Statuses")))
    return rows


def _summary_cards(report_name: str, payload: dict[str, Any]):
    del report_name
    return [
        (metric["label"], f'{metric["value"]}{metric.get("suffix", "")}')
        for metric in payload["metrics"]
    ]


def _visual_rows(report_name: str, payload: dict[str, Any]):
    if report_name == "lead-sources":
        rows = [{"label": row["source_display"], "value": row["leads"]} for row in payload["summary"]]
    elif report_name == "lead-status":
        rows = [{"label": _humanize(key), "value": value} for key, value in payload["distributions"].get("assessment_stages", {}).items()]
    elif report_name == "sales-rep-performance":
        rows = [{"label": row["sales_rep_name"], "value": row["deals"]} for row in payload["summary"]]
    elif report_name == "deals":
        counts = payload["distributions"].get("deal_statuses", {})
        rows = [{"label": label, "value": value} for label, value in counts.items()]
    else:
        values = {metric["key"]: metric["value"] for metric in payload["metrics"]}
        rows = [{"label": "Total Leads", "value": values["total_leads"]}, {"label": "Proceed Decisions", "value": values["proceed"]}, {"label": "Deals Created", "value": values["deals"]}]
    maximum = max((row["value"] for row in rows), default=0)
    return [{**row, "width": percentage(row["value"], maximum) if maximum else 0} for row in rows]


def _observations(report_name: str, payload: dict[str, Any]):
    del report_name
    return payload["observations"]


def build_pdf_context(report_name: str, payload: dict[str, Any], filters: dict[str, Any], user):
    profile = getattr(user, "profile", None)
    role = profile.get_role_display() if profile else "Authenticated User"
    generated_at = timezone.localtime()
    columns = PDF_COLUMNS[report_name]
    logo_path = Path(settings.BASE_DIR) / "static" / "reports" / "eleven-logo-horizontal.png"
    performance_columns = []
    performance_rows = []
    if report_name == "lead-sources":
        total_leads = sum(row["leads"] for row in payload["summary"])
        performance_columns = ("Source", "Leads", "% of Leads", "Proceed", "Deals", "Conversion")
        performance_rows = [
            (
                row["source_display"],
                row["leads"],
                f'{percentage(row["leads"], total_leads)}%',
                row["proceed"],
                row["deals"],
                f'{row["conversion_rate"]}%',
            )
            for row in payload["summary"]
        ]
    filter_rows = _filter_rows(filters, payload["filter_options"], report_name)
    if report_name == "deals":
        filter_groups = [
            ("Deal Filters", [row for row in filter_rows if row[0] in {"Reporting Period", "Sales Representative", "Deal Status"}]),
            ("Originating Lead Filters", [row for row in filter_rows if row[0] in {"Lead Source", "Lead Status", "Assessment Stage", "Final Decision"}]),
        ]
    else:
        filter_groups = [("Report Filters", filter_rows)]
    return {
        "report_name": report_name,
        "title": payload["title"],
        "generated_by": display_name(user),
        "generated_role": role,
        "generated_at": generated_at,
        "timezone_name": timezone.get_current_timezone_name(),
        "logo_path": str(logo_path),
        "logo_uri": logo_path.as_uri(),
        "period": f'{filters["date_from"].strftime("%d %B %Y")} - {filters["date_to"].strftime("%d %B %Y")}',
        "filters": filter_rows,
        "filter_groups": filter_groups,
        "summary_cards": _summary_cards(report_name, payload),
        "visual_rows": _visual_rows(report_name, payload),
        "observations": _observations(report_name, payload),
        "columns": columns,
        "records": payload["records"],
        "table_rows": [
            [_display_cell(key, record.get(key)) for key, _ in columns]
            for record in payload["records"]
        ],
        "performance_columns": performance_columns,
        "performance_rows": performance_rows,
        "distributions": payload["distributions"],
        "final_decision_rows": [
            (_humanize(key), value)
            for key, value in payload["distributions"].get("final_decisions", {}).items()
        ],
        "aging_records": payload["aging_records"],
        "stale_lead_days": payload["stale_lead_days"],
    }


def report_pdf_filename(report_name: str, filters: dict[str, Any]) -> str:
    return (
        f'ELEVEN_{REPORT_FILE_NAMES[report_name]}_'
        f'{filters["date_from"].isoformat()}_to_{filters["date_to"].isoformat()}.pdf'
    )


def _generate_reportlab_pdf(context: dict[str, Any]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.platypus import (
        KeepTogether,
        Image,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    navy = colors.HexColor("#101A35")
    blue = colors.HexColor("#1167D8")
    slate = colors.HexColor("#64748B")
    border = colors.HexColor("#DCE5F0")
    soft_blue = colors.HexColor("#F3F8FF")
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=13 * mm,
        leftMargin=13 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=context["title"],
        author=context["generated_by"],
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=21, leading=24, textColor=navy, alignment=0, spaceAfter=4)
    heading = ParagraphStyle("SectionHeading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=navy, spaceBefore=12, spaceAfter=7)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor("#344563"))
    small = ParagraphStyle("Small", parent=body, fontSize=7, leading=9, textColor=slate)
    card_label = ParagraphStyle("CardLabel", parent=small, fontName="Helvetica-Bold", alignment=TA_CENTER)
    card_value = ParagraphStyle("CardValue", parent=body, fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=blue, alignment=TA_CENTER)

    class NumberedCanvas(Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            page_count = len(self._saved_page_states)
            for page_number, state in enumerate(self._saved_page_states, start=1):
                self.__dict__.update(state)
                self.setFillColor(slate)
                self.setFont("Helvetica", 7)
                self.drawRightString(A4[0] - 13 * mm, 9 * mm, f"Page {page_number} of {page_count}")
                Canvas.showPage(self)
            Canvas.save(self)

    def safe(value: Any, style=body):
        from xml.sax.saxutils import escape

        return Paragraph(escape(str(value)), style)

    def page_canvas(canvas, doc):
        canvas.saveState()
        width, height = A4
        canvas.setFillColor(colors.Color(15 / 255, 45 / 255, 92 / 255, alpha=.035))
        canvas.setFont("Helvetica-Bold", 34)
        canvas.translate(width / 2, height / 2)
        canvas.rotate(28)
        canvas.drawCentredString(0, 0, "ELEVEN CRM | CONFIDENTIAL")
        canvas.rotate(-28)
        canvas.translate(-width / 2, -height / 2)
        canvas.setStrokeColor(border)
        canvas.line(13 * mm, 14 * mm, width - 13 * mm, 14 * mm)
        canvas.setFillColor(slate)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(13 * mm, 9 * mm, "ELEVEN CRM | CRM for Altrium")
        canvas.drawCentredString(width / 2, 9 * mm, "Confidential")
        canvas.restoreState()

    logo = Image(context["logo_path"], width=48 * mm, height=17.3 * mm)
    logo.hAlign = "LEFT"
    story = [
        logo,
        Paragraph("CRM FOR ALTRIUM", ParagraphStyle("BrandSub", parent=small, fontName="Helvetica-Bold", fontSize=7, leading=9, spaceAfter=12)),
        Paragraph(context["title"], title),
        Paragraph("SALES OPERATIONS ANALYTICS", ParagraphStyle("Eyebrow", parent=small, fontName="Helvetica-Bold", textColor=blue, spaceAfter=10)),
    ]
    metadata = [
        [safe("REPORTING PERIOD", card_label), safe("GENERATED BY", card_label), safe("GENERATED", card_label)],
        [safe(context["period"]), safe(f'{context["generated_by"]} - {context["generated_role"]}'), safe(f'{context["generated_at"].strftime("%d %B %Y, %H:%M")} ({context["timezone_name"]})')],
    ]
    metadata_table = Table(metadata, colWidths=[document.width / 3] * 3)
    metadata_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), soft_blue), ("BOX", (0, 0), (-1, -1), .5, border), ("INNERGRID", (0, 0), (-1, -1), .3, border), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.extend([metadata_table, Spacer(1, 6), Paragraph("Executive Summary", heading)])

    summary_labels = [safe(label, card_label) for label, _ in context["summary_cards"]]
    summary_values = [safe(value, card_value) for _, value in context["summary_cards"]]
    summary_table = Table(
        [summary_labels, summary_values],
        colWidths=[document.width / len(summary_labels)] * len(summary_labels),
    )
    summary_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), soft_blue), ("BOX", (0, 0), (-1, -1), .5, border), ("INNERGRID", (0, 0), (-1, -1), .3, border), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.extend([summary_table, Paragraph("Applied Filters", heading)])
    for group_label, rows in context["filter_groups"]:
        if len(context["filter_groups"]) > 1:
            story.append(safe(group_label, ParagraphStyle("FilterGroup", parent=body, fontName="Helvetica-Bold", textColor=navy, spaceBefore=4, spaceAfter=2)))
        filter_table = Table([[safe(label, small), safe(value)] for label, value in rows], colWidths=[document.width * .32, document.width * .68])
        filter_table.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), .3, border), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(filter_table)

    visual_title = {"lead-sources": "Source Distribution", "lead-conversion": "Conversion Flow", "lead-status": "Assessment Stage Distribution", "sales-rep-performance": "Deals by Sales Representative", "deals": "Deal Status Distribution"}[context["report_name"]]
    story.append(Paragraph(visual_title, heading))
    max_value = max((row["value"] for row in context["visual_rows"]), default=0)
    for row in context["visual_rows"]:
        filled = max(int((row["value"] / max_value) * 24), 1) if max_value else 0
        bar = "|" * filled
        visual = Table([[safe(row["label"]), safe(bar, ParagraphStyle("Bar", parent=body, fontName="Courier-Bold", textColor=blue)), safe(row["value"])]], colWidths=[document.width * .29, document.width * .61, document.width * .1])
        visual.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
        story.append(visual)

    if context["report_name"] == "lead-status":
        story.append(Paragraph("Final Decision Distribution", heading))
        decision_table = Table(
            [[safe(label), safe(value)] for label, value in context["final_decision_rows"]],
            colWidths=[document.width * .7, document.width * .3],
        )
        decision_table.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), .3, border), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.extend([decision_table, Paragraph("Lead Aging / Attention Required", heading), safe(f'Longest-running current states first. Stale means more than {context["stale_lead_days"]} days.', small)])
        aging_data = [[safe("Lead", small), safe("Current Assessment Stage", small), safe("Assigned Rep", small), safe("Days in Current State", small)]] + [[safe(row["lead"], small), safe(row["assessment_stage_display"], small), safe(row["sales_rep_name"], small), safe(row["days_in_current_state"], small)] for row in context["aging_records"]]
        aging_table = Table(aging_data, repeatRows=1, colWidths=[document.width * .3, document.width * .28, document.width * .25, document.width * .17])
        aging_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF1FA")), ("GRID", (0, 0), (-1, -1), .3, border), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(aging_table)

    if context["observations"]:
        story.append(Paragraph("Key Observations", heading))
        story.append(KeepTogether([safe(f'- {item}') for item in context["observations"]]))

    if context["performance_rows"]:
        story.append(Paragraph("Source Performance", heading))
        performance_data = [[safe(value, small) for value in context["performance_columns"]]] + [[safe(value, small) for value in row] for row in context["performance_rows"]]
        performance_table = Table(performance_data, repeatRows=1, colWidths=[document.width / len(context["performance_columns"])] * len(context["performance_columns"]))
        performance_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF1FA")), ("GRID", (0, 0), (-1, -1), .3, border), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(performance_table)

    story.append(Paragraph("Underlying Records", heading))
    if context["table_rows"]:
        table_data = [[safe(label, small) for _, label in context["columns"]]] + [[safe(value, small) for value in row] for row in context["table_rows"]]
        record_table = Table(table_data, repeatRows=1, colWidths=[document.width / len(context["columns"])] * len(context["columns"]))
        record_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF1FA")), ("GRID", (0, 0), (-1, -1), .25, border), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("FONTSIZE", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
        story.append(record_table)
    else:
        story.append(safe("No records matched the selected filters."))

    details = [
        [safe("System", small), safe("ELEVEN CRM"), safe("Organisation", small), safe("Altrium")],
        [safe("Report Type", small), safe(context["title"]), safe("Reporting Period", small), safe(context["period"])],
        [safe("Generated By", small), safe(f'{context["generated_by"]} - {context["generated_role"]}'), safe("Generated At", small), safe(f'{context["generated_at"].strftime("%d %B %Y, %H:%M")} ({context["timezone_name"]})')],
        [safe("Data Source", small), safe("ELEVEN CRM operational database"), "", ""],
    ]
    details_table = Table(details, colWidths=[document.width * .16, document.width * .34, document.width * .16, document.width * .34])
    details_table.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .3, border), ("BACKGROUND", (0, 0), (0, -1), soft_blue), ("BACKGROUND", (2, 0), (2, -1), soft_blue), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story.extend([Paragraph("Report Details", heading), details_table])
    document.build(story, onFirstPage=page_canvas, onLaterPages=page_canvas, canvasmaker=NumberedCanvas)
    return buffer.getvalue()


def generate_report_pdf(report_name: str, payload: dict[str, Any], filters: dict[str, Any], user) -> PdfReport:
    context = build_pdf_context(report_name, payload, filters, user)
    try:
        from weasyprint import HTML

        html = render_to_string("crm/reports/pdf/report.html", context)
        content = HTML(string=html, base_url=str(Path(settings.BASE_DIR))).write_pdf()
    except (ImportError, OSError):
        content = _generate_reportlab_pdf(context)
    filename = report_pdf_filename(report_name, filters)
    return PdfReport(content=content, filename=filename)
