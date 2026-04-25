"""
analytics/kpi_trends.py

Sprint 6 — Fix #25: KPI Trend Arrows (week-over-week deltas)

Adds week-over-week delta computation to OverallPlatformView so the
admin dashboard can render ↑/↓ trend indicators on KPI cards.

Patch: Add _compute_weekly_deltas() call inside OverallPlatformView.get()
and merge the result into the response dict.

Frontend KPI card component is included at the bottom of this file.
"""

from django.utils import timezone
from datetime import timedelta


def compute_weekly_deltas() -> dict:
    """
    Compute week-over-week delta for the three primary KPIs:
      - overall_detection_rate
      - avg_time_to_detect_ms
      - completed_sessions

    Returns a dict with keys:
      {
        "detection_rate_delta":   +0.05,   # +5% vs last week
        "detection_rate_trend":   "up",    # "up" | "down" | "flat"
        "avg_time_delta_ms":      -2300,   # faster by 2.3s
        "avg_time_trend":         "up",    # "up" = faster (good), "down" = slower
        "sessions_delta":         +12,
        "sessions_trend":         "up",
      }
    """
    from telemetry.models import UserAction
    from simulations.models import SimulationSession
    from django.db.models import Avg, Count, Q

    now      = timezone.now()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    # ── Detection rate ─────────────────────────────────────────────────────
    def detection_rate_for_window(start, end):
        actions = UserAction.objects.filter(created_at__gte=start, created_at__lt=end)
        total   = actions.count()
        detected = actions.filter(detected=True).count()
        return (detected / total) if total else None

    rate_this = detection_rate_for_window(week_ago, now)
    rate_prev = detection_rate_for_window(two_weeks_ago, week_ago)

    if rate_this is not None and rate_prev is not None and rate_prev > 0:
        rate_delta = rate_this - rate_prev
        rate_trend = "up" if rate_delta > 0.01 else ("down" if rate_delta < -0.01 else "flat")
    else:
        rate_delta, rate_trend = 0.0, "flat"

    # ── Avg time to detect ────────────────────────────────────────────────
    def avg_time_for_window(start, end):
        r = UserAction.objects.filter(
            created_at__gte=start, created_at__lt=end,
            detected=True, time_to_detect__isnull=False,
        ).aggregate(avg=Avg("time_to_detect"))
        return r["avg"]

    time_this = avg_time_for_window(week_ago, now)
    time_prev = avg_time_for_window(two_weeks_ago, week_ago)

    if time_this is not None and time_prev is not None:
        time_delta = time_this - time_prev
        # "up" = getting faster (smaller number = better)
        time_trend = "up" if time_delta < -1000 else ("down" if time_delta > 1000 else "flat")
    else:
        time_delta, time_trend = 0.0, "flat"

    # ── Completed sessions ────────────────────────────────────────────────
    sessions_this = SimulationSession.objects.filter(
        completed_at__gte=week_ago, completed_at__lt=now,
        status=SimulationSession.Status.COMPLETED,
    ).count()
    sessions_prev = SimulationSession.objects.filter(
        completed_at__gte=two_weeks_ago, completed_at__lt=week_ago,
        status=SimulationSession.Status.COMPLETED,
    ).count()

    sessions_delta = sessions_this - sessions_prev
    sessions_trend = "up" if sessions_delta > 0 else ("down" if sessions_delta < 0 else "flat")

    return {
        "detection_rate_delta":  round(rate_delta, 4),
        "detection_rate_trend":  rate_trend,
        "avg_time_delta_ms":     round(time_delta or 0),
        "avg_time_trend":        time_trend,
        "sessions_delta":        sessions_delta,
        "sessions_trend":        sessions_trend,
        "computed_at":           now.isoformat(),
    }


# ---------------------------------------------------------------------------
# Patch to apply in analytics/views.py — OverallPlatformView.get()
# ---------------------------------------------------------------------------
# At the end of get(), before return Response({...}), add:
#
#   from analytics.kpi_trends import compute_weekly_deltas
#   weekly_deltas = compute_weekly_deltas()
#
# Then merge into response:
#   return Response({
#       ...existing keys...,
#       "weekly_deltas": weekly_deltas,   # ← Fix #25
#   })


# ---------------------------------------------------------------------------
# KPICard React component with trend arrows
# ---------------------------------------------------------------------------
KPI_CARD_COMPONENT = '''
// frontend/src/components/KPICard.jsx
//
// Sprint 6 — Fix #25: KPI Card with Trend Arrow
//
// Usage:
//   <KPICard
//     label="Overall Detection Rate"
//     value="73.4%"
//     delta={0.05}
//     trend="up"
//     trendLabel="+5% vs last week"
//     color="green"
//   />

import React from "react"

export default function KPICard({ label, value, delta, trend, trendLabel, color = "blue", icon }) {
  const trendColors = {
    up:   { text: "#166534", bg: "#f0fdf4", icon: "↑" },
    down: { text: "#dc2626", bg: "#fef2f2", icon: "↓" },
    flat: { text: "#6b7280", bg: "#f9fafb", icon: "→" },
  }

  const tc = trendColors[trend] || trendColors.flat

  const valueColors = {
    green:  "#166534",
    amber:  "#d97706",
    red:    "#dc2626",
    blue:   "#1d4ed8",
    default: "#111827",
  }

  return (
    <div style={{
      background: "white", borderRadius: 12, border: "1px solid #e5e7eb",
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
        {label}
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color: valueColors[color] || valueColors.default, lineHeight: 1 }}>
        {value}
      </div>

      {trend && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: tc.bg, color: tc.text,
          fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
          alignSelf: "flex-start",
        }}>
          <span>{tc.icon}</span>
          <span>{trendLabel || (delta !== undefined ? `${delta > 0 ? "+" : ""}${typeof delta === "number" && Math.abs(delta) < 1 ? (delta * 100).toFixed(1) + "%" : delta} vs last week` : "No change")}</span>
        </div>
      )}
    </div>
  )
}
'''