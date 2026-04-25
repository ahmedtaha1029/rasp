// // src/pages/combined/CombinedDashboard.jsx

// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// import { Card, Badge, Button, Spinner, StatCard } from "../../components/ui/index"
// import { scenariosApi, simulationsApi } from "../../api/index"
// import { useAuth } from "../../context/AuthContext"

// export default function CombinedDashboard() {
//   const { user }                              = useAuth()
//   const [publicScenarios, setPublicScenarios] = useState([])
//   const [assignments,     setAssignments]     = useState([])
//   const [loading,         setLoading]         = useState(true)
//   const navigate = useNavigate()

//   const isIndividual = user?.account_type === "individual"

//   useEffect(() => {
//     Promise.all([
//       scenariosApi.listPublic(),
//       simulationsApi.listAssignments(),
//     ])
//       .then(([pubRes, assignRes]) => {
//         setPublicScenarios(pubRes.data)
//         setAssignments(assignRes.data)
//       })
//       .finally(() => setLoading(false))
//   }, [])

//   // Combine public scenarios + assigned, deduplicate by id
//   const allScenarioIds = new Set()
//   const combined = []
//   for (const s of publicScenarios) {
//     if (!allScenarioIds.has(s.id)) { allScenarioIds.add(s.id); combined.push({ ...s, source: "public" }) }
//   }
//   for (const a of assignments) {
//     if (!allScenarioIds.has(a.scenario.id)) {
//       allScenarioIds.add(a.scenario.id)
//       combined.push({ ...a.scenario, source: "assigned" })
//     }
//   }

//   return (
//     <DashboardLayout>
//       <PageHeader
//         title="My Simulations"
//         subtitle="Scenarios covering both HR and job seeker perspectives"
//       />

//       {loading ? (
//         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
//       ) : (
//         <div className="space-y-6 animate-fade-in">
//           <div className="grid grid-cols-2 gap-4">
//             <StatCard label="Available" value={combined.length} accent />
//             <StatCard label="Completed" value={assignments.filter(a => a.status === "completed").length} />
//           </div>

//           {combined.length === 0 ? (
//             <Card>
//               <div className="text-center py-12">
//                 <p className="text-text-secondary text-sm">No scenarios available yet.</p>
//                 <p className="text-text-muted text-xs mt-1">
//                   Administrators will publish scenarios here soon.
//                 </p>
//               </div>
//             </Card>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {combined.map((s) => (
//                 <div key={s.id} className="card p-5 hover:border-border-light transition-colors">
//                   <div className="flex items-start justify-between mb-3">
//                     <div>
//                       <h3 className="font-semibold text-text-primary">{s.title}</h3>
//                       <p className="text-xs text-text-muted mt-0.5">
//                         {s.stage_count} stages · {s.difficulty_display}
//                       </p>
//                     </div>
//                     <div className="flex flex-col items-end gap-1">
//                       <Badge variant={["", "success", "warning", "danger"][s.difficulty]}>
//                         {s.difficulty_display}
//                       </Badge>
//                       <Badge variant="muted">{s.source === "public" ? "Open" : "Assigned"}</Badge>
//                     </div>
//                   </div>

//                   {s.description && (
//                     <p className="text-xs text-text-secondary mb-3 line-clamp-2">{s.description}</p>
//                   )}

//                   <Button
//                     variant="primary" size="sm" className="w-full"
//                     onClick={() => navigate(`/combined/simulations/${s.id}`)}
//                   >
//                     Start Simulation →
//                   </Button>
//                 </div>
//               ))}
//             </div>
//           )}

//           <div className="flex justify-center pt-2">
//             <Button variant="ghost" size="sm" onClick={() => navigate("/my-analytics")}>
//               View my performance →
//             </Button>
//           </div>
//         </div>
//       )}
//     </DashboardLayout>
//   )
// }

// src/pages/combined/CombinedDashboard.jsx — 3-bucket split with pause support

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import { Card, Badge, Button, Spinner, StatCard } from "../../components/ui/index"
import { scenariosApi, simulationsApi } from "../../api/index"
import { useAuth } from "../../context/AuthContext"

const fmtDate  = (iso) => iso ? new Date(iso).toLocaleDateString() : "—"
const fmtScore = (s)   => s != null ? `${s}%` : "—"

