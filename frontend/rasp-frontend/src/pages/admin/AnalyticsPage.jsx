// // // src/pages/admin/AnalyticsPage.jsx
// // import { useState, useEffect } from "react"
// // import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// // import {
// //   Card, Select, Table, Badge, Button, Spinner, Toast,
// // } from "../../components/ui/index"
// // import { scenariosApi, analyticsApi } from "../../api/index"

// // export default function AnalyticsPage() {
// //   const [scenarios, setScenarios] = useState([])
// //   const [selected,  setSelected]  = useState(null)
// //   const [metrics,   setMetrics]   = useState([])
// //   const [mitre,     setMitre]     = useState([])
// //   const [loading,   setLoading]   = useState(false)
// //   const [exporting, setExporting] = useState(false)
// //   const [toast,     setToast]     = useState(null)

// //   // Load scenario list on mount
// //   useEffect(() => {
// //     scenariosApi.list().then((r) => {
// //       setScenarios(r.data)
// //       if (r.data.length > 0) setSelected(r.data[0].id)
// //     })
// //   }, [])

// //   // Load metrics when selected scenario changes
// //   useEffect(() => {
// //     if (!selected) return
// //     setLoading(true)
// //     Promise.all([
// //       analyticsApi.scenarioMetrics(selected),
// //       analyticsApi.mitreFrequency({ scenario_id: selected }),
// //     ])
// //       .then(([m, t]) => {
// //         setMetrics(m.data)
// //         setMitre(t.data)
// //       })
// //       .finally(() => setLoading(false))
// //   }, [selected])

// //   const exportReport = async (format) => {
// //     setExporting(true)
// //     try {
// //       const { data } = await analyticsApi.exportReport({
// //         scenario_id: selected,
// //         format,
// //       })
// //       const url  = URL.createObjectURL(new Blob([data]))
// //       const link = document.createElement("a")
// //       link.href  = url
// //       link.download = `rasp-report-${selected}.${format}`
// //       link.click()
// //       URL.revokeObjectURL(url)
// //       setToast({
// //         message: `Report exported as ${format.toUpperCase()}.`,
// //         type: "success",
// //       })
// //     } catch {
// //       setToast({ message: "Export failed. Try again.", type: "error" })
// //     } finally {
// //       setExporting(false)
// //     }
// //   }

// //   const metricColumns = [
// //     {
// //       key: "stage_name",
// //       label: "Stage",
// //       render: (r) => (
// //         <span className="text-text-primary font-medium capitalize">
// //           {r.stage_name}
// //         </span>
// //       ),
// //     },
// //     {
// //       key: "total_attempts",
// //       label: "Attempts",
// //       render: (r) => (
// //         <span className="font-mono text-text-secondary">
// //           {r.total_attempts}
// //         </span>
// //       ),
// //     },
// //     {
// //       key: "total_detections",
// //       label: "Detections",
// //       render: (r) => (
// //         <span className="font-mono text-success">{r.total_detections}</span>
// //       ),
// //     },
// //     {
// //       key: "detection_rate",
// //       label: "Detection Rate",
// //       render: (r) => (
// //         <div className="flex items-center gap-2">
// //           <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
// //             <div
// //               className="h-full bg-primary rounded-full transition-all"
// //               style={{ width: `${(r.detection_rate * 100).toFixed(0)}%` }}
// //             />
// //           </div>
// //           <span className="font-mono text-xs text-primary w-10 text-right">
// //             {(r.detection_rate * 100).toFixed(0)}%
// //           </span>
// //         </div>
// //       ),
// //     },
// //     {
// //       key: "avg_time_to_detect_ms",
// //       label: "Avg Time",
// //       render: (r) => (
// //         <span className="font-mono text-xs text-text-muted">
// //           {r.avg_time_to_detect_ms
// //             ? `${(r.avg_time_to_detect_ms / 1000).toFixed(1)}s`
// //             : "—"}
// //         </span>
// //       ),
// //     },
// //   ]

// //   return (
// //     <DashboardLayout>
// //       <PageHeader
// //         title="Analytics"
// //         subtitle="Detection performance and MITRE ATT&CK technique coverage"
// //         action={
// //           <div className="flex gap-2">
// //             <Button
// //               variant="secondary"
// //               size="sm"
// //               loading={exporting}
// //               onClick={() => exportReport("csv")}
// //               disabled={!selected}
// //             >
// //               Export CSV
// //             </Button>
// //             <Button
// //               variant="primary"
// //               size="sm"
// //               loading={exporting}
// //               onClick={() => exportReport("pdf")}
// //               disabled={!selected}
// //             >
// //               Export PDF
// //             </Button>
// //           </div>
// //         }
// //       />

