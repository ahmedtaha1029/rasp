// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// import { StatCard, Card, Badge, Button, Spinner, Table } from "../../components/ui/index"
// import { scenariosApi, simulationsApi } from "../../api/index"
 
// export default function AdminDashboard() {
//   const [scenarios,   setScenarios]   = useState([])
//   const [assignments, setAssignments] = useState([])
//   const [loading,     setLoading]     = useState(true)
//   const navigate = useNavigate()
 
//   useEffect(() => {
//     Promise.all([
//       scenariosApi.list(),
//       simulationsApi.listAssignments(),
//     ])
//       .then(([s, a]) => {
//         setScenarios(s.data)
//         setAssignments(a.data)
//       })
//       .finally(() => setLoading(false))
//   }, [])
 
//   const activeScenarios = scenarios.filter((s) => s.active_status).length
 
//   return (
//     <DashboardLayout>
//       <PageHeader
//         title="Dashboard"
//         subtitle="Platform overview and quick actions"
//         action={
//           <Button variant="primary" onClick={() => navigate("/admin/scenarios/new")}>
//             + New Scenario
//           </Button>
//         }
//       />
 
//       {loading ? (
//         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
//       ) : (
//         <div className="space-y-8 animate-fade-in">
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//             <StatCard label="Total Scenarios"  value={scenarios.length}      accent />
//             <StatCard label="Active Scenarios" value={activeScenarios}       />
//             <StatCard label="Assignments"      value={assignments.length}    />
//             <StatCard label="Platform"         value="Online" sub="All systems operational" />
//           </div>
 
//           <Card>
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-semibold text-text-primary">Recent Scenarios</h3>
//               <Button variant="ghost" size="sm" onClick={() => navigate("/admin/scenarios")}>
//                 View all →
//               </Button>
//             </div>
//             <Table
//               columns={[
//                 {
//                   key: "title",
//                   label: "Title",
//                   render: (r) => (
//                     <span className="text-text-primary font-medium">{r.title}</span>
//                   ),
//                 },
//                 {
//                   key: "version",
//                   label: "Version",
//                   render: (r) => (
//                     <span className="font-mono text-xs text-text-muted">v{r.version}</span>
//                   ),
//                 },
//                 {
//                   key: "stage_count",
//                   label: "Stages",
//                   render: (r) => <span className="font-mono">{r.stage_count}</span>,
//                 },
//                 {
//                   key: "difficulty",
//                   label: "Difficulty",
//                   render: (r) => (
//                     <Badge variant={["", "success", "warning", "danger"][r.difficulty]}>
//                       {r.difficulty_display}
//                     </Badge>
//                   ),
//                 },
//                 {
//                   key: "active_status",
//                   label: "Status",
//                   render: (r) => (
//                     <Badge variant={r.active_status ? "success" : "muted"}>
//                       {r.active_status ? "Active" : "Inactive"}
//                     </Badge>
//                   ),
//                 },
//                 {
//                   key: "actions",
//                   label: "",
//                   render: (r) => (
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => navigate(`/admin/scenarios/${r.id}`)}
//                     >
//                       Edit
//                     </Button>
//                   ),
//                 },
//               ]}
//               data={scenarios.slice(0, 5)}
//               emptyMessage="No scenarios yet. Create your first one."
//             />
//           </Card>
//         </div>
//       )}
//     </DashboardLayout>
//   )
// }

// src/pages/admin/AdminDashboard.jsx
// Modified: Fix #14 (active_sessions), Fix #25 (KPI trend arrows)
// Fetches platform overview on mount and shows live active-session count
// alongside week-over-week deltas on each KPI card.

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import {
  Card, Badge, Button, Spinner, Table,
} from "../../components/ui/index"
import KPICard from "../../components/ui/KPICard"
import { scenariosApi, simulationsApi, analyticsApi } from "../../api/index"