export default function CombinedDashboard() {
  const { user }                              = useAuth()
  const [publicScenarios, setPublicScenarios] = useState([])
  const [assignments,     setAssignments]     = useState([])
  const [mySessions,      setMySessions]      = useState([])
  const [loading,         setLoading]         = useState(true)
  const [resuming,        setResuming]        = useState(null)
  const navigate = useNavigate()

  const isIndividual = user?.account_type === "individual"

  const load = useCallback(() => {
    Promise.all([
      scenariosApi.listPublic(),
      simulationsApi.listAssignments(),
      simulationsApi.listMySessions(),
    ])
      .then(([pubRes, assignRes, sessRes]) => {
        setPublicScenarios(pubRes.data)
        setAssignments(assignRes.data)
        setMySessions(sessRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleResume = async (sessionId) => {
    setResuming(sessionId)
    try {
      await simulationsApi.resumeSession(sessionId)
      navigate(`/combined/simulations/session/${sessionId}`)
    } catch {
      setResuming(null)
    }
  }

  // Build a session lookup by scenario id
  const sessionMap = {}
  for (const s of mySessions) {
    if (!sessionMap[s.scenario_id]) sessionMap[s.scenario_id] = s
  }

  // Merge public scenarios + assigned scenarios, deduplicated
  const seenIds = new Set()
  const allScenarios = []
  for (const s of publicScenarios) {
    if (!seenIds.has(s.id)) { seenIds.add(s.id); allScenarios.push({ ...s, source: "public" }) }
  }
  for (const a of assignments) {
    if (!seenIds.has(a.scenario.id)) {
      seenIds.add(a.scenario.id)
      allScenarios.push({ ...a.scenario, source: "assigned" })
    }
  }

  // Bucket by session status
  const notStarted = allScenarios.filter(s => !sessionMap[s.id])
  const paused     = allScenarios.filter(s => sessionMap[s.id]?.status === "paused")
  const completed  = allScenarios.filter(s => sessionMap[s.id]?.status === "completed")

  return (
    <DashboardLayout>
      <PageHeader
        title="My Simulations"
        subtitle="Scenarios covering both HR and job seeker perspectives"
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Available" value={notStarted.length} accent />
            <StatCard label="Paused"    value={paused.length} />
            <StatCard label="Completed" value={completed.length} />
          </div>

          {/* ── PAUSED ──────────────────────────────────── */}
          {paused.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                Paused — Resume Where You Left Off
              </h3>
              <p className="text-xs text-text-muted mb-4">Your progress is saved.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paused.map(s => {
                  const sess = sessionMap[s.id]
                  return (
                    <div key={s.id} className="card p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-text-primary">{s.title}</h3>
                          <p className="text-xs text-text-muted mt-0.5">
                            {s.stage_count} stages · {s.difficulty_display}
                          </p>
                        </div>
                        <Badge variant="warning">Paused</Badge>
                      </div>
                      <Button
                        variant="accent" size="sm" className="w-full"
                        loading={resuming === sess?.id}
                        onClick={() => handleResume(sess?.id)}
                      >
                        ▶ Resume Simulation
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* ── NOT STARTED ──────────────────────────────── */}
          {notStarted.length > 0 && (
            <div>
              <h3 className="font-semibold text-text-primary mb-3">Available Simulations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notStarted.map(s => (
                  <div key={s.id} className="card p-5 hover:border-border-light transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-text-primary">{s.title}</h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          {s.stage_count} stages · {s.difficulty_display}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={["", "success", "warning", "danger"][s.difficulty]}>
                          {s.difficulty_display}
                        </Badge>
                        <Badge variant="muted">{s.source === "public" ? "Open" : "Assigned"}</Badge>
                      </div>
                    </div>
                    {s.description && (
                      <p className="text-xs text-text-secondary mb-3 line-clamp-2">{s.description}</p>
                    )}
                    <Button variant="primary" size="sm" className="w-full"
                      onClick={() => navigate(`/combined/simulations/${s.id}`)}>
                      Start Simulation →
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COMPLETED ────────────────────────────────── */}
          {completed.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1">Completed Simulations</h3>
              <p className="text-xs text-text-muted mb-3">Finished runs with results.</p>
              <div className="space-y-2">
                {completed.map(s => {
                  const sess = sessionMap[s.id]
                  return (
                    <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{s.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          Finished {fmtDate(sess?.completed_at)} · Score: {fmtScore(sess?.score)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Completed</Badge>
                        <Button variant="secondary" size="sm"
                          onClick={() => navigate(`/combined/simulations/${s.id}`)}>
                          Review →
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {allScenarios.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <p className="text-text-secondary text-sm">No scenarios available yet.</p>
                <p className="text-text-muted text-xs mt-1">Administrators will publish scenarios here soon.</p>
              </div>
            </Card>
          )}

          <div className="flex justify-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/my-analytics")}>
              View my performance →
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}