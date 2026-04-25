// src/pages/simulation/SimulationPage.jsx

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import { Button, Badge, Card } from "../../components/ui/index"
import { useAuth } from "../../context/AuthContext"
import { useSession } from "../../hooks/index"

export default function SimulationPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const {
    session,
    containerReady,
    containerUrl,
    error,
    status,
    currentStage,
    totalStages,
    startSession,
    acknowledge,
    advanceStage,
    completeSession,
  } = useSession()

  const [showWarning, setShowWarning] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [results, setResults] = useState(null)

  // Stage-completion overlay state
  const [stageComplete, setStageComplete] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [stageFeedback, setStageFeedback] = useState(null)

  const wsRef = useRef(null)
  const iframeRef = useRef(null)
  const hasStarted = useRef(false)
  // Start session on mount
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    startSession(Number(scenarioId))
    return () => wsRef.current?.close()
  }, [scenarioId])

  // Show ethical warning once container is active
  useEffect(() => {
    if (status === "active" && session && !session.ethical_warning_acknowledged) {
      setShowWarning(true)
    }
  }, [status, session])

  // Reset stage-completion overlay whenever a new container becomes ready
  // (i.e. after advanceStage re-provisions for the next stage)
  useEffect(() => {
    if (containerReady) {
      setStageComplete(false)
      setSessionComplete(false)
      setStageFeedback(null)
      // Re-open telemetry WS for the new stage if warning already acked
      if (session?.ethical_warning_acknowledged && !wsRef.current) {
        openTelemetrySocket()
      }
    }
  }, [containerReady])

  // Open telemetry WS once warning is acknowledged (initial open)
  useEffect(() => {
    if (containerReady && session?.ethical_warning_acknowledged && !wsRef.current) {
      openTelemetrySocket()
    }
  }, [containerReady, session?.ethical_warning_acknowledged])

  const openTelemetrySocket = () => {
    const token = localStorage.getItem("access_token")
    const wsBase = import.meta.env.VITE_WS_BASE_URL || "ws://localhost"
    const sessionId = session.session_id || session.id
    const url = `${wsBase}/ws/telemetry/${sessionId}/?token=${token}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => console.log("[RASP] Telemetry WS connected")

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.type === "detection_feedback") {
          // Always forward feedback to the iframe so the container UI
          // can show its own inline feedback banner
          iframeRef.current?.contentWindow?.postMessage(data, "*")

          // If the backend says this action completed the stage, surface
          // the stage-completion overlay in the React chrome
          if (data.stage_complete) {
            setStageFeedback(data)
            setStageComplete(true)
            setSessionComplete(data.session_complete || false)
          }
        }
      } catch (err) {
        console.warn("[RASP] WS message parse error", err)
      }
    }

    ws.onerror = (e) => console.warn("[RASP] Telemetry WS error", e)
    ws.onclose = () => {
      wsRef.current = null
      console.log("[RASP] Telemetry WS closed")
    }
  }

  const handleAcknowledge = async () => {
    await acknowledge()
    setShowWarning(false)
  }

  // "Next Stage" — close WS, advance, let the container-ready effect
  // re-open a fresh WS for the new stage
  const handleNextStage = async () => {
    setAdvancing(true)
    wsRef.current?.close()
    wsRef.current = null
    await advanceStage()
    setAdvancing(false)
  }

  // "Complete Simulation" — last stage done
  const handleComplete = async () => {
    setCompleting(true)
    wsRef.current?.close()
    wsRef.current = null
    const data = await completeSession()
    setResults(data)
    setCompleting(false)
  }

  const backPath = user?.role === "hr_personnel" ? "/hr" : "/jobseeker"

  // Quality label helpers
  // q is null for awareness stages (no attack vector) — show neutral label
  const qualityLabel = (q) => {
    if (q === null || q === undefined) return { text: "Stage Clear", color: "text-text-secondary" }
    if (q >= 1.0) return { text: "Full Marks", color: "text-success" }
    if (q >= 0.5) return { text: "Partial Credit", color: "text-warning" }
    return { text: "Missed", color: "text-danger" }
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Badge variant="danger">Session Error</Badge>
          <p className="text-text-secondary text-sm text-center max-w-sm">{error}</p>
          <Button variant="secondary" onClick={() => navigate(backPath)}>
            ← Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // ── Completed state ──────────────────────────────────────────────────────
  if (results) {
    return (
      <DashboardLayout>
        <PageHeader title="Simulation Complete" subtitle="Your performance has been recorded" />
        <div className="max-w-lg mx-auto space-y-4 animate-slide-up">
          <Card>
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Session Completed</h2>
              <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto">
                Your behavioral data has been anonymized and recorded. No personal identifiers were stored.
              </p>
            </div>
          </Card>
          <Button variant="primary" className="w-full" onClick={() => navigate(backPath)}>
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // ── Main view ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <PageHeader
        title="Live Simulation"
        subtitle={
          status === "provisioning" || advancing
            ? `Provisioning Stage ${currentStage} container…`
            : containerReady
              ? `Stage ${currentStage} of ${totalStages} — Interact with the simulation below`
              : "Waiting for container…"
        }
        action={
          // Fallback Proceed button — always visible once the container is ready
          // and no stage-completion overlay is showing yet.
          // This lets users advance through trust-building stages (no attack vector)
          // even if they never trigger a telemetry event from the iframe.
          containerReady && !showWarning && !stageComplete ? (
            <Button
              variant="secondary"
              loading={currentStage >= totalStages ? completing : advancing}
              onClick={currentStage >= totalStages ? handleComplete : handleNextStage}
            >
              {currentStage >= totalStages ? "Complete Simulation" : "Proceed →"}
            </Button>
          ) : null
        }
      />

      {/* Ethical warning — BR-04 */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/90 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-md w-full p-6 animate-slide-up border-warning/30 shadow-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-warning/20 border border-warning/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="font-bold text-text-primary text-base">Training Exercise Notice</h2>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-text-secondary text-sm leading-relaxed">
                This is a <strong className="text-warning">cybersecurity training simulation</strong>.
                All scenarios, files, links, and forms are fictional and fully contained within RASP.
              </p>
              <ul className="space-y-1.5">
                {[
                  "No real credentials are captured or stored",
                  "No external systems are contacted",
                  "No actual malware is deployed",
                  "All behavioral data is anonymized",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Button variant="primary" className="w-full" onClick={handleAcknowledge}>
              I Understand — Begin Simulation
            </Button>
          </div>
        </div>
      )}

      {/* ── Stage completion overlay ──────────────────────────────────────
          Appears on top of the iframe once stage_complete=true is received
          over the telemetry WebSocket. Shows the detection result and the
          "Next Stage" or "Complete Simulation" action button.
      */}
      {stageComplete && !showWarning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-md w-full p-6 animate-slide-up shadow-card">

            {/* Stage progress pill */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-mono text-text-muted bg-surface-2 border border-border px-3 py-1 rounded-full">
                Stage {stageFeedback?.current_stage_order ?? currentStage} of {stageFeedback?.total_stages ?? totalStages}
              </span>
              {stageFeedback && (
                <span className={`text-xs font-semibold ${qualityLabel(stageFeedback.detection_quality).color}`}>
                  {qualityLabel(stageFeedback.detection_quality).text}
                </span>
              )}
            </div>

            {/* Result label */}
            {stageFeedback && (
              <>
                <h2 className="font-bold text-text-primary text-base mb-1">
                  {stageFeedback.result_label}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                  {stageFeedback.explanation}
                </p>

                {/* Indicators missed */}
                {stageFeedback.indicators_missed?.length > 0 && (
                  <div className="bg-surface-2 border border-border rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-text-secondary mb-2">Indicators you missed:</p>
                    <ul className="space-y-1">
                      {stageFeedback.indicators_missed.map((ind, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1 shrink-0" />
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Best practice */}
                {stageFeedback.best_practice && (
                  <div className="flex items-start gap-2 text-xs text-text-muted mb-4">
                    <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.355a3.375 3.375 0 01-3 0m3.75-2.355L13.5 18m-1.5 0l-1.5-2.106" />
                    </svg>
                    <span>{stageFeedback.best_practice}</span>
                  </div>
                )}

                {/* MITRE tag */}
                {stageFeedback.mitre_id && (
                  <div className="mb-5">
                    <span className="mitre-tag text-xs">{stageFeedback.mitre_id}</span>
                    {stageFeedback.mitre_description && (
                      <span className="text-xs text-text-muted ml-2">{stageFeedback.mitre_description}</span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Action button */}
            {sessionComplete ? (
              <Button
                variant="primary"
                className="w-full"
                loading={completing}
                onClick={handleComplete}
              >
                Complete Simulation
              </Button>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                loading={advancing}
                onClick={handleNextStage}
              >
                Next Stage →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Provisioning spinner — shown on initial load AND between stages */}
      {(status === "provisioning" || advancing || (status === "active" && !containerReady)) && !stageComplete && (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-surface-3 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium">
              {advancing
                ? `Loading Stage ${currentStage}…`
                : "Provisioning isolated simulation container"}
            </p>
            <p className="text-text-muted text-xs mt-1">This usually takes 10–20 seconds</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-full">
            <span className="live-dot" /> Connecting to session stream
          </div>
        </div>
      )}

      {/* Simulation iframe */}
      {containerReady && containerUrl && !showWarning && !stageComplete && (
        <div className="sim-frame h-[70vh] animate-fade-in">
          <iframe
            ref={iframeRef}
            src={containerUrl}
            className="w-full h-full border-0"
            title="RASP Simulation"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
        </div>
      )}
    </DashboardLayout>
  )
}