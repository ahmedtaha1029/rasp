// frontend/src/pages/PersonalAnalyticsRadar.jsx
//
// Replaces the horizontal bar chart on PersonalAnalyticsPage with a
// spider/radar chart that visualises detection strength across all
// recruitment stages (spec 5.6).
//
// Uses recharts RadarChart with axes for each stage (up to 5).
// Dimensions: detection_rate per stage, clamped 0–1 and displayed as %.
//
// Usage:
//   import PersonalRadarChart from "./PersonalAnalyticsRadar"
//   <PersonalRadarChart stageBreakdown={stageBreakdown} />

import React, { useMemo } from "react"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

// Short labels for stage names so they fit on the axis
const STAGE_SHORT = {
  application:          "Apply",
  screening:            "Screen",
  interview:            "Interview",
  technical_assessment: "Tech",
  onboarding:           "Onboard",
}

const OUTER_RADIUS_PCT = "65%"

export default function PersonalRadarChart({ stageBreakdown = [], height = 320 }) {
  const data = useMemo(() => {
    if (!stageBreakdown || stageBreakdown.length === 0) return []
    return stageBreakdown.map(stage => ({
      subject:        STAGE_SHORT[stage.stage_name] || stage.stage_name || `Stage ${stage.stage_order}`,
      fullName:       stage.stage_name || `Stage ${stage.stage_order}`,
      detectionRate:  Math.round((stage.detection_rate || 0) * 100),
      attempts:       stage.total || 0,
    }))
  }, [stageBreakdown])

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, color: "#111", marginBottom: 4 }}>{d.fullName}</div>
        <div style={{ color: "#6b7280" }}>
          Detection rate: <strong style={{ color: _rateColor(d.detectionRate) }}>{d.detectionRate}%</strong>
        </div>
        <div style={{ color: "#6b7280" }}>Attempts: {d.attempts}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{
        height, display: "flex", alignItems: "center", justifyContent: "center",
        color: "#9ca3af", fontSize: 13,
      }}>
        No stage data yet — complete a simulation to see your radar chart.
      </div>
    )
  }

  // Compute overall score for the center label
  const avgRate = Math.round(data.reduce((s, d) => s + d.detectionRate, 0) / data.length)
  const avgColor = _rateColor(avgRate)

  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart
          data={data}
          margin={{ top: 16, right: 32, bottom: 16, left: 32 }}
          outerRadius={OUTER_RADIUS_PCT}
        >
          <PolarGrid stroke="#e5e7eb" />

          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={5}
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickFormatter={v => `${v}%`}
          />

          <Radar
            name="Detection Rate"
            dataKey="detectionRate"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.20}
            strokeWidth={2}
            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#1d4ed8" }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            formatter={() => "Detection Rate (%)"}
            wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Center score label */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -52%)",
        textAlign: "center",
        pointerEvents: "none",
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: avgColor, lineHeight: 1 }}>
          {avgRate}%
        </div>
        <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2, fontWeight: 600 }}>
          OVERALL
        </div>
      </div>
    </div>
  )
}

function _rateColor(pct) {
  if (pct >= 70) return "#166534"
  if (pct >= 40) return "#d97706"
  return "#dc2626"
}
