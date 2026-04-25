// // // src/pages/hr/HRDashboard.jsx
// // import { useState, useEffect } from "react"
// // import { useNavigate } from "react-router-dom"
// // import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// // import { StatCard, Card, Badge, Button, Table, Spinner } from "../../components/ui/index"
// // import { simulationsApi } from "../../api/index"

// // export default function HRDashboard() {
// //   const [assignments, setAssignments] = useState([])
// //   const [loading,     setLoading]     = useState(true)
// //   const navigate = useNavigate()

// //   useEffect(() => {
// //     simulationsApi.listAssignments()
// //       .then((r) => setAssignments(r.data))
// //       .finally(() => setLoading(false))
// //   }, [])

// //   const completed = assignments.filter((a) => a.status === "completed").length
// //   const pending   = assignments.length - completed

// //   return (
// //     <DashboardLayout>
// //       <PageHeader
// //         title="HR Dashboard"
// //         subtitle="Your assigned recruitment security simulations"
// //       />
// //       {loading ? (
// //         <div className="flex justify-center py-20">
// //           <Spinner size="lg" />
// //         </div>
// //       ) : (
// //         <div className="space-y-8 animate-fade-in">
// //           <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
// //             <StatCard label="Assigned"  value={assignments.length} accent />
// //             <StatCard label="Completed" value={completed} />
// //             <StatCard label="Pending"   value={pending} />
// //           </div>

// //           <Card>
// //             <h3 className="font-semibold text-text-primary mb-4">Your Simulations</h3>
// //             <Table
// //               columns={[
// //                 {
// //                   key: "scenario",
// //                   label: "Scenario",
// //                   render: (r) => (
// //                     <span className="text-text-primary font-medium">
// //                       {r.scenario.title}
// //                     </span>
// //                   ),
// //                 },
// //                 {
// //                   key: "difficulty",
// //                   label: "Difficulty",
// //                   render: (r) => (
// //                     <Badge variant="muted">{r.scenario.difficulty_display}</Badge>
// //                   ),
// //                 },
// //                 {
// //                   key: "deadline",
// //                   label: "Deadline",
// //                   render: (r) =>
// //                     r.deadline
// //                       ? new Date(r.deadline).toLocaleDateString()
// //                       : "—",
// //                 },
// //                 {
// //                   key: "actions",
// //                   label: "",
// //                   render: (r) => (
// //                     <Button
// //                       variant="primary"
// //                       size="sm"
// //                       onClick={() =>
// //                         navigate(`/hr/simulations/${r.scenario.id}`)
// //                       }
// //                     >
// //                       Start →
// //                     </Button>
// //                   ),
// //                 },
// //               ]}
// //               data={assignments}
// //               emptyMessage="No simulations assigned yet. Contact your administrator."
// //             />
// //           </Card>
// //         </div>
// //       )}
// //     </DashboardLayout>
// //   )
// // }
// // src/pages/hr/HRDashboard.jsx

// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// import { StatCard, Card, Badge, Button, Table, Spinner } from "../../components/ui/index"
// import { simulationsApi, scenariosApi } from "../../api/index"
// import { useAuth } from "../../context/AuthContext"

// export default function HRDashboard() {
//   const { user }                              = useAuth()
//   const [assignments,      setAssignments]    = useState([])
//   const [publicScenarios,  setPublicScenarios] = useState([])
//   const [loading,          setLoading]         = useState(true)
//   const navigate = useNavigate()

//   const isIndividual = user?.account_type === "individual"

//   useEffect(() => {
//     const requests = [simulationsApi.listAssignments()]
//     if (isIndividual) {
//       requests.push(scenariosApi.listPublic())
//     }
//     Promise.all(requests)
//       .then(([assignRes, pubRes]) => {
//         setAssignments(assignRes.data)
//         if (pubRes) setPublicScenarios(pubRes.data)
//       })
//       .finally(() => setLoading(false))
//   }, [isIndividual])

//   const completed = assignments.filter((a) => a.status === "completed").length

