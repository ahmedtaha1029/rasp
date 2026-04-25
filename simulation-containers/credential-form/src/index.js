// simulation-containers/credential-form/src/index.js
//
// Sprint 2 — Fix #6: Credential Harvesting Form Simulation
//
// Node.js server that runs inside the credential_form simulation container.
// Serves a fake job portal login/application page and forwards behavioral
// telemetry to the Django backend.
//
// Simulation cases covered (spec 3.5):
//   - Spoofed domain in the page header (digit substitution)
//   - Missing HTTPS indicator
//   - Excessive PII request (SSN, bank details)
//
// IMPORTANT: No actual credential values are ever forwarded to the backend.
// Only behavioral events (hover, click, submit-attempt, flag) are sent.
// This enforces BR-07: submitted_values are stripped at the container level.

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

const SESSION_ID      = process.env.SESSION_ID      || "test-session"
const STAGE_ID        = process.env.STAGE_ID        || "1"
const WS_BACKEND      = process.env.WS_BACKEND      || "ws://localhost:8000"
const WS_TOKEN        = process.env.WS_TOKEN        || ""
const COMPANY_PROFILE = process.env.COMPANY_PROFILE || ""
const startTime       = Date.now()

function getCompanyField(field) {
  const line = (COMPANY_PROFILE || "").split("\n").find(l => l.startsWith(field + ":"))
  return line ? line.split(":")[1].trim() : null
}

// /context — returns portal config from detection_criteria
app.get("/context", (req, res) => {
  let dc = {}
  try { dc = JSON.parse(process.env.DETECTION_CRITERIA || "{}") } catch (e) {}

  const portal = dc.portal || {
    company_name:    "TalentHub Global",
    spoofed_domain:  "careers.talenthub-g1obal.com",  // digit substitution
    real_domain:     "careers.talenthubglobal.com",
    has_https:       false,                             // missing padlock
    excessive_pii:   true,
    pii_fields:      ["ssn", "bank_account", "passport_scan"],
    logo_url:        null,
  }

  res.json({
    session_id:   SESSION_ID,
    stage_id:     STAGE_ID,
    portal,
    indicators:   dc.indicators || [],
    company_name: getCompanyField("Name") || portal.company_name,
  })
})

// /telemetry — strips credential values before forwarding (BR-07)
app.post("/telemetry", (req, res) => {
  const { event_type, offset_ms, element, stage_id, selected_reason_indices } = req.body

  // BR-07: Never forward any submitted credential values
  const payload = {
    event_type,
    offset_ms:               offset_ms || (Date.now() - startTime),
    element:                 element   || "unknown",
    stage_id:                Number(stage_id || STAGE_ID),
    selected_reason_indices: selected_reason_indices || [],
    // submitted_values intentionally omitted
  }

  sendToBackend(payload)
  res.json({ ok: true })
})

// WebSocket bridge to Django backend
let backendWS = null
let wsConnected = false
const queue = []

function connectBackend() {
  const url = `${WS_BACKEND}/ws/telemetry/${SESSION_ID}/?token=${WS_TOKEN}`
  backendWS = new WebSocket(url)

  backendWS.on("open", () => {
    wsConnected = true
    while (queue.length > 0) backendWS.send(JSON.stringify(queue.shift()))
  })
  backendWS.on("message", (data) => {
    try { broadcastToBrowser(JSON.parse(data)) } catch (e) {}
  })
  backendWS.on("close", () => {
    wsConnected = false
    setTimeout(connectBackend, 3000)
  })
  backendWS.on("error", (err) => console.error("[CRED] WS error:", err.message))
}

function sendToBackend(payload) {
  if (wsConnected && backendWS) backendWS.send(JSON.stringify(payload))
  else queue.push(payload)
}

const browserWss = new WebSocket.Server({ port: 3001 })
const browserClients = new Set()
browserWss.on("connection", (socket) => {
  browserClients.add(socket)
  socket.on("close", () => browserClients.delete(socket))
})

function broadcastToBrowser(msg) {
  const data = JSON.stringify(msg)
  browserClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data)
  })
}

app.listen(3000, () => {
  console.log(`[CRED] Credential form simulation running on :3000`)
  connectBackend()
})
