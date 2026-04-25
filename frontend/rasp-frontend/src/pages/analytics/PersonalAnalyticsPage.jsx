// // // src/pages/analytics/PersonalAnalyticsPage.jsx

// // import { useState, useEffect } from "react"
// // import { useNavigate } from "react-router-dom"
// // import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// // import { Card, StatCard, Badge, Button, Spinner } from "../../components/ui/index"
// // import { analyticsApi } from "../../api/index"
// // import { useAuth } from "../../context/AuthContext"
// // import PersonalRadarChart from "../components/PersonalAnalyticsRadar"

// // export default function PersonalAnalyticsPage() {
// //   const { user }                  = useAuth()
// //   const [data,    setData]        = useState(null)
// //   const [loading, setLoading]     = useState(true)
// //   const navigate = useNavigate()

// //   useEffect(() => {
// //     analyticsApi.personal()
// //       .then((r) => setData(r.data))
// //       .catch(() => setData(null))
// //       .finally(() => setLoading(false))
// //   }, [])

// //   const backPath = (() => {
// //     switch (user?.role) {
// //       case "hr_personnel": return "/hr"
// //       case "both":         return "/combined"
// //       default:             return "/jobseeker"
// //     }
// //   })()

// //   const pct = (rate) => `${(rate * 100).toFixed(0)}%`
// //   const ms  = (ms)   => ms ? `${(ms / 1000).toFixed(1)}s` : "—"

// //   return (
// //     <DashboardLayout>
// //       <PageHeader
// //         title="My Performance"
// //         subtitle="Your detection history and security awareness stats"
// //         action={
// //           <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
// //             ← Back
// //           </Button>
// //         }
// //       />

// //       {loading ? (
// //         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
// //       ) : !data || data.total_sessions === 0 ? (
// //         <Card>
// //           <div className="text-center py-16">
// //             <p className="text-text-secondary">No simulation data yet.</p>
// //             <p className="text-text-muted text-xs mt-1">
// //               Complete at least one simulation to see your performance.
// //             </p>
// //             <Button className="mt-4" variant="primary" size="sm" onClick={() => navigate(backPath)}>
// //               Start a simulation
// //             </Button>
// //           </div>
// //         </Card>
// //       ) : (
// //         <div className="space-y-6 animate-fade-in">

// //           {/* Top stats */}
// //           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
// //             <StatCard label="Sessions Completed" value={data.total_sessions} accent />
// //             <StatCard label="Actions Recorded"   value={data.total_actions} />
// //             <StatCard
// //               label="Detection Rate"
// //               value={pct(data.detection_rate)}
// //               sub={`${data.total_detections} of ${data.total_actions} detected`}
// //             />
// //             <StatCard
// //               label="Avg Time to Detect"
// //               value={ms(data.avg_time_to_detect_ms)}
// //               sub="from attack presentation"
// //             />
// //           </div>

// //           {/* Per-stage breakdown */}
// //           {data.stage_breakdown?.length > 0 && (
// //             <Card>
// //               <h3 className="font-semibold text-text-primary mb-1">Performance by Stage</h3>
// //               <p className="text-xs text-text-muted mb-4">
// //                 How well you detected attacks at each recruitment stage
// //               </p>
// //               <div className="space-y-3">
// //                 {data.stage_breakdown.map((s) => (
// //                   <div key={s.stage_order} className="flex items-center gap-4">
// //                     <span className="text-xs text-text-muted w-28 shrink-0 capitalize">
// //                       {s.stage_name.replace("_", " ")}
// //                     </span>
// //                     <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
// //                       <div
// //                         className="h-full bg-primary rounded-full transition-all duration-500"
// //                         style={{ width: pct(s.detection_rate) }}
// //                       />
// //                     </div>
// //                     <span className="font-mono text-xs text-primary w-10 text-right shrink-0">
// //                       {pct(s.detection_rate)}
// //                     </span>
// //                     <span className="text-xs text-text-muted w-20 shrink-0 text-right">
// //                       {s.detections}/{s.total} detected
// //                     </span>
// //                   </div>
// //                 ))}
// //               </div>
// //             </Card>
// //           )}

