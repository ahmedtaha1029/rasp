"""
analytics/reports.py
"""

import csv
import io
from datetime import date
from typing import Optional

from django.http import HttpResponse

from analytics.models import AnalyticsMetric
from scenarios.models import Scenario, AttackVector
from simulations.models import SimulationSession


# ---------------------------------------------------------------------------
# PDF Report (FR-18 + Fix #18)
# ---------------------------------------------------------------------------

def generate_pdf_report(
    scenario: Scenario,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> HttpResponse:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, HRFlowable,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "RASPTitle", parent=styles["Title"], fontSize=18, spaceAfter=12,
    )
    h2_style = ParagraphStyle(
        "RASPH2", parent=styles["Heading2"], fontSize=13, spaceBefore=14, spaceAfter=6,
    )
    h3_style = ParagraphStyle(
        "RASPH3", parent=styles["Heading3"], fontSize=11, spaceBefore=10, spaceAfter=4,
        textColor=colors.HexColor("#374151"),
    )
    body_style  = ParagraphStyle("RASPBody",  parent=styles["Normal"], fontSize=9,  spaceAfter=4, leading=14)
    red_style   = ParagraphStyle("RASPRed",   parent=body_style, textColor=colors.HexColor("#dc2626"))
    amber_style = ParagraphStyle("RASPAmber", parent=body_style, textColor=colors.HexColor("#d97706"))
    green_style = ParagraphStyle("RASPGreen", parent=body_style, textColor=colors.HexColor("#166534"))

    story = []

    # ── Header ───────────────────────────────────────────────────────────────
    story.append(Paragraph("RASP Analytics Report", title_style))
    story.append(Paragraph(f"Scenario: {scenario.title} (v{scenario.version})", styles["Heading2"]))
    story.append(Paragraph(f"Generated: {date.today().isoformat()}", styles["Normal"]))
    story.append(Spacer(1, 0.5 * cm))

    # ── Section 1: Executive Summary ─────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary", h2_style))

    metrics = AnalyticsMetric.objects.filter(
        stage__scenario=scenario
    ).select_related("stage")

    total_sessions = SimulationSession.objects.filter(
        scenario=scenario,
        status=SimulationSession.Status.COMPLETED,
    ).count()

    total_attempts   = sum(m.total_attempts   for m in metrics)
    total_detections = sum(m.total_detections for m in metrics)
    overall_rate     = (total_detections / total_attempts) if total_attempts else 0.0

    summary_data = [
        ["Metric", "Value"],
        ["Total Completed Sessions",  str(total_sessions)],
        ["Total Stage Attempts",      str(total_attempts)],
        ["Total Detections",          str(total_detections)],
        ["Overall Detection Rate",    f"{overall_rate:.1%}"],
        ["Scenario Difficulty",       scenario.get_difficulty_display()],
    ]
    story.append(_build_table(summary_data))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 2: Stage-Based Metrics ───────────────────────────────────────
    story.append(Paragraph("2. Stage-Based Performance Metrics", h2_style))

    stage_data = [
        ["Stage", "Phase", "Attempts", "Detections", "Detection Rate", "Avg Time (ms)"]
    ]
    for m in metrics.order_by("stage__stage_order"):
        stage_data.append([
            str(m.stage.stage_order),
            m.stage.get_name_display(),
            str(m.total_attempts),
            str(m.total_detections),
            f"{m.detection_rate:.1%}",
            f"{m.avg_time_to_detect_ms:.0f}" if m.total_detections else "N/A",
        ])
    story.append(_build_table(stage_data))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 3: MITRE Technique Frequency ─────────────────────────────────
    story.append(Paragraph("3. MITRE ATT&CK Technique Miss Frequency", h2_style))

    mitre_rows = _get_mitre_frequency(scenario)
    mitre_data = [["MITRE ID", "Presentations", "Misses", "Miss Rate"]]
    for row in mitre_rows:
        mitre_data.append([
            row["mitre_id"] or "—",
            str(row["total_presentations"]),
            str(row["total_misses"]),
            f"{row['miss_rate']:.1%}",
        ])

    if len(mitre_data) > 1:
        story.append(_build_table(mitre_data))
    else:
        story.append(Paragraph("No MITRE data available yet.", styles["Normal"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 4: Recommendations (Fix #18) ─────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph("4. Training Gap Recommendations", h2_style))
    story.append(Paragraph(
        "The following recommendations are automatically generated based on miss-rate analysis "
        "across all stage attempts recorded for this scenario.",
        body_style,
    ))
    story.append(Spacer(1, 0.3 * cm))

    recs = _generate_recommendations(metrics, mitre_rows)

    if not recs:
        story.append(Paragraph(
            "Insufficient data to generate recommendations. "
            "Collect at least 10 session attempts per stage for meaningful analysis.",
            body_style,
        ))
    else:
        for i, rec in enumerate(recs, 1):
            urgency_label = "🔴 CRITICAL" if rec["urgency"] == "critical" else (
                "🟠 HIGH" if rec["urgency"] == "high" else "🟡 MODERATE"
            )
            text_style = red_style if rec["urgency"] == "critical" else (
                amber_style if rec["urgency"] == "high" else body_style
            )
            story.append(Paragraph(f"{i}. {urgency_label} — {rec['title']}", h3_style))
            story.append(Paragraph(rec["narrative"], text_style))
            story.append(Paragraph(f"Recommended action: {rec['action']}", body_style))
            story.append(Spacer(1, 0.2 * cm))

    # ── Build PDF ─────────────────────────────────────────────────────────────
    doc.build(story)
    buffer.seek(0)

    filename = f"rasp_report_{scenario.id}_v{scenario.version}.pdf"
    response = HttpResponse(buffer, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# ---------------------------------------------------------------------------
# Recommendation Generator (Fix #18 core logic)
# ---------------------------------------------------------------------------

def _generate_recommendations(metrics, mitre_rows: list) -> list:
    """
    Fix #18: Produce narrative training gap recommendations.

    Urgency thresholds:
      critical — miss_rate >= 0.60 (majority of users are failing)
      high     — miss_rate >= 0.40
      moderate — miss_rate >= 0.25
    """
    MIN_ATTEMPTS_FOR_RECOMMENDATION = 5
    recs = []

    # Top gaps by stage miss rate
    stage_gaps = sorted(
        [m for m in metrics if m.total_attempts >= MIN_ATTEMPTS_FOR_RECOMMENDATION],
        key=lambda m: m.miss_rate,
        reverse=True,
    )[:3]

    for m in stage_gaps:
        miss_pct = m.miss_rate
        if miss_pct < 0.25:
            continue

        urgency = "critical" if miss_pct >= 0.60 else ("high" if miss_pct >= 0.40 else "moderate")
        stage_name = m.stage.get_name_display()

        narrative = (
            f"The '{stage_name}' stage has a miss rate of {miss_pct:.1%} across "
            f"{m.total_attempts} attempts. "
        )
        if urgency == "critical":
            narrative += (
                "This means the majority of participants are failing to detect the attack at this stage. "
                "Immediate intervention is required — users are not recognising the attack indicators "
                "embedded in this recruitment phase."
            )
        elif urgency == "high":
            narrative += (
                "A significant portion of participants are missing the attack at this stage. "
                "The current difficulty level may be too high, or the training materials for this "
                "recruitment phase are insufficient."
            )
        else:
            narrative += (
                "Some participants are struggling with the attack indicators at this stage. "
                "Consider adding supplementary educational content or reducing indicator subtlety."
            )

        if m.avg_time_to_detect_ms > 0:
            narrative += (
                f" Average detection time for those who did catch it: "
                f"{m.avg_time_to_detect_ms / 1000:.1f}s — "
                + ("suggesting users who detect it still hesitate significantly." if m.avg_time_to_detect_ms > 45000 else "within acceptable range.")
            )

        action = (
            "Reduce attack indicator subtlety for this stage, add a pre-stage awareness prompt, "
            "or introduce an educational interstitial with examples from the MITRE ATT&CK framework."
        )

        recs.append({
            "title":     f"Stage {m.stage.stage_order}: {stage_name} — {miss_pct:.0%} Miss Rate",
            "urgency":   urgency,
            "narrative": narrative,
            "action":    action,
        })

    # Top MITRE technique gaps
    mitre_gaps = [r for r in mitre_rows if r.get("miss_rate", 0) >= 0.40 and r.get("total_presentations", 0) >= MIN_ATTEMPTS_FOR_RECOMMENDATION][:2]

    for mrow in mitre_gaps:
        if any(r["title"].startswith("Stage") for r in recs):
            # Avoid duplicate if MITRE gap maps to same stage already listed
            pass
        miss_pct = mrow["miss_rate"]
        urgency  = "critical" if miss_pct >= 0.60 else "high"
        recs.append({
            "title":   f"MITRE {mrow['mitre_id']} — {miss_pct:.0%} Miss Rate",
            "urgency": urgency,
            "narrative": (
                f"The attack technique {mrow['mitre_id']} was missed in {miss_pct:.1%} of presentations "
                f"({mrow['total_misses']} of {mrow['total_presentations']} encounters). "
                "Users are not recognising the specific indicators associated with this technique. "
                "This is a recurring gap that warrants dedicated training content."
            ),
            "action": (
                f"Add an educational resource linked to MITRE {mrow['mitre_id']} "
                "(https://attack.mitre.org/techniques/) in the post-session feedback for this scenario. "
                "Consider creating an additional scenario stage that emphasises this technique in isolation."
            ),
        })

    # Sort all recs by urgency then return top 3
    urgency_order = {"critical": 0, "high": 1, "moderate": 2}
    recs.sort(key=lambda r: urgency_order.get(r["urgency"], 3))
    return recs[:3]


# ---------------------------------------------------------------------------
# CSV Report (unchanged structure, added recommendations sheet)
# ---------------------------------------------------------------------------

def generate_csv_report(
    scenario: Scenario,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> HttpResponse:
    filename = f"rasp_report_{scenario.id}_v{scenario.version}.csv"
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)

    writer.writerow(["RASP Analytics Export"])
    writer.writerow(["Scenario", scenario.title])
    writer.writerow(["Version",  scenario.version])
    writer.writerow(["Difficulty", scenario.get_difficulty_display()])
    writer.writerow(["Generated", date.today().isoformat()])
    writer.writerow([])

    writer.writerow([
        "stage_order", "phase_name", "total_attempts", "total_detections",
        "detection_rate", "miss_rate", "avg_time_to_detect_ms", "last_updated",
    ])

    metrics = AnalyticsMetric.objects.filter(
        stage__scenario=scenario
    ).select_related("stage").order_by("stage__stage_order")

    for m in metrics:
        writer.writerow([
            m.stage.stage_order,
            m.stage.get_name_display(),
            m.total_attempts,
            m.total_detections,
            f"{m.detection_rate:.4f}",
            f"{m.miss_rate:.4f}",
            f"{m.avg_time_to_detect_ms:.1f}" if m.total_detections else "",
            m.last_updated.isoformat(),
        ])

    writer.writerow([])
    writer.writerow(["mitre_id", "total_presentations", "total_misses", "miss_rate"])
    mitre_rows = _get_mitre_frequency(scenario)
    for row in mitre_rows:
        writer.writerow([
            row["mitre_id"] or "",
            row["total_presentations"],
            row["total_misses"],
            f"{row['miss_rate']:.4f}",
        ])

    # Fix #18: Recommendations sheet
    writer.writerow([])
    writer.writerow(["=== AUTO-GENERATED RECOMMENDATIONS ==="])
    writer.writerow(["urgency", "title", "narrative", "action"])
    recs = _generate_recommendations(list(metrics), mitre_rows)
    for rec in recs:
        writer.writerow([rec["urgency"], rec["title"], rec["narrative"], rec["action"]])

    return response


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _get_mitre_frequency(scenario: Scenario) -> list[dict]:
    from telemetry.models import UserAction

    vectors = AttackVector.objects.filter(
        stage__scenario=scenario
    ).values("mitre_id", "stage_id")

    seen_mitre = {}
    for v in vectors:
        mitre_id = v["mitre_id"]
        stage_id = v["stage_id"]
        total  = UserAction.objects.filter(stage_id=stage_id).count()
        misses = UserAction.objects.filter(stage_id=stage_id, detected=False).count()

        if mitre_id not in seen_mitre:
            seen_mitre[mitre_id] = {"mitre_id": mitre_id, "total_presentations": 0, "total_misses": 0}
        seen_mitre[mitre_id]["total_presentations"] += total
        seen_mitre[mitre_id]["total_misses"]        += misses

    results = []
    for row in seen_mitre.values():
        total = row["total_presentations"]
        row["miss_rate"] = (row["total_misses"] / total) if total else 0.0
        results.append(row)

    results.sort(key=lambda x: x["miss_rate"], reverse=True)
    return results


def _build_table(data: list[list], col_widths=None):
    from reportlab.lib import colors
    from reportlab.platypus import Table, TableStyle

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), colors.HexColor("#1a4b6e")),
        ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("FONTSIZE",     (0, 1), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    return table