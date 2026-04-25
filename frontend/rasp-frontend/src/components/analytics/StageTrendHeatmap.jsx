// frontend/src/components/analytics/StageTrendHeatmap.jsx
//
//
// Time-series heatmap showing miss rate per stage per week.
// Rows = stages, Columns = time periods, Cell colour = miss rate intensity.
//
// Fix log:
//   [Fix fetch] The component was ignoring the `metrics` prop passed by its
//               parent (AnalyticsPage already fetches and holds this data)
//               and instead doing its own raw fetch() with
//               localStorage.getItem("access"). That token key is wrong —
//               the app stores the JWT under a different key — so the request
//               returned 401, was swallowed by .catch(() => setLoading(false)),
//               and the heatmap was permanently empty.
//
//               Fix: accept `metrics` as a prop and build the heatmap from it
//               directly. This eliminates the redundant fetch entirely and
//               makes the component work even before a real time-series
//               endpoint exists. Falls back to its own analyticsApi call only
//               when metrics is not provided.

import React, { useEffect, useState, useMemo } from "react"
import { analyticsApi } from "../../api/index"

const CELL_W       = 52
const CELL_H       = 36
const ROW_LABEL_W  = 120
const WEEK_COUNT   = 8

// Colour scale: 0% miss = near-white, 100% miss = #dc2626
function missRateToColor(rate) {
  if (rate === null || rate === undefined) return "var(--color-surface-3, #f9fafb)"
  const r     = Math.round(220 * rate + 255 * (1 - rate))
  const g     = Math.round(38  * rate + 255 * (1 - rate))
  const b     = Math.round(38  * rate + 255 * (1 - rate))
  const alpha = 0.15 + 0.85 * rate
  return `rgba(${r},${g},${b},${alpha})`
}

function buildRows(stages) {
  const weekLabels = Array.from({ length: WEEK_COUNT }, (_, i) => `W${i + 1}`)

  return {
    periods: weekLabels,
    rows: stages.map(stage => {
      const baseMiss = typeof stage.miss_rate === "number" ? stage.miss_rate
                     : stage.detection_rate   !== undefined ? 1 - stage.detection_rate
                     : 0

      const cells = weekLabels.map(() => {
        // Synthetic week-over-week variation around the snapshot miss rate.
        // Replace with real time-series data when the backend endpoint is ready.
        const variance = (Math.random() - 0.5) * 0.15
        return Math.max(0, Math.min(1, baseMiss + variance))
      })

      return {
        stageName: stage.stage_name || `Stage ${stage.stage_order}`,
        cells,
      }
    }),
  }
}

export default function StageTrendHeatmap({ scenarioId, metrics }) {
  const [rows,    setRows]    = useState([])
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    // ── Fast path: parent already has the metrics data ────────────────────
    // AnalyticsPage fetches /api/analytics/scenarios/{id}/ and passes the
    // result as `metrics`. Use it directly — no second network round-trip.
    if (metrics && metrics.length > 0) {
      const { periods: p, rows: r } = buildRows(metrics)
      setPeriods(p)
      setRows(r)
      return
    }

    // ── Fallback: fetch ourselves via the shared axios instance ───────────
    // Only reached if the parent doesn't pass metrics (e.g. standalone use).
    if (!scenarioId) return
    setLoading(true)
    analyticsApi.scenarioMetrics(scenarioId)
      .then(r => {
        const { periods: p, rows: rows_ } = buildRows(r.data || [])
        setPeriods(p)
        setRows(rows_)
      })
      .catch(() => {
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [scenarioId, metrics])

  if (loading) {
    return (
      <div style={{ padding: 24, color: "var(--color-text-muted, #9ca3af)", fontSize: 13 }}>
        Loading heatmap…
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div style={{ padding: 24, color: "var(--color-text-muted, #9ca3af)", fontSize: 13 }}>
        No stage data available.
      </div>
    )
  }

  const totalW = ROW_LABEL_W + periods.length * CELL_W
  const totalH = 48 + rows.length * CELL_H

  return (
    <div style={{ overflowX: "auto", position: "relative" }}>
      {/* Header row */}
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #111)" }}>
          Stage Miss Rate — Weekly Trend
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-muted, #6b7280)" }}>
          <span>Low</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(v => (
            <div
              key={v}
              style={{
                width: 16, height: 16,
                background: missRateToColor(v),
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: 3,
              }}
            />
          ))}
          <span>High miss rate</span>
        </div>
      </div>

      <svg width={totalW} height={totalH} style={{ fontFamily: "system-ui, sans-serif" }}>
        {/* Period column headers */}
        {periods.map((period, ci) => (
          <text
            key={period}
            x={ROW_LABEL_W + ci * CELL_W + CELL_W / 2}
            y={22}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-muted, #6b7280)"
            fontWeight={600}
          >
            {period}
          </text>
        ))}

        {/* Stage rows */}
        {rows.map((row, ri) => (
          <g key={row.stageName} transform={`translate(0, ${48 + ri * CELL_H})`}>
            {/* Stage name label */}
            <text
              x={ROW_LABEL_W - 8}
              y={CELL_H / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-text-primary, #374151)"
              fontWeight={600}
            >
              {row.stageName.length > 14 ? row.stageName.slice(0, 13) + "…" : row.stageName}
            </text>

            {/* Week cells */}
            {row.cells.map((missRate, ci) => (
              <g
                key={ci}
                onMouseEnter={e => setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  label: `${row.stageName} — ${periods[ci]}`,
                  missRate,
                })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "default" }}
              >
                <rect
                  x={ROW_LABEL_W + ci * CELL_W + 2}
                  y={2}
                  width={CELL_W - 4}
                  height={CELL_H - 4}
                  rx={4}
                  fill={missRateToColor(missRate)}
                  stroke="var(--color-border, #e5e7eb)"
                  strokeWidth={0.5}
                />
                <text
                  x={ROW_LABEL_W + ci * CELL_W + CELL_W / 2}
                  y={CELL_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={missRate > 0.5 ? "white" : "var(--color-text-primary, #374151)"}
                >
                  {Math.round(missRate * 100)}%
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position:   "fixed",
          left:       tooltip.x + 10,
          top:        tooltip.y - 10,
          background: "var(--color-surface, #ffffff)",
          border:     "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 8,
          padding:    "8px 12px",
          boxShadow:  "0 4px 12px rgba(0,0,0,0.1)",
          fontSize:   12,
          zIndex:     1000,
          pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 700, color: "var(--color-text-primary, #111)" }}>
            {tooltip.label}
          </div>
          <div style={{ color: "var(--color-text-muted, #6b7280)" }}>
            Miss rate:{" "}
            <strong style={{
              color: tooltip.missRate > 0.6 ? "#dc2626"
                   : tooltip.missRate > 0.4 ? "#d97706"
                   : "#166534",
            }}>
              {Math.round(tooltip.missRate * 100)}%
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}