// //       {/* Scenario selector */}
// //       <div className="mb-6 max-w-sm">
// //         <Select
// //           label="Scenario"
// //           value={selected || ""}
// //           onChange={(e) => setSelected(Number(e.target.value))}
// //         >
// //           {scenarios.map((s) => (
// //             <option key={s.id} value={s.id}>
// //               {s.title} (v{s.version})
// //             </option>
// //           ))}
// //         </Select>
// //       </div>

// //       {loading ? (
// //         <div className="flex justify-center py-20">
// //           <Spinner size="lg" />
// //         </div>
// //       ) : (
// //         <div className="space-y-6 animate-fade-in">
// //           {/* Stage metrics table */}
// //           <Card>
// //             <h3 className="font-semibold text-text-primary mb-1">
// //               Stage Detection Rates
// //             </h3>
// //             <p className="text-xs text-text-muted mb-4">
// //               Per-stage breakdown across all participants
// //             </p>
// //             <Table
// //               columns={metricColumns}
// //               data={metrics}
// //               loading={false}
// //               emptyMessage="No stage data yet. Run some simulations first."
// //             />
// //           </Card>

// //           {/* MITRE frequency chart */}
// //           <Card>
// //             <h3 className="font-semibold text-text-primary mb-1">
// //               MITRE ATT&CK Miss Frequency
// //             </h3>
// //             <p className="text-xs text-text-muted mb-5">
// //               Techniques users miss most often — sorted by miss rate
// //             </p>

// //             {mitre.length === 0 ? (
// //               <p className="text-text-muted text-sm text-center py-8">
// //                 No MITRE data yet.
// //               </p>
// //             ) : (
// //               <div className="space-y-3">
// //                 {mitre.map((row) => (
// //                   <div key={row.mitre_id} className="flex items-center gap-4">
// //                     <span className="mitre-tag w-20 text-center shrink-0">
// //                       {row.mitre_id || "N/A"}
// //                     </span>
// //                     <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
// //                       <div
// //                         className="h-full bg-danger rounded-full transition-all duration-500"
// //                         style={{
// //                           width: `${(row.miss_rate * 100).toFixed(0)}%`,
// //                         }}
// //                       />
// //                     </div>
// //                     <span className="font-mono text-xs text-danger w-12 text-right shrink-0">
// //                       {(row.miss_rate * 100).toFixed(0)}%
// //                     </span>
// //                     <span className="text-xs text-text-muted w-28 shrink-0">
// //                       {row.total_misses}/{row.total_presentations} missed
// //                     </span>
// //                   </div>
// //                 ))}
// //               </div>
// //             )}
// //           </Card>
// //         </div>
// //       )}

// //       {toast && <Toast {...toast} onClose={() => setToast(null)} />}
// //     </DashboardLayout>
// //   )
// // }
// // src/pages/admin/AnalyticsPage.jsx

// import { useState, useEffect } from "react"
// import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
// import { Card, StatCard, Select, Table, Badge, Button, Spinner, Toast } from "../../components/ui/index"
// import { scenariosApi, analyticsApi } from "../../api/index"

// // Simple tab component inline to avoid extra file
// function Tabs({ tabs, active, onChange }) {
//   return (
//     <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-6 w-fit">
//       {tabs.map((t) => (
//         <button
//           key={t.id}
//           onClick={() => onChange(t.id)}
//           className={`
//             px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
//             ${active === t.id
//               ? "bg-surface text-text-primary shadow-sm"
//               : "text-text-muted hover:text-text-secondary"}
//           `}
//         >
//           {t.label}
//         </button>
//       ))}
//     </div>
//   )
// }

// // Bar chart for detection rate — pure CSS, no extra library
// function RateBar({ value, color = "bg-primary" }) {
//   const pct = Math.round(value * 100)
//   return (
//     <div className="flex items-center gap-2">
//       <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
//         <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
//       </div>
//       <span className="font-mono text-xs text-primary w-10 text-right">{pct}%</span>
//     </div>
//   )
// }