//   const ScenarioCard = ({ scenario, label }) => (
//     <div className="card p-5 hover:border-border-light transition-colors">
//       <div className="flex items-start justify-between mb-3">
//         <div>
//           <h3 className="font-semibold text-text-primary">{scenario.title}</h3>
//           <p className="text-xs text-text-muted mt-0.5">
//             {scenario.stage_count} stages · {scenario.difficulty_display}
//           </p>
//         </div>
//         <div className="flex flex-col items-end gap-1">
//           <Badge variant={["", "success", "warning", "danger"][scenario.difficulty]}>
//             {scenario.difficulty_display}
//           </Badge>
//           {label && <Badge variant="muted">{label}</Badge>}
//         </div>
//       </div>
//       {scenario.description && (
//         <p className="text-xs text-text-secondary mb-3 line-clamp-2">{scenario.description}</p>
//       )}
//       <Button
//         variant="primary" size="sm" className="w-full"
//         onClick={() => navigate(`/hr/simulations/${scenario.id}`)}
//       >
//         Start Simulation →
//       </Button>
//     </div>
//   )

//   return (
//     <DashboardLayout>
//       <PageHeader
//         title="HR Dashboard"
//         subtitle="Recruitment security simulations from the recruiter's perspective"
//       />

//       {loading ? (
//         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
//       ) : (
//         <div className="space-y-8 animate-fade-in">
//           {/* Stats */}
//           <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
//             <StatCard label="Assigned"  value={assignments.length} accent />
//             <StatCard label="Completed" value={completed} />
//             <StatCard label="Available" value={publicScenarios.length} />
//           </div>

//           {/* Public scenarios (individual users) */}
//           {isIndividual && publicScenarios.length > 0 && (
//             <div>
//               <h3 className="font-semibold text-text-primary mb-3">
//                 Available Simulations
//               </h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 {publicScenarios.map((s) => (
//                   <ScenarioCard key={s.id} scenario={s} label="HR Scenario" />
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Assigned scenarios (org users) */}
//           {assignments.length > 0 && (
//             <Card>
//               <h3 className="font-semibold text-text-primary mb-4">Assigned to You</h3>
//               <Table
//                 columns={[
//                   {
//                     key: "scenario",
//                     label: "Scenario",
//                     render: (r) => (
//                       <span className="text-text-primary font-medium">{r.scenario.title}</span>
//                     ),
//                   },
//                   {
//                     key: "difficulty",
//                     label: "Difficulty",
//                     render: (r) => (
//                       <Badge variant="muted">{r.scenario.difficulty_display}</Badge>
//                     ),
//                   },
//                   {
//                     key: "deadline",
//                     label: "Deadline",
//                     render: (r) =>
//                       r.deadline ? new Date(r.deadline).toLocaleDateString() : "—",
//                   },
//                   {
//                     key: "actions",
//                     label: "",
//                     render: (r) => (
//                       <Button
//                         variant="primary" size="sm"
//                         onClick={() => navigate(`/hr/simulations/${r.scenario.id}`)}
//                       >
//                         Start →
//                       </Button>
//                     ),
//                   },
//                 ]}
//                 data={assignments}
//                 emptyMessage="No simulations assigned yet."
//               />
//             </Card>
//           )}

//           {/* Empty state for individual users with no public scenarios */}
//           {isIndividual && publicScenarios.length === 0 && assignments.length === 0 && (
//             <Card>
//               <div className="text-center py-12">
//                 <p className="text-text-secondary text-sm">No scenarios available yet.</p>
//                 <p className="text-text-muted text-xs mt-1">
//                   Scenarios will appear here once an administrator makes them public.
//                 </p>
//               </div>
//             </Card>
//           )}
//         </div>
//       )}
//     </DashboardLayout>
//   )
// }

// src/pages/hr/HRDashboard.jsx
//
// Splits assignments into three buckets:
//   not_started  → "Assigned to You"
//   paused       → "Paused — Resume"
//   completed    → "Completed" (with date + score)
//
// Individual users also see public scenarios via /api/sessions/mine/
// cross-referenced with /api/scenarios/public/.

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import { StatCard, Card, Badge, Button, Table, Spinner } from "../../components/ui/index"
import { simulationsApi, scenariosApi } from "../../api/index"
import { useAuth } from "../../context/AuthContext"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtDate  = (iso) => iso ? new Date(iso).toLocaleDateString() : "—"
const fmtScore = (s)   => s != null ? `${s}%` : "—"