export default function AdminDashboard() {
  const [scenarios,   setScenarios]   = useState([])
  const [assignments, setAssignments] = useState([])
  const [overview,    setOverview]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      scenariosApi.list(),
      simulationsApi.listAssignments(),
      analyticsApi.overview(),
    ])
      .then(([s, a, o]) => {
        setScenarios(s.data)
        setAssignments(a.data)
        setOverview(o.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh active sessions every 30s (spec 5.1)
  useEffect(() => {
    const interval = setInterval(() => {
      analyticsApi.overview()
        .then((r) => setOverview(r.data))
        .catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const activeScenarios = scenarios.filter((s) => s.active_status).length
  const deltas = overview?.weekly_deltas || {}

  const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "—")
  const ms  = (v) => (v ? `${(v / 1000).toFixed(1)}s` : "—")

  return (
    <DashboardLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview and quick actions"
        action={
          <Button variant="primary" onClick={() => navigate("/admin/scenarios/new")}>
            + New Scenario
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-8 animate-fade-in">

          {/* ── KPI Cards (Fix #14 active_sessions, Fix #25 trend arrows) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Active Sessions"
              value={overview?.active_sessions ?? 0}
              sub="Live right now"
              accent
              icon="🟢"
            />
            <KPICard
              label="Sessions Completed"
              value={overview?.completed_sessions ?? assignments.length}
              delta={deltas.sessions_delta}
              trend={deltas.sessions_trend}
            />
            <KPICard
              label="Detection Rate"
              value={overview ? pct(overview.overall_detection_rate) : "—"}
              sub={overview ? `${overview.total_detections} of ${overview.total_actions}` : ""}
              delta={deltas.detection_rate_delta}
              trend={deltas.detection_rate_trend}
              color={
                overview?.overall_detection_rate >= 0.7
                  ? "green"
                  : overview?.overall_detection_rate >= 0.4
                  ? "amber"
                  : "red"
              }
            />
            <KPICard
              label="Avg Time to Detect"
              value={overview ? ms(overview.avg_time_to_detect_ms) : "—"}
              delta={deltas.avg_time_delta_ms ? `${(deltas.avg_time_delta_ms / 1000).toFixed(1)}s` : undefined}
              trend={deltas.avg_time_trend}
              trendLabel={
                deltas.avg_time_trend === "up"
                  ? `${Math.abs((deltas.avg_time_delta_ms || 0) / 1000).toFixed(1)}s faster`
                  : deltas.avg_time_trend === "down"
                  ? `${Math.abs((deltas.avg_time_delta_ms || 0) / 1000).toFixed(1)}s slower`
                  : "no change"
              }
            />
          </div>

          {/* Scenario stats row */}
          <div className="grid grid-cols-2 gap-4">
            <KPICard label="Total Scenarios"  value={scenarios.length} />
            <KPICard label="Active Scenarios" value={activeScenarios}  />
          </div>

          {/* ── Recent Scenarios table ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">Recent Scenarios</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/scenarios")}>
                View all →
              </Button>
            </div>
            <Table
              columns={[
                {
                  key: "title",
                  label: "Title",
                  render: (r) => (
                    <span className="text-text-primary font-medium">{r.title}</span>
                  ),
                },
                {
                  key: "version",
                  label: "Version",
                  render: (r) => (
                    <span className="font-mono text-xs text-text-muted">v{r.version}</span>
                  ),
                },
                {
                  key: "stage_count",
                  label: "Stages",
                  render: (r) => <span className="font-mono">{r.stage_count}</span>,
                },
                {
                  key: "difficulty",
                  label: "Difficulty",
                  render: (r) => (
                    <Badge variant={["", "success", "warning", "danger"][r.difficulty]}>
                      {r.difficulty_display}
                    </Badge>
                  ),
                },
                {
                  key: "active_status",
                  label: "Status",
                  render: (r) => (
                    <Badge variant={r.active_status ? "success" : "muted"}>
                      {r.active_status ? "Active" : "Inactive"}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/scenarios/${r.id}`)}
                    >
                      Edit
                    </Button>
                  ),
                },
              ]}
              data={scenarios.slice(0, 5)}
              emptyMessage="No scenarios yet. Create your first one."
            />
          </Card>

          {/* ── Top missed MITRE techniques (from overview) ── */}
          {overview?.mitre_frequency?.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary">Top Missed Techniques</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/analytics")}>
                  Full analytics →
                </Button>
              </div>
              <div className="space-y-3">
                {overview.mitre_frequency.slice(0, 5).map((row) => (
                  <div key={row.mitre_id} className="flex items-center gap-4">
                    <span className="mitre-tag w-20 text-center shrink-0 text-xs">
                      {row.mitre_id || "N/A"}
                    </span>
                    <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-danger rounded-full transition-all duration-500"
                        style={{ width: `${(row.miss_rate * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-danger w-10 text-right shrink-0">
                      {(row.miss_rate * 100).toFixed(0)}%
                    </span>
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
