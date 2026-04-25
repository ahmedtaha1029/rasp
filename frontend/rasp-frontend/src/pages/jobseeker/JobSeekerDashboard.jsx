// // // // src/pages/jobseeker/JobSeekerDashboard.jsx
// // // import { useState, useEffect } from "react"
// // // import { useNavigate } from "react-router-dom"
// // // import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// // // import { StatCard, Card, Badge, Button, Spinner } from "../../components/ui/index"
// // // import { simulationsApi } from "../../api/index"

// // // export default function JobSeekerDashboard() {
// // //   const [assignments, setAssignments] = useState([])
// // //   const [loading,     setLoading]     = useState(true)
// // //   const navigate = useNavigate()

// // //   useEffect(() => {
// // //     simulationsApi.listAssignments()
// // //       .then((r) => setAssignments(r.data))
// // //       .finally(() => setLoading(false))
// // //   }, [])

// // //   const completed = assignments.filter((a) => a.status === "completed").length

// // //   return (
// // //     <DashboardLayout>
// // //       <PageHeader
// // //         title="My Simulations"
// // //         subtitle="Recruitment security awareness training"
// // //       />
// // //       {loading ? (
// // //         <div className="flex justify-center py-20">
// // //           <Spinner size="lg" />
// // //         </div>
// // //       ) : (
// // //         <div className="space-y-6 animate-fade-in">
// // //           {/* Stats row */}
// // //           <div className="grid grid-cols-2 gap-4">
// // //             <StatCard label="Assigned"  value={assignments.length} accent />
// // //             <StatCard label="Completed" value={completed} />
// // //           </div>

// // //           {assignments.length === 0 ? (
// // //             <Card>
// // //               <div className="text-center py-12">
// // //                 <p className="text-text-secondary text-sm">
// // //                   No simulations assigned yet.
// // //                 </p>
// // //                 <p className="text-text-muted text-xs mt-1">
// // //                   Contact your administrator.
// // //                 </p>
// // //               </div>
// // //             </Card>
// // //           ) : (
// // //             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// // //               {assignments.map((a) => (
// // //                 <div
// // //                   key={a.id}
// // //                   className="card p-5 hover:border-border-light transition-colors"
// // //                 >
// // //                   <div className="flex items-start justify-between mb-3">
// // //                     <div>
// // //                       <h3 className="font-semibold text-text-primary">
// // //                         {a.scenario.title}
// // //                       </h3>
// // //                       <p className="text-xs text-text-muted mt-0.5">
// // //                         {a.scenario.stage_count} stages ·{" "}
// // //                         {a.scenario.difficulty_display}
// // //                       </p>
// // //                     </div>
// // //                     <Badge variant="muted">{a.scenario.difficulty_display}</Badge>
// // //                   </div>

// // //                   {a.deadline && (
// // //                     <p className="text-xs text-text-secondary mb-3">
// // //                       Due: {new Date(a.deadline).toLocaleDateString()}
// // //                     </p>
// // //                   )}

// // //                   <Button
// // //                     variant="primary"
// // //                     size="sm"
// // //                     className="w-full"
// // //                     onClick={() =>
// // //                       navigate(`/jobseeker/simulations/${a.scenario.id}`)
// // //                     }
// // //                   >
// // //                     Begin Simulation →
// // //                   </Button>
// // //                 </div>
// // //               ))}
// // //             </div>
// // //           )}
// // //         </div>
// // //       )}
// // //     </DashboardLayout>
// // //   )
// // // }
// // // src/pages/jobseeker/JobSeekerDashboard.jsx

// // import { useState, useEffect } from "react"
// // import { useNavigate } from "react-router-dom"
// // import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// // import { StatCard, Card, Badge, Button, Spinner } from "../../components/ui/index"
// // import { simulationsApi, scenariosApi } from "../../api/index"
// // import { useAuth } from "../../context/AuthContext"