// ---------------------------------------------------------------------------
// Small reusable scenario card (for public/individual scenarios)
// ---------------------------------------------------------------------------
function ScenarioCard({ scenario, sessionStatus, sessionId, onResume, label, navigateTo }) {
  const navigate = useNavigate()
  return (
    <div className="card p-5 hover:border-border-light transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text-primary">{scenario.title}</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {scenario.stage_count} stages · {scenario.difficulty_display}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={["", "success", "warning", "danger"][scenario.difficulty]}>
            {scenario.difficulty_display}
          </Badge>
          {label && <Badge variant="muted">{label}</Badge>}
        </div>
      </div>
      {scenario.description && (
        <p className="text-xs text-text-secondary mb-3 line-clamp-2">{scenario.description}</p>
      )}
      {sessionStatus === "paused" ? (
        <Button variant="accent" size="sm" className="w-full" onClick={() => onResume(sessionId)}>
          ▶ Resume Simulation
        </Button>
      ) : (
        <Button
          variant="primary" size="sm" className="w-full"
          onClick={() => navigate(navigateTo)}
        >
          Start Simulation →
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function HRDashboard() {
  const { user }                              = useAuth()
  const [assignments,     setAssignments]     = useState([])
  const [publicScenarios, setPublicScenarios] = useState([])
  const [mySessions,      setMySessions]      = useState([])
  const [loading,         setLoading]         = useState(true)
  const [resuming,        setResuming]        = useState(null)
  const navigate = useNavigate()

  const isIndividual = user?.account_type === "individual"

  const load = useCallback(() => {
    const reqs = [simulationsApi.listAssignments()]
    if (isIndividual) {
      reqs.push(scenariosApi.listPublic())
      reqs.push(simulationsApi.listMySessions())
    }
    Promise.all(reqs)
      .then(([assignRes, pubRes, sessRes]) => {
        setAssignments(assignRes.data)
        if (pubRes)  setPublicScenarios(pubRes.data)
        if (sessRes) setMySessions(sessRes.data)
      })
      .finally(() => setLoading(false))
  }, [isIndividual])

  useEffect(() => { load() }, [load])

  const handleResume = async (sessionId) => {
    setResuming(sessionId)
    try {
      await simulationsApi.resumeSession(sessionId)
      navigate(`/hr/simulations/session/${sessionId}`)
    } catch {
      setResuming(null)
    }
  }

  // ------------------------------------------------------------------
  // Split assignment-based data into buckets
  // ------------------------------------------------------------------
  const notStarted = assignments.filter(a => a.status === "not_started")
  const paused     = assignments.filter(a => a.status === "paused")
  const completed  = assignments.filter(a => a.status === "completed")

  // ------------------------------------------------------------------
  // For individual users: cross-reference public scenarios with sessions
  // ------------------------------------------------------------------
  const sessionMap = {}
  for (const s of mySessions) {
    if (!sessionMap[s.scenario_id]) sessionMap[s.scenario_id] = s
  }

  const pubNotStarted = publicScenarios.filter(s => !sessionMap[s.id])
  const pubPaused     = publicScenarios.filter(s => sessionMap[s.id]?.status === "paused")
  const pubCompleted  = publicScenarios.filter(s => sessionMap[s.id]?.status === "completed")

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const totalCompleted = isIndividual ? pubCompleted.length : completed.length
  const totalPaused    = isIndividual ? pubPaused.length    : paused.length
  const totalAvail     = isIndividual ? pubNotStarted.length : notStarted.length

  const completedColumns = [
    {
      key: "scenario",
      label: "Scenario",
      render: (r) => <span className="text-text-primary font-medium">{r.scenario.title}</span>,
    },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (r) => <Badge variant="muted">{r.scenario.difficulty_display}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: () => <Badge variant="success">Completed</Badge>,
    },
    {
      key: "completed_at",
      label: "Finished",
      render: (r) => <span className="text-xs text-text-muted">{fmtDate(r.session?.completed_at)}</span>,
    },
    {
      key: "score",
      label: "Score",
      render: (r) => (
        <span className="font-mono text-sm font-semibold text-primary">
          {fmtScore(r.session?.score)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button variant="secondary" size="sm"
          onClick={() => navigate(`/hr/simulations/${r.scenario.id}`)}>
          Review →
        </Button>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="HR Dashboard"
        subtitle="Recruitment security simulations from the recruiter's perspective"
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Available"  value={totalAvail}     accent />
            <StatCard label="Paused"     value={totalPaused} />
            <StatCard label="Completed"  value={totalCompleted} />
            {!isIndividual && <StatCard label="Total Assigned" value={assignments.length} />}
          </div>

          {/* ── PAUSED ──────────────────────────────────── */}
          {(isIndividual ? pubPaused : paused).length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                Paused — Resume Where You Left Off
              </h3>
              <p className="text-xs text-text-muted mb-4">These simulations are saved and waiting for you.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isIndividual
                  ? pubPaused.map(s => (
                      <ScenarioCard key={s.id} scenario={s}
                        sessionStatus="paused"
                        sessionId={sessionMap[s.id]?.id}
                        onResume={handleResume}
                        navigateTo={`/hr/simulations/${s.id}`}
                      />
                    ))
                  : paused.map(a => (
                      <ScenarioCard key={a.id} scenario={a.scenario}
                        sessionStatus="paused"
                        sessionId={a.session?.id}
                        onResume={handleResume}
                        navigateTo={`/hr/simulations/${a.scenario.id}`}
                      />
                    ))}
              </div>
            </Card>
          )}

          {/* ── PUBLIC / AVAILABLE (individual) ─────────── */}
          {isIndividual && pubNotStarted.length > 0 && (
            <div>
              <h3 className="font-semibold text-text-primary mb-3">Available Simulations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pubNotStarted.map(s => (
                  <ScenarioCard key={s.id} scenario={s} label="HR Scenario"
                    navigateTo={`/hr/simulations/${s.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── NOT STARTED (org users) ──────────────────── */}
          {!isIndividual && notStarted.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-4">Assigned to You</h3>
              <Table
                columns={[
                  { key: "scenario", label: "Scenario", render: r => <span className="text-text-primary font-medium">{r.scenario.title}</span> },
                  { key: "difficulty", label: "Difficulty", render: r => <Badge variant="muted">{r.scenario.difficulty_display}</Badge> },
                  { key: "deadline", label: "Deadline", render: r => r.deadline ? new Date(r.deadline).toLocaleDateString() : "—" },
                  { key: "actions", label: "", render: r => (
                    <Button variant="primary" size="sm"
                      onClick={() => navigate(`/hr/simulations/${r.scenario.id}`)}>
                      Start →
                    </Button>
                  )},
                ]}
                data={notStarted}
                emptyMessage="No pending simulations."
              />
            </Card>
          )}

          {/* ── COMPLETED ────────────────────────────────── */}
          {(isIndividual ? pubCompleted : completed).length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1">Completed Simulations</h3>
              <p className="text-xs text-text-muted mb-4">Finished — view your results below.</p>
              {isIndividual ? (
                <div className="space-y-2">
                  {pubCompleted.map(s => {
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
                            onClick={() => navigate(`/hr/simulations/${s.id}`)}>
                            Review →
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Table columns={completedColumns} data={completed} emptyMessage="No completed simulations." />
              )}
            </Card>
          )}

          {/* ── EMPTY STATE ──────────────────────────────── */}
          {totalAvail === 0 && totalPaused === 0 && totalCompleted === 0 && (
            <Card>
              <div className="text-center py-12">
                <p className="text-text-secondary text-sm">No scenarios available yet.</p>
                <p className="text-text-muted text-xs mt-1">
                  {isIndividual
                    ? "Scenarios will appear here once an administrator makes them public."
                    : "Contact your administrator to get assigned to a scenario."}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}