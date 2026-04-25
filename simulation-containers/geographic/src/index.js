// simulation-containers/geographic/src/index.js
//
// Sprint 2 — Fix #8: Geographic Inconsistency Detection Simulation
//
// HR Personnel reviews a candidate whose location metadata contradicts
// their claimed location. Signals embedded:
//   - Claimed city (e.g. New York, NY) vs IP timezone (UTC+8 / Asia)
//   - Document metadata revealing a different country of origin
//   - LinkedIn "last active" time inconsistent with claimed timezone
//   - Availability windows not matching claimed city's business hours
//
// User must flag the geographic/timezone mismatch before advancing.

const express = require("express")
const path    = require("path")
const WebSocket = require("ws")

const app = express()

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options")
  res.removeHeader("Content-Security-Policy")
  next()
})

app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())

const SESSION_ID      = process.env.SESSION_ID      || "test-session"
const STAGE_ID        = process.env.STAGE_ID        || "1"
const WS_BACKEND      = process.env.WS_BACKEND      || "ws://localhost:8000"
const WS_TOKEN        = process.env.WS_TOKEN        || ""
const COMPANY_PROFILE = process.env.COMPANY_PROFILE || ""
const startTime       = Date.now()

app.get("/context", (req, res) => {
  let dc = {}
  try { dc = JSON.parse(process.env.DETECTION_CRITERIA || "{}") } catch (e) {}

  const geo = dc.geo || {
    candidate_name:         "James Chen",
    claimed_location:       "San Francisco, CA, USA",
    claimed_timezone:       "PST (UTC-8)",
    ip_timezone:            "UTC+8 (Asia/Shanghai)",
    ip_country:             "China",
    document_metadata_country: "CN",
    availability:           "9am–5pm PST Mon–Fri",
    availability_utc:       "17:00–01:00 UTC",   // actual UTC equivalent of PST 9-5
    last_linkedin_active:   "Today at 03:47 AM PST",  // suspiciously late/early for PST
    application_submitted:  "02:23 AM PST",
    resume_created_locale:  "zh-CN",   // Microsoft Word locale from metadata
    phone_country_code:     "+86",     // Chinese country code
    claimed_phone:          "(415) 555-0192",  // US-looking number
    mismatch_count:         4,
  }

  res.json({
    session_id:   SESSION_ID,
    stage_id:     STAGE_ID,
    geo,
    indicators:   dc.indicators || [],
    company_name: (COMPANY_PROFILE.split("\n").find(l => l.startsWith("Name:")) || "").replace("Name:", "").trim() || "Acme Corp",
  })
})

app.post("/telemetry", (req, res) => {
  const { event_type, offset_ms, element, stage_id, selected_reason_indices } = req.body
  sendToBackend({
    event_type,
    offset_ms:               offset_ms || (Date.now() - startTime),
    element:                 element   || "unknown",
    stage_id:                Number(stage_id || STAGE_ID),
    selected_reason_indices: selected_reason_indices || [],
  })
  res.json({ ok: true })
})

let backendWS = null, wsConnected = false
const queue = []

function connectBackend() {
  backendWS = new WebSocket(`${WS_BACKEND}/ws/telemetry/${SESSION_ID}/?token=${WS_TOKEN}`)
  backendWS.on("open", () => { wsConnected = true; while (queue.length) backendWS.send(JSON.stringify(queue.shift())) })
  backendWS.on("message", (data) => { try { broadcastToBrowser(JSON.parse(data)) } catch (e) {} })
  backendWS.on("close", () => { wsConnected = false; setTimeout(connectBackend, 3000) })
  backendWS.on("error", (err) => console.error("[GEO] WS error:", err.message))
}

function sendToBackend(p) { if (wsConnected && backendWS) backendWS.send(JSON.stringify(p)); else queue.push(p) }

const browserWss     = new WebSocket.Server({ port: 3001 })
const browserClients = new Set()
browserWss.on("connection", (s) => { browserClients.add(s); s.on("close", () => browserClients.delete(s)) })
function broadcastToBrowser(msg) { const d = JSON.stringify(msg); browserClients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(d) }) }

app.listen(3000, () => { console.log("[GEO] Geographic inconsistency simulation :3000"); connectBackend() })