// // export default function JobSeekerDashboard() {
// //   const { user }                              = useAuth()
// //   const [assignments,     setAssignments]     = useState([])
// //   const [publicScenarios, setPublicScenarios] = useState([])
// //   const [loading,         setLoading]         = useState(true)
// //   const navigate = useNavigate()

// //   const isIndividual = user?.account_type === "individual"

// //   useEffect(() => {
// //     const requests = [simulationsApi.listAssignments()]
// //     if (isIndividual) requests.push(scenariosApi.listPublic())
// //     Promise.all(requests)
// //       .then(([assignRes, pubRes]) => {
// //         setAssignments(assignRes.data)
// //         if (pubRes) setPublicScenarios(pubRes.data)
// //       })
// //       .finally(() => setLoading(false))
// //   }, [isIndividual])

// //   const completed = assignments.filter((a) => a.status === "completed").length
// //   const allScenarios = isIndividual ? publicScenarios : assignments.map((a) => a.scenario)

// //   return (
// //     <DashboardLayout>
// //       <PageHeader
// //         title="My Simulations"
// //         subtitle="Recruitment security awareness from the job seeker's perspective"
// //       />

// //       {loading ? (
// //         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
// //       ) : (
// //         <div className="space-y-6 animate-fade-in">
// //           <div className="grid grid-cols-2 gap-4">
// //             <StatCard label={isIndividual ? "Available" : "Assigned"}
// //                       value={allScenarios.length} accent />
// //             {!isIndividual && <StatCard label="Completed" value={completed} />}
// //           </div>

// //           {allScenarios.length === 0 ? (
// //             <Card>
// //               <div className="text-center py-12">
// //                 <p className="text-text-secondary text-sm">No simulations available yet.</p>
// //                 <p className="text-text-muted text-xs mt-1">
// //                   {isIndividual
// //                     ? "Scenarios will appear here once an administrator makes them public."
// //                     : "Contact your administrator to get assigned to a scenario."}
// //                 </p>
// //               </div>
// //             </Card>
// //           ) : (
// //             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //               {allScenarios.map((s) => (
// //                 <div key={s.id} className="card p-5 hover:border-border-light transition-colors">
// //                   <div className="flex items-start justify-between mb-3">
// //                     <div>
// //                       <h3 className="font-semibold text-text-primary">{s.title}</h3>
// //                       <p className="text-xs text-text-muted mt-0.5">
// //                         {s.stage_count} stages · {s.difficulty_display}
// //                       </p>
// //                     </div>
// //                     <Badge variant={["", "success", "warning", "danger"][s.difficulty]}>
// //                       {s.difficulty_display}
// //                     </Badge>
// //                   </div>

// //                   {s.description && (
// //                     <p className="text-xs text-text-secondary mb-3 line-clamp-2">{s.description}</p>
// //                   )}

// //                   <Button
// //                     variant="primary" size="sm" className="w-full"
// //                     onClick={() => navigate(`/jobseeker/simulations/${s.id}`)}
// //                   >
// //                     Begin Simulation →
// //                   </Button>
// //                 </div>
// //               ))}
// //             </div>
// //           )}

// //           {/* My performance link */}
// //           <div className="flex justify-center pt-2">
// //             <Button
// //               variant="ghost" size="sm"
// //               onClick={() => navigate("/my-analytics")}
// //             >
// //               View my performance →
// //             </Button>
// //           </div>
// //         </div>
// //       )}
// //     </DashboardLayout>
// //   )
// // }

// // // src/pages/jobseeker/JobSeekerDashboard.jsx
// // import { useState, useEffect } from "react"
// // import { useNavigate } from "react-router-dom"
// // import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// // import { StatCard, Card, Badge, Button, Spinner } from "../../components/ui/index"
// // import { simulationsApi } from "../../api/index"

// // export default function JobSeekerDashboard() {
// //   const [assignments, setAssignments] = useState([])
// //   const [loading,     setLoading]     = useState(true)
// //   const navigate = useNavigate()