// export default function AnalyticsPage() {
//   const [activeTab,  setActiveTab]  = useState("overview")
//   const [scenarios,  setScenarios]  = useState([])
//   const [selected,   setSelected]   = useState(null)
//   const [overview,   setOverview]   = useState(null)
//   const [metrics,    setMetrics]    = useState([])
//   const [mitre,      setMitre]      = useState([])
//   const [loading,    setLoading]    = useState(false)
//   const [exporting,  setExporting]  = useState(false)
//   const [toast,      setToast]      = useState(null)

//   // Load scenarios + platform overview on mount
//   useEffect(() => {
//     setLoading(true)
//     Promise.all([
//       scenariosApi.list(),
//       analyticsApi.overview(),
//     ])
//       .then(([sRes, oRes]) => {
//         setScenarios(sRes.data)
//         setOverview(oRes.data)
//         if (sRes.data.length > 0) setSelected(sRes.data[0].id)
//       })
//       .finally(() => setLoading(false))
//   }, [])

//   // Load per-scenario metrics when selected scenario changes
//   useEffect(() => {
//     if (!selected) return
//     setLoading(true)
//     Promise.all([
//       analyticsApi.scenarioMetrics(selected),
//       analyticsApi.mitreFrequency({ scenario_id: selected }),
//     ])
//       .then(([m, t]) => {
//         setMetrics(m.data)
//         setMitre(t.data)
//       })
//       .finally(() => setLoading(false))
//   }, [selected])

//   const exportReport = async (format) => {
//     setExporting(true)
//     try {
//       const { data } = await analyticsApi.exportReport({ scenario_id: selected, format })
//       const url  = URL.createObjectURL(new Blob([data]))
//       const link = document.createElement("a")
//       link.href  = url
//       link.download = `rasp-report-${selected}.${format}`
//       link.click()
//       URL.revokeObjectURL(url)
//       setToast({ message: `Report exported as ${format.toUpperCase()}.`, type: "success" })
//     } catch {
//       setToast({ message: "Export failed. Try again.", type: "error" })
//     } finally {
//       setExporting(false)
//     }
//   }

//   const ms  = (v) => v ? `${(v / 1000).toFixed(1)}s` : "—"
//   const pct = (v) => `${(v * 100).toFixed(0)}%`

//   // ── Overview tab ─────────────────────────────────────────────────────────
//   const OverviewTab = () => {
//     if (!overview) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

//     return (
//       <div className="space-y-6">
//         {/* Platform KPIs */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatCard label="Total Sessions"     value={overview.total_sessions} accent />
//           <StatCard label="Completed"          value={overview.completed_sessions} />
//           <StatCard
//             label="Overall Detection Rate"
//             value={pct(overview.overall_detection_rate)}
//             sub={`${overview.total_detections} of ${overview.total_actions}`}
//           />
//           <StatCard label="Avg Time to Detect" value={ms(overview.avg_time_to_detect_ms)} />
//         </div>

//         {/* Global MITRE miss frequency */}
//         <Card>
//           <h3 className="font-semibold text-text-primary mb-1">
//             Most Missed MITRE ATT&CK Techniques (Platform-Wide)
//           </h3>
//           <p className="text-xs text-text-muted mb-5">
//             Techniques users fail to detect most often across all scenarios
//           </p>
//           {overview.mitre_frequency?.length === 0 ? (
//             <p className="text-text-muted text-sm text-center py-8">No MITRE data yet.</p>
//           ) : (
//             <div className="space-y-3">
//               {overview.mitre_frequency.map((row) => (
//                 <div key={row.mitre_id} className="flex items-center gap-4">
//                   <span className="mitre-tag w-20 text-center shrink-0 text-xs">
//                     {row.mitre_id || "N/A"}
//                   </span>
//                   <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
//                     <div
//                       className="h-full bg-danger rounded-full transition-all duration-500"
//                       style={{ width: pct(row.miss_rate) }}
//                     />
//                   </div>
//                   <span className="font-mono text-xs text-danger w-10 text-right shrink-0">
//                     {pct(row.miss_rate)}
//                   </span>
//                   <span className="text-xs text-text-muted w-28 shrink-0">
//                     {row.total_misses}/{row.total_presentations} missed
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </Card>