// //           {/* MITRE miss frequency */}
// //           {data.mitre_miss_frequency?.length > 0 && (
// //             <Card>
// //               <h3 className="font-semibold text-text-primary mb-1">
// //                 Attack Techniques You Missed
// //               </h3>
// //               <p className="text-xs text-text-muted mb-4">
// //                 MITRE ATT&CK techniques you failed to detect most often
// //               </p>
// //               <div className="space-y-2">
// //                 {data.mitre_miss_frequency.slice(0, 8).map((row) => (
// //                   <div key={row.mitre_id} className="flex items-center gap-3">
// //                     <span className="mitre-tag text-xs w-20 text-center shrink-0">
// //                       {row.mitre_id}
// //                     </span>
// //                     <span className="text-xs font-mono text-danger w-8 shrink-0">
// //                       ×{row.miss_count}
// //                     </span>
// //                     <p className="text-xs text-text-muted">missed</p>
// //                   </div>
// //                 ))}
// //               </div>
// //             </Card>
// //           )}

// //           {/* Recent sessions */}
// //           {data.recent_sessions?.length > 0 && (
// //             <Card>
// //               <h3 className="font-semibold text-text-primary mb-4">Recent Sessions</h3>
// //               <div className="space-y-2">
// //                 {data.recent_sessions.map((s) => (
// //                   <div
// //                     key={s.id}
// //                     className="flex items-center justify-between py-2 border-b border-border last:border-0"
// //                   >
// //                     <div>
// //                       <p className="text-sm text-text-primary font-medium">{s.scenario}</p>
// //                       <p className="text-xs text-text-muted">
// //                         {new Date(s.started_at).toLocaleDateString()}
// //                       </p>
// //                     </div>
// //                     <Badge variant="success">Completed</Badge>
// //                   </div>
// //                 ))}
// //               </div>
// //             </Card>
// //           )}
// //         </div>
// //       )}
// //     </DashboardLayout>
// //   )
// // }

// // src/pages/simulation/PersonalAnalyticsPage.jsx
// // Modified: Fix #21 — replaced horizontal bar chart with PersonalRadarChart (spider chart)

// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// import { Card, StatCard, Badge, Button, Spinner } from "../../components/ui/index"
// import { analyticsApi } from "../../api/index"
// import { useAuth } from "../../context/AuthContext"
// import PersonalRadarChart from "../../components/analytics/PersonalAnalyticsRadar"

// export default function PersonalAnalyticsPage() {
//   const { user }              = useAuth()
//   const [data,    setData]    = useState(null)
//   const [loading, setLoading] = useState(true)
//   const navigate = useNavigate()

//   useEffect(() => {
//     analyticsApi.personal()
//       .then((r) => setData(r.data))
//       .catch(() => setData(null))
//       .finally(() => setLoading(false))
//   }, [])

//   const backPath = (() => {
//     switch (user?.role) {
//       case "hr_personnel": return "/hr"
//       case "both":         return "/combined"
//       default:             return "/jobseeker"
//     }
//   })()

//   const pct = (rate) => `${(rate * 100).toFixed(0)}%`
//   const ms  = (v)    => v ? `${(v / 1000).toFixed(1)}s` : "—"

//   return (
//     <DashboardLayout>
//       <PageHeader
//         title="My Performance"
//         subtitle="Your detection history and security awareness stats"
//         action={
//           <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
//             ← Back
//           </Button>
//         }
//       />

//       {loading ? (
//         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
//       ) : !data || data.total_sessions === 0 ? (
//         <Card>
//           <div className="text-center py-16">
//             <p className="text-text-secondary">No simulation data yet.</p>
//             <p className="text-text-muted text-xs mt-1">
//               Complete at least one simulation to see your performance.
//             </p>
//             <Button className="mt-4" variant="primary" size="sm" onClick={() => navigate(backPath)}>
//               Start a simulation
//             </Button>
//           </div>
//         </Card>
//       ) : (
//         <div className="space-y-6 animate-fade-in">

//           {/* Top stats */}
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//             <StatCard label="Sessions Completed" value={data.total_sessions} accent />
//             <StatCard label="Actions Recorded"   value={data.total_actions} />
//             <StatCard
//               label="Detection Rate"
//               value={pct(data.detection_rate)}
//               sub={`${data.total_detections} of ${data.total_actions} detected`}
//             />
//             <StatCard
//               label="Avg Time to Detect"
//               value={ms(data.avg_time_to_detect_ms)}
//               sub="from attack presentation"
//             />
//           </div>