// //   useEffect(() => {
// //     simulationsApi.listAssignments()
// //       .then((r) => setAssignments(r.data))
// //       .finally(() => setLoading(false))
// //   }, [])

// //   const completed = assignments.filter((a) => a.status === "completed").length

// //   return (
// //     <DashboardLayout>
// //       <PageHeader
// //         title="My Simulations"
// //         subtitle="Recruitment security awareness training"
// //       />
// //       {loading ? (
// //         <div className="flex justify-center py-20">
// //           <Spinner size="lg" />
// //         </div>
// //       ) : (
// //         <div className="space-y-6 animate-fade-in">
// //           {/* Stats row */}
// //           <div className="grid grid-cols-2 gap-4">
// //             <StatCard label="Assigned"  value={assignments.length} accent />
// //             <StatCard label="Completed" value={completed} />
// //           </div>

// //           {assignments.length === 0 ? (
// //             <Card>
// //               <div className="text-center py-12">
// //                 <p className="text-text-secondary text-sm">
// //                   No simulations assigned yet.
// //                 </p>
// //                 <p className="text-text-muted text-xs mt-1">
// //                   Contact your administrator.
// //                 </p>
// //               </div>
// //             </Card>
// //           ) : (
// //             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //               {assignments.map((a) => (
// //                 <div
// //                   key={a.id}
// //                   className="card p-5 hover:border-border-light transition-colors"
// //                 >
// //                   <div className="flex items-start justify-between mb-3">
// //                     <div>
// //                       <h3 className="font-semibold text-text-primary">
// //                         {a.scenario.title}
// //                       </h3>
// //                       <p className="text-xs text-text-muted mt-0.5">
// //                         {a.scenario.stage_count} stages ·{" "}
// //                         {a.scenario.difficulty_display}
// //                       </p>
// //                     </div>
// //                     <Badge variant="muted">{a.scenario.difficulty_display}</Badge>
// //                   </div>

// //                   {a.deadline && (
// //                     <p className="text-xs text-text-secondary mb-3">
// //                       Due: {new Date(a.deadline).toLocaleDateString()}
// //                     </p>
// //                   )}

// //                   <Button
// //                     variant="primary"
// //                     size="sm"
// //                     className="w-full"
// //                     onClick={() =>
// //                       navigate(`/jobseeker/simulations/${a.scenario.id}`)
// //                     }
// //                   >
// //                     Begin Simulation →
// //                   </Button>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </DashboardLayout>
// //   )
// // }
// // src/pages/jobseeker/JobSeekerDashboard.jsx

// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// import { StatCard, Card, Badge, Button, Spinner } from "../../components/ui/index"
// import { simulationsApi, scenariosApi } from "../../api/index"
// import { useAuth } from "../../context/AuthContext"

// export default function JobSeekerDashboard() {
//   const { user }                              = useAuth()
//   const [assignments,     setAssignments]     = useState([])
//   const [publicScenarios, setPublicScenarios] = useState([])
//   const [loading,         setLoading]         = useState(true)
//   const navigate = useNavigate()

//   const isIndividual = user?.account_type === "individual"

//   useEffect(() => {
//     const requests = [simulationsApi.listAssignments()]
//     if (isIndividual) requests.push(scenariosApi.listPublic())
//     Promise.all(requests)
//       .then(([assignRes, pubRes]) => {
//         setAssignments(assignRes.data)
//         if (pubRes) setPublicScenarios(pubRes.data)
//       })
//       .finally(() => setLoading(false))
//   }, [isIndividual])

//   const pendingAssignments   = assignments.filter((a) => a.status !== "completed")
//   const completedAssignments = assignments.filter((a) => a.status === "completed")
//   const completed = completedAssignments.length
//   const allScenarios = isIndividual ? publicScenarios : pendingAssignments.map((a) => a.scenario)

//   return (
//     <DashboardLayout>
//       <PageHeader
//         title="My Simulations"
//         subtitle="Recruitment security awareness from the job seeker's perspective"
//       />

