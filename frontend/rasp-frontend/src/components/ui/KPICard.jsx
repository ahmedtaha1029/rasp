// src/components/ui/KPICard.jsx
// Sprint 6 — Fix #25: KPI card with week-over-week trend arrow.
// Consumed by AdminDashboard.jsx and AnalyticsPage.jsx.

export default function KPICard({
  label,
  value,
  sub,
  delta,
  trend,          // "up" | "down" | "flat"
  trendLabel,
  color = "default",  // "green" | "amber" | "red" | "default"
  accent = false,
  icon,
}) {
  const trendCfg = {
    up:   { cls: "text-success bg-success/10", arrow: "↑" },
    down: { cls: "text-danger  bg-danger/10",  arrow: "↓" },
    flat: { cls: "text-text-muted bg-surface-3", arrow: "→" },
  }
  const tc = trendCfg[trend] || trendCfg.flat

  const valueColor = {
    green:   "text-success",
    amber:   "text-warning",
    red:     "text-danger",
    default: accent ? "text-primary" : "text-text-primary",
  }[color] || "text-text-primary"

  const autoLabel = (() => {
    if (trendLabel) return trendLabel
    if (delta === undefined || delta === null) return "no change"
    const isRate = Math.abs(delta) < 1 && delta !== 0
    const formatted = isRate
      ? `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`
      : `${delta > 0 ? "+" : ""}${delta}`
    return `${formatted} vs last week`
  })()

  return (
    <div
      className={`card p-5 flex flex-col gap-2 ${
        accent ? "border-primary/30 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {label}
        </p>
      </div>

      <p className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</p>

      {sub && (
        <p className="text-2xs text-text-muted">{sub}</p>
      )}

      {trend && (
        <span
          className={`inline-flex items-center gap-1 self-start text-2xs font-semibold px-2 py-0.5 rounded-full ${tc.cls}`}
        >
          {tc.arrow} {autoLabel}
        </span>
      )}
    </div>
  )
}
