// simulation-containers/fake-identity/src/index.js
//
// Sprint 2 — Fix #7: Fake Identity Indicator Simulation
//
// Serves a candidate profile review UI with embedded fake identity signals:
//   - AI-generated photo artifacts (described via metadata flags)
//   - Stolen identity indicators (mismatched email domain, altered name)
//   - Inconsistent timezone signals (availability vs claimed timezone)
//
// HR Personnel must inspect the profile and flag suspicious elements
// before advancing the screening stage.

const express = require("express")
const path = require("path")
const WebSocket = require("ws")

const app = express()

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options")
  res.removeHeader("Content-Security-Policy")
  next()
})

app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())

const SESSION_ID = process.env.SESSION_ID || "test-session"
const STAGE_ID   = process.env.STAGE_ID   || "1"
const WS_BACKEND = process.env.WS_BACKEND || "ws://localhost:8000"
const WS_TOKEN   = process.env.WS_TOKEN   || ""
const startTime  = Date.now()

app.get("/context", (req, res) => {
  let dc = {}
  try { dc = JSON.parse(process.env.DETECTION_CRITERIA || "{}") } catch (e) {}

  const profile = dc.profile || {
    name:           "Alex Morgan",
    real_name_ref:  "Alex Morgan (LinkedIn: Alex Morg4n)",  // subtle difference
    email:          "alex.morgan@gmail.com",                 // non-corporate domain
    claimed_location: "New York, NY",
    ip_timezone:    "UTC+8",                                 // mismatch
    availability:   "Mon-Fri 7am-3pm EST",
    availability_tz_conflict: true,
    photo_ai_artifacts: true,
    photo_description: "Profile photo shows asymmetric ear shape, blurred background texture, inconsistent lighting source on face",
    linkedin_url:   "https://linkedin.com/in/alex-morg4n",  // digit substitution
    years_exp:      "8",
    skills:         ["Python", "React", "AWS"],
    education:      "MIT, Computer Science, 2015",
    last_role:      "Senior Engineer at GoogleX",            // too prestigious / unverifiable
    applied_role:   "Junior Frontend Developer",             // role mismatch
  }

  res.json({
    session_id: SESSION_ID,
    stage_id:   STAGE_ID,
    profile,
    indicators: dc.indicators || [],
  })
})

app.post("/telemetry", (req, res) => {
  const { event_type, offset_ms, element, stage_id, selected_reason_indices } = req.body
  sendToBackend({ event_type, offset_ms: offset_ms || (Date.now() - startTime), element: element || "unknown", stage_id: Number(stage_id || STAGE_ID), selected_reason_indices: selected_reason_indices || [] })
  res.json({ ok: true })
})

let backendWS = null, wsConnected = false
const queue = []

function connectBackend() {
  backendWS = new WebSocket(`${WS_BACKEND}/ws/telemetry/${SESSION_ID}/?token=${WS_TOKEN}`)
  backendWS.on("open", () => { wsConnected = true; while (queue.length) backendWS.send(JSON.stringify(queue.shift())) })
  backendWS.on("message", (data) => { try { broadcastToBrowser(JSON.parse(data)) } catch(e) {} })
  backendWS.on("close", () => { wsConnected = false; setTimeout(connectBackend, 3000) })
  backendWS.on("error", (err) => console.error("[ID] WS error:", err.message))
}

function sendToBackend(p) { if (wsConnected && backendWS) backendWS.send(JSON.stringify(p)); else queue.push(p) }

const browserWss = new WebSocket.Server({ port: 3001 })
const browserClients = new Set()
browserWss.on("connection", (s) => { browserClients.add(s); s.on("close", () => browserClients.delete(s)) })
function broadcastToBrowser(msg) { const d = JSON.stringify(msg); browserClients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(d) }) }

app.listen(3000, () => { console.log("[ID] Fake identity simulation :3000"); connectBackend() })