//       {loading ? (
//         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
//       ) : (
//         <div className="space-y-6 animate-fade-in">
//           <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
//             <StatCard label={isIndividual ? "Available" : "Pending"}
//                       value={allScenarios.length} accent />
//             {!isIndividual && <StatCard label="Completed" value={completed} />}
//             {!isIndividual && <StatCard label="Total Assigned" value={assignments.length} />}
//           </div>

//           {allScenarios.length === 0 ? (
//             <Card>
//               <div className="text-center py-12">
//                 <p className="text-text-secondary text-sm">No simulations available yet.</p>
//                 <p className="text-text-muted text-xs mt-1">
//                   {isIndividual
//                     ? "Scenarios will appear here once an administrator makes them public."
//                     : "Contact your administrator to get assigned to a scenario."}
//                 </p>
//               </div>
//             </Card>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {allScenarios.map((s) => (
//                 <div key={s.id} className="card p-5 hover:border-border-light transition-colors">
//                   <div className="flex items-start justify-between mb-3">
//                     <div>
//                       <h3 className="font-semibold text-text-primary">{s.title}</h3>
//                       <p className="text-xs text-text-muted mt-0.5">
//                         {s.stage_count} stages · {s.difficulty_display}
//                       </p>
//                     </div>
//                     <Badge variant={["", "success", "warning", "danger"][s.difficulty]}>
//                       {s.difficulty_display}
//                     </Badge>
//                   </div>

//                   {s.description && (
//                     <p className="text-xs text-text-secondary mb-3 line-clamp-2">{s.description}</p>
//                   )}

//                   <Button
//                     variant="primary" size="sm" className="w-full"
//                     onClick={() => navigate(`/jobseeker/simulations/${s.id}`)}
//                   >
//                     Begin Simulation →
//                   </Button>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Completed simulations (org users) */}
//           {!isIndividual && completedAssignments.length > 0 && (
//             <Card>
//               <h3 className="font-semibold text-text-primary mb-1">Completed Simulations</h3>
//               <p className="text-xs text-text-muted mb-4">Simulations you have already finished</p>
//               <div className="space-y-2">
//                 {completedAssignments.map((a) => (
//                   <div
//                     key={a.id}
//                     className="flex items-center justify-between py-3 border-b border-border last:border-0"
//                   >
//                     <div>
//                       <p className="text-sm text-text-primary font-medium">{a.scenario.title}</p>
//                       <p className="text-xs text-text-muted mt-0.5">
//                         {a.scenario.stage_count} stages · {a.scenario.difficulty_display}
//                         {a.deadline && ` · Due ${new Date(a.deadline).toLocaleDateString()}`}
//                       </p>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <Badge variant="success">Completed</Badge>
//                       <Button
//                         variant="secondary" size="sm"
//                         onClick={() => navigate(`/jobseeker/simulations/${a.scenario.id}`)}
//                       >
//                         Review →
//                       </Button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </Card>
//           )}

//           {/* My performance link */}
//           <div className="flex justify-center pt-2">
//             <Button
//               variant="ghost" size="sm"
//               onClick={() => navigate("/my-analytics")}
//             >
//               View my performance →
//             </Button>
//           </div>
//         </div>
//       )}
//     </DashboardLayout>
//   )
// }

// src/pages/jobseeker/JobSeekerDashboard.jsx
// Same 3-bucket logic as HRDashboard — pause/not-started/completed.

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import { StatCard, Card, Badge, Button, Spinner } from "../../components/ui/index"
import { simulationsApi, scenariosApi } from "../../api/index"
import { useAuth } from "../../context/AuthContext"

const fmtDate  = (iso) => iso ? new Date(iso).toLocaleDateString() : "—"
const fmtScore = (s)   => s != null ? `${s}%` : "—"

