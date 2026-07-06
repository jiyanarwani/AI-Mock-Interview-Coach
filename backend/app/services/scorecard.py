import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

from app.models.interview import Interview


def generate_scorecard_pdf(interview: Interview) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#666666"),
        spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=15,
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#333333"),
        spaceAfter=6,
        leading=16,
    )
    score_style = ParagraphStyle(
        "ScoreStyle",
        parent=styles["Normal"],
        fontSize=36,
        textColor=colors.HexColor("#0f3460"),
        alignment=1,
    )

    elements = []

    elements.append(Paragraph("Interview Scorecard", title_style))
    elements.append(
        Paragraph(
            f"AI Interview Coach — {datetime.now().strftime('%B %d, %Y')}",
            subtitle_style,
        )
    )
    elements.append(
        HRFlowable(
            width="100%", thickness=2, color=colors.HexColor("#0f3460"), spaceAfter=20
        )
    )

    info_data = [
        ["Role:", interview.role],
        ["Experience Level:", interview.experience_level],
        ["Interview Type:", interview.interview_type.value.replace("_", " ").title()],
        ["Status:", interview.status.value.replace("_", " ").title()],
        [
            "Date:",
            interview.created_at.strftime("%B %d, %Y at %I:%M %p")
            if interview.created_at
            else "N/A",
        ],
    ]
    info_table = Table(info_data, colWidths=[150, 350])
    info_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#16213e")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#333333")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Overall Performance", heading_style))

    score = interview.overall_score or 0
    score_color = (
        "#27ae60" if score >= 80 else "#f39c12" if score >= 60 else "#e74c3c"
    )
    score_label = (
        "Excellent" if score >= 80 else "Good" if score >= 60 else "Needs Improvement"
    )

    score_data = [
        [
            Paragraph(
                f'<font color="{score_color}" size="36">{score:.0f}</font>',
                score_style,
            ),
            "",
        ],
        [
            Paragraph(
                f'<font color="{score_color}" size="14">{score_label}</font>',
                ParagraphStyle("label", parent=body_style, alignment=1),
            ),
            "",
        ],
    ]
    score_table = Table(score_data, colWidths=[250, 250])
    score_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("SPAN", (0, 0), (1, 0)),
                ("SPAN", (0, 1), (1, 1)),
            ]
        )
    )
    elements.append(score_table)
    elements.append(Spacer(1, 15))

    metrics_data = [
        ["Metric", "Value"],
        [
            "Speaking Speed",
            f"{interview.avg_speaking_speed:.0f} WPM"
            if interview.avg_speaking_speed
            else "N/A",
        ],
        ["Filler Words", str(interview.total_filler_words)],
        [
            "Confidence Score",
            f"{interview.confidence_score:.0f}/100"
            if interview.confidence_score
            else "N/A",
        ],
        ["Questions Answered", str(len(interview.responses))],
    ]
    metrics_table = Table(metrics_data, colWidths=[250, 250])
    metrics_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f3460")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#dddddd")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f8f9fa")],
                ),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ]
        )
    )
    elements.append(metrics_table)
    elements.append(Spacer(1, 20))

    for resp in sorted(interview.responses, key=lambda r: r.question_number):
        elements.append(
            Paragraph(f"Question {resp.question_number}", heading_style)
        )
        elements.append(
            Paragraph(f"<i>{resp.question_text}</i>", body_style)
        )
        elements.append(Spacer(1, 5))

        if resp.transcript:
            elements.append(Paragraph("<b>Your Response:</b>", body_style))
            elements.append(
                Paragraph(resp.transcript[:500] + ("..." if len(resp.transcript) > 500 else ""), body_style)
            )
            elements.append(Spacer(1, 5))

        resp_metrics = [
            ["Score", "Speed", "Filler Words", "Confidence"],
            [
                f"{resp.score:.0f}/100" if resp.score else "N/A",
                f"{resp.speaking_speed_wpm:.0f} WPM"
                if resp.speaking_speed_wpm
                else "N/A",
                str(resp.filler_word_count),
                f"{resp.confidence_score:.0f}/100"
                if resp.confidence_score
                else "N/A",
            ],
        ]
        resp_table = Table(resp_metrics, colWidths=[125, 125, 125, 125])
        resp_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eaf6")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#dddddd")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elements.append(resp_table)
        elements.append(Spacer(1, 5))

        if resp.star_analysis:
            star = resp.star_analysis
            elements.append(Paragraph("<b>STAR Format Analysis:</b>", body_style))
            for component in ["situation", "task", "action", "result"]:
                if component in star:
                    data = star[component]
                    present = "✓" if data.get("present") else "✗"
                    color = "#27ae60" if data.get("present") else "#e74c3c"
                    elements.append(
                        Paragraph(
                            f'<font color="{color}"><b>{present} {component.title()}:</b></font> '
                            f'{data.get("feedback", "")}',
                            body_style,
                        )
                    )
                    if data.get("suggestion"):
                        elements.append(
                            Paragraph(
                                f'<font color="#666666"><i>→ {data["suggestion"]}</i></font>',
                                body_style,
                            )
                        )
            elements.append(Spacer(1, 5))

        if resp.ai_feedback:
            elements.append(Paragraph("<b>AI Feedback:</b>", body_style))
            elements.append(Paragraph(resp.ai_feedback, body_style))

        elements.append(Spacer(1, 10))
        elements.append(
            HRFlowable(
                width="100%",
                thickness=1,
                color=colors.HexColor("#eeeeee"),
                spaceAfter=10,
            )
        )

    if interview.feedback_summary:
        elements.append(Paragraph("Overall Feedback", heading_style))
        elements.append(Paragraph(interview.feedback_summary, body_style))

    elements.append(Spacer(1, 30))
    elements.append(
        Paragraph(
            '<font color="#999999" size="9">Generated by AI Interview Coach</font>',
            ParagraphStyle("footer", parent=body_style, alignment=1),
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