//           {/* Fix #21: Radar chart replacing bar chart */}
//           {data.stage_breakdown?.length > 0 && (
//             <Card>
//               <h3 className="font-semibold text-text-primary mb-1">Detection Strength by Stage</h3>
//               <p className="text-xs text-text-muted mb-4">
//                 Spider chart — each axis is a recruitment stage. Outer edge = 100% detection.
//               </p>
//               <PersonalRadarChart stageBreakdown={data.stage_breakdown} height={320} />
//             </Card>
//           )}

//           {/* MITRE miss frequency */}
//           {data.mitre_miss_frequency?.length > 0 && (
//             <Card>
//               <h3 className="font-semibold text-text-primary mb-1">
//                 Attack Techniques You Missed
//               </h3>
//               <p className="text-xs text-text-muted mb-4">
//                 MITRE ATT&CK techniques you failed to detect most often
//               </p>
//               <div className="space-y-2">
//                 {data.mitre_miss_frequency.slice(0, 8).map((row) => (
//                   <div key={row.mitre_id} className="flex items-center gap-3">
//                     <span className="mitre-tag text-xs w-20 text-center shrink-0">
//                       {row.mitre_id}
//                     </span>
//                     <span className="text-xs font-mono text-danger w-8 shrink-0">
//                       ×{row.miss_count}
//                     </span>
//                     <p className="text-xs text-text-muted">missed</p>
//                   </div>
//                 ))}
//               </div>
//             </Card>
//           )}

//           {/* Recent sessions */}
//           {data.recent_sessions?.length > 0 && (
//             <Card>
//               <h3 className="font-semibold text-text-primary mb-4">Recent Sessions</h3>
//               <div className="space-y-2">
//                 {data.recent_sessions.map((s) => (
//                   <div
//                     key={s.id}
//                     className="flex items-center justify-between py-2 border-b border-border last:border-0"
//                   >
//                     <div>
//                       <p className="text-sm text-text-primary font-medium">{s.scenario}</p>
//                       <p className="text-xs text-text-muted">
//                         {new Date(s.started_at).toLocaleDateString()}
//                       </p>
//                     </div>
//                     <Badge variant="success">Completed</Badge>
//                   </div>
//                 ))}
//               </div>
//             </Card>
//           )}

//         </div>
//       )}
//     </DashboardLayout>
//   )
// }

// src/pages/simulation/PersonalAnalyticsPage.jsx
// Added: difficulty bar chart showing completed sessions by difficulty level.
// The chart reads from data.difficulty_breakdown (see backend note below).
// If that key is absent it falls back to grouping data.recent_sessions by
// scenario_difficulty so it works with the existing API without changes.

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import { Card, StatCard, Badge, Button, Spinner } from "../../components/ui/index"
import { analyticsApi } from "../../api/index"
import { useAuth } from "../../context/AuthContext"
import PersonalRadarChart from "../../components/analytics/PersonalAnalyticsRadar"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts"

// ---------------------------------------------------------------------------
// Difficulty bar chart
// ---------------------------------------------------------------------------
const DIFFICULTY_LABELS = { 1: "Basic", 2: "Intermediate", 3: "Advanced" }
const DIFFICULTY_COLORS = { 1: "#22c55e", 2: "#eab308", 3: "#ef4444" }