export default function JobSeekerDashboard() {
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
      navigate(`/jobseeker/simulations/session/${sessionId}`)
    } catch {
      setResuming(null)
    }
  }

  // Org user buckets (from assignments with computed status)
  const notStarted = assignments.filter(a => a.status === "not_started")
  const paused     = assignments.filter(a => a.status === "paused")
  const completed  = assignments.filter(a => a.status === "completed")

  // Individual user buckets (cross-ref public scenarios + sessions)
  const sessionMap = {}
  for (const s of mySessions) {
    if (!sessionMap[s.scenario_id]) sessionMap[s.scenario_id] = s
  }
  const pubNotStarted = publicScenarios.filter(s => !sessionMap[s.id])
  const pubPaused     = publicScenarios.filter(s => sessionMap[s.id]?.status === "paused")
  const pubCompleted  = publicScenarios.filter(s => sessionMap[s.id]?.status === "completed")

  const totalAvail     = isIndividual ? pubNotStarted.length : notStarted.length
  const totalPaused    = isIndividual ? pubPaused.length    : paused.length
  const totalCompleted = isIndividual ? pubCompleted.length  : completed.length

  return (
    <DashboardLayout>
      <PageHeader
        title="My Simulations"
        subtitle="Recruitment security awareness from the job seeker's perspective"
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Available" value={totalAvail}     accent />
            <StatCard label="Paused"    value={totalPaused} />
            <StatCard label="Completed" value={totalCompleted} />
          </div>

          {/* ── PAUSED ──────────────────────────────────── */}
          {(isIndividual ? pubPaused : paused).length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                Paused — Resume Where You Left Off
              </h3>
              <p className="text-xs text-text-muted mb-4">Your progress is saved.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isIndividual ? pubPaused : paused.map(a => a.scenario)).map((s, i) => {
                  const sessId = isIndividual ? sessionMap[s.id]?.id : paused[i]?.session?.id
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
                        loading={resuming === sessId}
                        onClick={() => handleResume(sessId)}
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
          {(isIndividual ? pubNotStarted : notStarted).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(isIndividual ? pubNotStarted : notStarted.map(a => a.scenario)).map(s => (
                <div key={s.id} className="card p-5 hover:border-border-light transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-text-primary">{s.title}</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {s.stage_count} stages · {s.difficulty_display}
                      </p>
                    </div>
                    <Badge variant={["", "success", "warning", "danger"][s.difficulty]}>
                      {s.difficulty_display}
                    </Badge>
                  </div>
                  {s.description && (
                    <p className="text-xs text-text-secondary mb-3 line-clamp-2">{s.description}</p>
                  )}
                  <Button
                    variant="primary" size="sm" className="w-full"
                    onClick={() => navigate(`/jobseeker/simulations/${s.id}`)}
                  >
                    Begin Simulation →
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            totalPaused === 0 && totalCompleted === 0 && (
              <Card>
                <div className="text-center py-12">
                  <p className="text-text-secondary text-sm">No simulations available yet.</p>
                  <p className="text-text-muted text-xs mt-1">
                    {isIndividual
                      ? "Scenarios will appear here once an administrator makes them public."
                      : "Contact your administrator to get assigned to a scenario."}
                  </p>
                </div>
              </Card>
            )
          )}

          {/* ── COMPLETED ────────────────────────────────── */}
          {(isIndividual ? pubCompleted : completed).length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-1">Completed Simulations</h3>
              <p className="text-xs text-text-muted mb-3">Your finished runs with results.</p>
              <div className="space-y-2">
                {(isIndividual ? pubCompleted : completed).map((item) => {
                  const scenario = isIndividual ? item : item.scenario
                  const sess     = isIndividual ? sessionMap[item.id] : item.session
                  return (
                    <div key={scenario.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{scenario.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          Finished {fmtDate(sess?.completed_at)}
                          {sess?.score != null && ` · Score: ${fmtScore(sess.score)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="success">Completed</Badge>
                        <Button variant="secondary" size="sm"
                          onClick={() => navigate(`/jobseeker/simulations/${scenario.id}`)}>
                          Review →
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Performance link */}
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