//         {/* All scenarios stage breakdown */}
//         <Card>
//           <h3 className="font-semibold text-text-primary mb-1">
//             Stage Detection Rates — All Scenarios
//           </h3>
//           <p className="text-xs text-text-muted mb-4">
//             Per-stage breakdown across every scenario on the platform
//           </p>
//           <Table
//             columns={[
//               {
//                 key: "scenario",
//                 label: "Scenario",
//                 render: (r) => (
//                   <span className="text-xs text-text-muted">{r.scenario_title}</span>
//                 ),
//               },
//               {
//                 key: "stage",
//                 label: "Stage",
//                 render: (r) => (
//                   <span className="text-text-primary font-medium capitalize text-sm">
//                     {r.stage_order}. {r.stage_name}
//                   </span>
//                 ),
//               },
//               {
//                 key: "attempts",
//                 label: "Attempts",
//                 render: (r) => <span className="font-mono text-text-secondary">{r.total_attempts}</span>,
//               },
//               {
//                 key: "detections",
//                 label: "Detections",
//                 render: (r) => <span className="font-mono text-success">{r.total_detections}</span>,
//               },
//               {
//                 key: "rate",
//                 label: "Detection Rate",
//                 render: (r) => <RateBar value={r.detection_rate} />,
//               },
//               {
//                 key: "time",
//                 label: "Avg Time",
//                 render: (r) => (
//                   <span className="font-mono text-xs text-text-muted">
//                     {ms(r.avg_time_to_detect_ms)}
//                   </span>
//                 ),
//               },
//             ]}
//             data={overview.stage_breakdown || []}
//             emptyMessage="No stage data yet. Run some simulations first."
//           />
//         </Card>
//       </div>
//     )
//   }

//   // ── Per-scenario tab ─────────────────────────────────────────────────────
//   const ScenarioTab = () => (
//     <div className="space-y-6">
//       {/* Scenario selector + export */}
//       <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
//         <div className="w-full max-w-xs">
//           <Select
//             label="Scenario"
//             value={selected || ""}
//             onChange={(e) => setSelected(Number(e.target.value))}
//           >
//             {scenarios.map((s) => (
//               <option key={s.id} value={s.id}>
//                 {s.title} (v{s.version})
//               </option>
//             ))}
//           </Select>
//         </div>
//         <div className="flex gap-2">
//           <Button variant="secondary" size="sm" loading={exporting}
//             onClick={() => exportReport("csv")} disabled={!selected}>
//             Export CSV
//           </Button>
//           <Button variant="primary" size="sm" loading={exporting}
//             onClick={() => exportReport("pdf")} disabled={!selected}>
//             Export PDF
//           </Button>
//         </div>
//       </div>

//       {loading ? (
//         <div className="flex justify-center py-20"><Spinner size="lg" /></div>
//       ) : (
//         <>
//           {/* Stage metrics table */}
//           <Card>
//             <h3 className="font-semibold text-text-primary mb-1">Stage Detection Rates</h3>
//             <p className="text-xs text-text-muted mb-4">Per-stage breakdown for this scenario</p>
//             <Table
//               columns={[
//                 {
//                   key: "stage",
//                   label: "Stage",
//                   render: (r) => (
//                     <span className="text-text-primary font-medium capitalize">
//                       {r.stage_order}. {r.stage_name}
//                     </span>
//                   ),
//                 },
//                 {
//                   key: "attempts",
//                   label: "Attempts",
//                   render: (r) => <span className="font-mono text-text-secondary">{r.total_attempts}</span>,
//                 },
//                 {
//                   key: "detections",
//                   label: "Detections",
//                   render: (r) => <span className="font-mono text-success">{r.total_detections}</span>,
//                 },
//                 {
//                   key: "miss",
//                   label: "Misses",
//                   render: (r) => (
//                     <span className="font-mono text-danger">
//                       {r.total_attempts - r.total_detections}
//                     </span>
//                   ),
//                 },
//                 {
//                   key: "rate",
//                   label: "Detection Rate",
//                   render: (r) => <RateBar value={r.detection_rate} />,
//                 },
//                 {
//                   key: "miss_rate",
//                   label: "Miss Rate",
//                   render: (r) => <RateBar value={r.miss_rate} color="bg-danger" />,
//                 },
//                 {
//                   key: "time",
//                   label: "Avg Time",
//                   render: (r) => (
//                     <span className="font-mono text-xs text-text-muted">
//                       {ms(r.avg_time_to_detect_ms)}
//                     </span>
//                   ),
//                 },
//               ]}
//               data={metrics}
//               emptyMessage="No stage data yet for this scenario."
//             />
//           </Card>