function DifficultyBarChart({ data }) {
  // data is the full personal analytics response.
  // Build [{ name, count, color }] either from data.difficulty_breakdown
  // (preferred backend field) or by grouping recent_sessions.
  const chartData = useMemo(() => {
    // Option A: backend provides a pre-aggregated breakdown
    if (data.difficulty_breakdown) {
      return data.difficulty_breakdown.map(d => ({
        name:  d.difficulty_display || DIFFICULTY_LABELS[d.difficulty] || `Level ${d.difficulty}`,
        count: d.count,
        color: DIFFICULTY_COLORS[d.difficulty] || "#6b7280",
      }))
    }

    // Option B: derive from recent_sessions (works with existing API)
    const counts = { 1: 0, 2: 0, 3: 0 }
    for (const s of (data.recent_sessions || [])) {
      const d = s.difficulty ?? s.scenario_difficulty
      if (d && counts[d] !== undefined) counts[d]++
    }
    return Object.entries(counts).map(([d, count]) => ({
      name:  DIFFICULTY_LABELS[d],
      count,
      color: DIFFICULTY_COLORS[d],
    }))
  }, [data])

  if (chartData.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        No completed sessions yet.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, color: "#111", marginBottom: 2 }}>{label}</div>
        <div style={{ color: "#6b7280" }}>
          Completed: <strong style={{ color: payload[0].fill }}>{payload[0].value}</strong>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }} barSize={48}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#374151" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PersonalAnalyticsPage() {
  const { user }              = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    analyticsApi.personal()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const backPath = (() => {
    switch (user?.role) {
      case "hr_personnel": return "/hr"
      case "both":         return "/combined"
      default:             return "/jobseeker"
    }
  })()

  const pct = (rate) => `${(rate * 100).toFixed(0)}%`
  const ms  = (v)    => v ? `${(v / 1000).toFixed(1)}s` : "—"

  return (
    <DashboardLayout>
      <PageHeader
        title="My Performance"
        subtitle="Your detection history and security awareness stats"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            ← Back
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !data || data.total_sessions === 0 ? (
        <Card>
          <div className="text-center py-16">
            <p className="text-text-secondary">No simulation data yet.</p>
            <p className="text-text-muted text-xs mt-1">
              Complete at least one simulation to see your performance.
            </p>
            <Button className="mt-4" variant="primary" size="sm" onClick={() => navigate(backPath)}>
              Start a simulation
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6 animate-fade-in">

          {/* Top KPI stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sessions Completed" value={data.total_sessions} accent />
            <StatCard label="Actions Recorded"   value={data.total_actions} />
            <StatCard
              label="Detection Rate"
              value={pct(data.detection_rate)}
              sub={`${data.total_detections} of ${data.total_actions} detected`}
            />
            <StatCard
              label="Avg Time to Detect"
              value={ms(data.avg_time_to_detect_ms)}
              sub="from attack presentation"
            />
          </div>

          {/* Difficulty bar chart */}
          <Card>
            <h3 className="font-semibold text-text-primary mb-1">Sessions Completed by Difficulty</h3>
            <p className="text-xs text-text-muted mb-4">
              How many simulations you've finished at each difficulty level.
            </p>
            <DifficultyBarChart data={data} />
            <div className="flex justify-center gap-6 mt-3">
              {[["#22c55e", "Basic"], ["#eab308", "Intermediate"], ["#ef4444", "Advanced"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </Card>

          {/* Radar chart */}
          {data.stage_breakdown?.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1">Detection Strength by Stage</h3>
              <p className="text-xs text-text-muted mb-4">
                Spider chart — each axis is a recruitment stage. Outer edge = 100% detection.
              </p>
              <PersonalRadarChart stageBreakdown={data.stage_breakdown} height={320} />
            </Card>
          )}

          {/* MITRE miss frequency */}
          {data.mitre_miss_frequency?.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1">Attack Techniques You Missed</h3>
              <p className="text-xs text-text-muted mb-4">
                MITRE ATT&CK techniques you failed to detect most often.
              </p>
              <div className="space-y-2">
                {data.mitre_miss_frequency.slice(0, 8).map(row => (
                  <div key={row.mitre_id} className="flex items-center gap-3">
                    <span className="mitre-tag text-xs w-20 text-center shrink-0">{row.mitre_id}</span>
                    <span className="text-xs font-mono text-danger w-8 shrink-0">×{row.miss_count}</span>
                    <p className="text-xs text-text-muted">missed</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent sessions */}
          {data.recent_sessions?.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-4">Recent Sessions</h3>
              <div className="space-y-2">
                {data.recent_sessions.map(s => (
                  <div key={s.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm text-text-primary font-medium">{s.scenario}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(s.started_at).toLocaleDateString()}
                        {s.difficulty_display && ` · ${s.difficulty_display}`}
                      </p>
                    </div>
                    <Badge variant="success">Completed</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}