//           {/* MITRE frequency for this scenario */}
//           <Card>
//             <h3 className="font-semibold text-text-primary mb-1">
//               MITRE ATT&CK Miss Frequency
//             </h3>
//             <p className="text-xs text-text-muted mb-5">
//               Techniques users miss most in this scenario — sorted by miss rate
//             </p>
//             {mitre.length === 0 ? (
//               <p className="text-text-muted text-sm text-center py-8">No MITRE data yet.</p>
//             ) : (
//               <div className="space-y-3">
//                 {mitre.map((row) => (
//                   <div key={row.mitre_id} className="flex items-center gap-4">
//                     <span className="mitre-tag w-20 text-center shrink-0 text-xs">
//                       {row.mitre_id || "N/A"}
//                     </span>
//                     <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
//                       <div
//                         className="h-full bg-danger rounded-full transition-all duration-500"
//                         style={{ width: pct(row.miss_rate) }}
//                       />
//                     </div>
//                     <span className="font-mono text-xs text-danger w-10 text-right shrink-0">
//                       {pct(row.miss_rate)}
//                     </span>
//                     <span className="text-xs text-text-muted w-28 shrink-0">
//                       {row.total_misses}/{row.total_presentations} missed
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </Card>
//         </>
//       )}
//     </div>
//   )

//   return (
//     <DashboardLayout>
//       <PageHeader
//         title="Analytics"
//         subtitle="Detection performance and MITRE ATT&CK coverage"
//       />

//       <Tabs
//         tabs={[
//           { id: "overview", label: "Platform Overview" },
//           { id: "scenario", label: "By Scenario" },
//         ]}
//         active={activeTab}
//         onChange={setActiveTab}
//       />

//       {activeTab === "overview" ? <OverviewTab /> : <ScenarioTab />}

//       {toast && <Toast {...toast} onClose={() => setToast(null)} />}
//     </DashboardLayout>
//   )
// }

// src/pages/admin/AnalyticsPage.jsx
// Modified: Fix #17 (AttackPathGraph), Fix #22 (StageTrendHeatmap), Fix #19 (dwell tab)

import { useState, useEffect } from "react"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import { Card, StatCard, Select, Table, Badge, Button, Spinner, Toast } from "../../components/ui/index"
import { scenariosApi, analyticsApi } from "../../api/index"
import AttackPathGraph   from "../../components/analytics/AttackPathGraph"
import StageTrendHeatmap from "../../components/analytics/StageTrendHeatmap"

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-6 w-fit flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`
            px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${active === t.id
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"}
          `}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function RateBar({ value, color = "bg-primary" }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-primary w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [activeTab,  setActiveTab]  = useState("overview")
  const [scenarios,  setScenarios]  = useState([])
  const [selected,   setSelected]   = useState(null)
  const [overview,   setOverview]   = useState(null)
  const [metrics,    setMetrics]    = useState([])
  const [mitre,      setMitre]      = useState([])
  const [dwell,      setDwell]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [exporting,  setExporting]  = useState(false)
  const [toast,      setToast]      = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([scenariosApi.list(), analyticsApi.overview()])
      .then(([sRes, oRes]) => {
        setScenarios(sRes.data)
        setOverview(oRes.data)
        if (sRes.data.length > 0) setSelected(sRes.data[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    Promise.all([
      analyticsApi.scenarioMetrics(selected),
      analyticsApi.mitreFrequency({ scenario_id: selected }),
      analyticsApi.dwellStats({ scenario_id: selected }),
    ])
      .then(([m, t, d]) => {
        setMetrics(m.data)
        setMitre(t.data)
        setDwell(d.data)
      })
      .finally(() => setLoading(false))
  }, [selected])

  const exportReport = async (format) => {
    setExporting(true)
    try {
      const { data } = await analyticsApi.exportReport({ scenario_id: selected, format })
      const url  = URL.createObjectURL(new Blob([data]))
      const link = document.createElement("a")
      link.href  = url
      link.download = `rasp-report-${selected}.${format}`
      link.click()
      URL.revokeObjectURL(url)
      setToast({ message: `Report exported as ${format.toUpperCase()}.`, type: "success" })
    } catch {
      setToast({ message: "Export failed. Try again.", type: "error" })
    } finally {
      setExporting(false)
    }
  }

  const ms  = (v) => v ? `${(v / 1000).toFixed(1)}s` : "—"
  const pct = (v) => `${(v * 100).toFixed(0)}%`

  // ── Overview tab ─────────────────────────────────────────────────────────
  const OverviewTab = () => {
    if (!overview) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Sessions"     value={overview.total_sessions} accent />
          <StatCard label="Completed"          value={overview.completed_sessions} />
          <StatCard
            label="Active Now"
            value={overview.active_sessions ?? 0}
            sub="Live sessions"
          />
          <StatCard
            label="Detection Rate"
            value={pct(overview.overall_detection_rate)}
            sub={`${overview.total_detections} of ${overview.total_actions}`}
          />
          <StatCard label="Avg Time to Detect" value={ms(overview.avg_time_to_detect_ms)} />
        </div>

        <Card>
          <h3 className="font-semibold text-text-primary mb-1">
            Most Missed MITRE ATT&CK Techniques
          </h3>
          <p className="text-xs text-text-muted mb-5">Platform-wide miss rates</p>
          {overview.mitre_frequency?.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No MITRE data yet.</p>
          ) : (
            <div className="space-y-3">
              {overview.mitre_frequency.map((row) => (
                <div key={row.mitre_id} className="flex items-center gap-4">
                  <span className="mitre-tag w-20 text-center shrink-0 text-xs">
                    {row.mitre_id || "N/A"}
                  </span>
                  <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-danger rounded-full transition-all duration-500"
                      style={{ width: pct(row.miss_rate) }}
                    />
                  </div>
                  <span className="font-mono text-xs text-danger w-10 text-right shrink-0">
                    {pct(row.miss_rate)}
                  </span>
                  <span className="text-xs text-text-muted w-28 shrink-0">
                    {row.total_misses}/{row.total_presentations} missed
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-text-primary mb-1">Stage Detection — All Scenarios</h3>
          <p className="text-xs text-text-muted mb-4">Per-stage breakdown across every scenario</p>
          <Table
            columns={[
              { key: "scenario", label: "Scenario",  render: (r) => <span className="text-xs text-text-muted">{r.scenario_title}</span> },
              { key: "stage",    label: "Stage",     render: (r) => <span className="text-text-primary font-medium capitalize text-sm">{r.stage_order}. {r.stage_name}</span> },
              { key: "attempts", label: "Attempts",  render: (r) => <span className="font-mono text-text-secondary">{r.total_attempts}</span> },
              { key: "dets",     label: "Detections",render: (r) => <span className="font-mono text-success">{r.total_detections}</span> },
              { key: "rate",     label: "Rate",      render: (r) => <RateBar value={r.detection_rate} /> },
              { key: "time",     label: "Avg Time",  render: (r) => <span className="font-mono text-xs text-text-muted">{ms(r.avg_time_to_detect_ms)}</span> },
            ]}
            data={overview.stage_breakdown || []}
            emptyMessage="No stage data yet. Run some simulations first."
          />
        </Card>
      </div>
    )
  }

  // ── Per-scenario tab ──────────────────────────────────────────────────────
  const ScenarioTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
        <div className="w-full max-w-xs">
          <Select
            label="Scenario"
            value={selected || ""}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.title} (v{s.version})</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={exporting}
            onClick={() => exportReport("csv")} disabled={!selected}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" loading={exporting}
            onClick={() => exportReport("pdf")} disabled={!selected}>
            Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Stage metrics table */}
          <Card>
            <h3 className="font-semibold text-text-primary mb-1">Stage Detection Rates</h3>
            <p className="text-xs text-text-muted mb-4">Per-stage breakdown for this scenario</p>
            <Table
              columns={[
                { key: "stage",    label: "Stage",      render: (r) => <span className="text-text-primary font-medium capitalize">{r.stage_order}. {r.stage_name}</span> },
                { key: "attempts", label: "Attempts",   render: (r) => <span className="font-mono text-text-secondary">{r.total_attempts}</span> },
                { key: "dets",     label: "Detections", render: (r) => <span className="font-mono text-success">{r.total_detections}</span> },
                { key: "miss",     label: "Misses",     render: (r) => <span className="font-mono text-danger">{r.total_attempts - r.total_detections}</span> },
                { key: "rate",     label: "Rate",       render: (r) => <RateBar value={r.detection_rate} /> },
                { key: "time",     label: "Avg Time",   render: (r) => <span className="font-mono text-xs text-text-muted">{ms(r.avg_time_to_detect_ms)}</span> },
              ]}
              data={metrics}
              emptyMessage="No stage data yet for this scenario."
            />
          </Card>

          {/* MITRE frequency table */}
          {mitre.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-4">MITRE ATT&CK Miss Frequency</h3>
              <Table
                columns={[
                  { key: "mitre_id",    label: "MITRE ID",      render: (r) => <span className="mitre-tag text-xs">{r.mitre_id || "—"}</span> },
                  { key: "total",       label: "Presentations", render: (r) => <span className="font-mono">{r.total_presentations}</span> },
                  { key: "misses",      label: "Misses",        render: (r) => <span className="font-mono text-danger">{r.total_misses}</span> },
                  { key: "miss_rate",   label: "Miss Rate",     render: (r) => <RateBar value={r.miss_rate} color="bg-danger" /> },
                ]}
                data={mitre}
              />
            </Card>
          )}

          {/* Stage trend heatmap (Fix #22) */}
          {selected && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-4">Stage Miss Rate — Weekly Trend</h3>
              <StageTrendHeatmap scenarioId={selected} metrics={metrics} />
            </Card>
          )}
        </>
      )}
    </div>
  )

  // ── Attack-path graph tab (Fix #17) ────────────────────────────────────
  const GraphTab = () => (
    <div className="space-y-4">
      <div className="w-full max-w-xs">
        <Select
          label="Scenario"
          value={selected || ""}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.title} (v{s.version})</option>
          ))}
        </Select>
      </div>
      {selected && <AttackPathGraph scenarioId={selected} />}
    </div>
  )

  // ── Hesitation / dwell tab (Fix #19) ────────────────────────────────────
  const DwellTab = () => {
    if (!selected) return <p className="text-text-muted text-sm">Select a scenario to view dwell data.</p>
    if (!dwell)   return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    if (!dwell.dwell_stats?.length) return <p className="text-text-muted text-sm text-center py-8">No hover/dwell data yet. Ensure hover telemetry is enabled in the container.</p>

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <StatCard label="Total Hover Events" value={dwell.total_hover_events} />
        </div>
        <Card>
          <h3 className="font-semibold text-text-primary mb-4">Hover & Hesitation Analysis</h3>
          <Table
            columns={[
              { key: "element",           label: "Element",          render: (r) => <code className="text-xs bg-surface-3 px-1.5 py-0.5 rounded">{r.element}</code> },
              { key: "stage_name",        label: "Stage",            render: (r) => <span className="text-sm capitalize">{(r.stage_name || "").replace("_", " ")}</span> },
              { key: "hover_count",       label: "Hovers",           render: (r) => <span className="font-mono">{r.hover_count}</span> },
              { key: "avg_dwell_ms",      label: "Avg Dwell",        render: (r) => <span className="font-mono">{ms(r.avg_dwell_ms)}</span> },
              { key: "hesitation_events", label: "Hesitation Events",render: (r) => (
                <span className={`font-mono font-semibold ${r.hesitation_events > 3 ? "text-warning" : "text-text-secondary"}`}>
                  {r.hesitation_events}
                </span>
              )},
            ]}
            data={dwell.dwell_stats}
            emptyMessage="No dwell data for this scenario."
          />
          <p className="text-xs text-text-muted mt-3">
            Hesitation = user hovered an attack element but did not flag or delete it — indicates uncertainty without action.
          </p>
        </Card>
      </div>
    )
  }

  const TABS = [
    { id: "overview",  label: "Overview" },
    { id: "scenario",  label: "Per Scenario" },
    { id: "graph",     label: "Attack Graph" },
    { id: "dwell",     label: "Hesitation" },
  ]

  return (
    <DashboardLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title="Analytics"
        subtitle="Platform-wide training effectiveness metrics"
      />

      {loading && !overview ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "scenario" && <ScenarioTab />}
          {activeTab === "graph"    && <GraphTab />}
          {activeTab === "dwell"    && <DwellTab />}
        </>
      )}
    </DashboardLayout>
  )
}
