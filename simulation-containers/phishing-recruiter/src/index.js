// simulation-containers/phishing-recruiter/src/index.js
//
// Node.js server that runs inside the simulation container.
// Serves the fake email client UI and forwards telemetry to Django backend.
//
// Port 3000 → serves the HTML email client (proxied through Django)
// Port 3001 → WebSocket server to push feedback back to the browser
//
// Environment variables injected by Docker (set in containers/tasks.py):
//   SESSION_ID, SCENARIO_ID, STAGE_ID, WS_BACKEND, WS_TOKEN, COMPANY_PROFILE

const express   = require("express")
const path      = require("path")
const WebSocket = require("ws")

const app = express()

// Remove X-Frame-Options so the Django proxy can embed this in an iframe
app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options")
  res.removeHeader("Content-Security-Policy")
  next()
})

app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())

// Read environment variables
const SESSION_ID      = process.env.SESSION_ID      || "test-session"
const STAGE_ID        = process.env.STAGE_ID        || "1"
const WS_BACKEND      = process.env.WS_BACKEND      || "ws://localhost:8000"
const WS_TOKEN        = process.env.WS_TOKEN        || ""
const COMPANY_PROFILE = process.env.COMPANY_PROFILE || ""

// ---------------------------------------------------------------------------
// Helper: parse company info from the profile text
// Profile format: "Name: Acme Corp\nIndustry: Finance\nLocation: New York"
// ---------------------------------------------------------------------------
function getCompanyField(field) {
  const line = (COMPANY_PROFILE || "")
    .split("\n")
    .find(l => l.startsWith(field + ":"))
  return line ? line.split(":")[1].trim() : null
}

// ---------------------------------------------------------------------------
// /context endpoint — browser calls this on load to get email content
//
// Returns the email fields from the attack vector's detection_criteria.
// The detection_criteria JSON is stored in the DB and the email fields
// are embedded in it by AttackVectorBuilder.jsx when admin creates the vector.
// ---------------------------------------------------------------------------
app.get("/context", (req, res) => {
  // The attack vector detection_criteria is passed as DETECTION_CRITERIA env var
  // (set in containers/tasks.py when provisioning the container)
  let detectionCriteria = {}
  try {
    detectionCriteria = JSON.parse(process.env.DETECTION_CRITERIA || "{}")
  } catch (e) {
    console.warn("[SIM] Could not parse DETECTION_CRITERIA:", e.message)
  }

  const email = detectionCriteria.email || {
    sender_name:   "Sarah Reynolds",
    sender_email:  "sarah.reynolds@techcorp-global.net",
    sender_title:  "Senior Recruiter at TechCorp Global",
    subject:       "Exciting opportunity — urgent response needed",
    body:          "Hi,\n\nI came across your profile...\n\nClick here: linkedln.com/assess",
    has_attachment: false,
  }

  res.json({
    session_id:    SESSION_ID,
    stage_id:      STAGE_ID,
    email,
    indicators:    detectionCriteria.indicators    || [],
    company_name:  getCompanyField("Name")         || "TechCorp Global",
    company_location: getCompanyField("Location")  || "San Francisco, CA",
  })
})

// ---------------------------------------------------------------------------
// /telemetry endpoint — browser posts user actions here
// We forward them to Django via the backend WebSocket
// ---------------------------------------------------------------------------
app.post("/telemetry", (req, res) => {
  const { event_type, offset_ms, element, stage_id, selected_reason_indices } = req.body

  // BR-07: never forward credential data — only behavioral telemetry
  const payload = {
    event_type,
    offset_ms:               offset_ms  || (Date.now() - startTime),
    element:                 element    || "unknown",
    stage_id:                Number(stage_id || STAGE_ID),
    // Pass along which reasons the user selected (for bonus points scoring)
    selected_reason_indices: selected_reason_indices || [],
  }

  sendToBackend(payload)
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// WebSocket — connects to Django backend to send telemetry and get feedback
// ---------------------------------------------------------------------------
let backendWS   = null
let wsConnected = false
const queue     = []   // holds messages sent before connection is ready
const startTime = Date.now()

function connectBackend() {
  // Include the JWT token so Django accepts the connection
  const url = `${WS_BACKEND}/ws/telemetry/${SESSION_ID}/?token=${WS_TOKEN}`
  console.log(`[SIM] Connecting to backend: ${url.replace(WS_TOKEN, "***")}`)

  backendWS = new WebSocket(url)

  backendWS.on("open", () => {
    wsConnected = true
    console.log("[SIM] Backend connected")
    // Flush any queued messages
    while (queue.length > 0) {
      backendWS.send(JSON.stringify(queue.shift()))
    }
  })

  backendWS.on("message", (data) => {
    // Receive detection feedback from Django and broadcast to browser
    try {
      const msg = JSON.parse(data)
      broadcastToBrowser(msg)
    } catch (e) {
      console.error("[SIM] Bad message from backend:", e.message)
    }
  })

  backendWS.on("close", () => {
    wsConnected = false
    console.log("[SIM] Backend disconnected — retrying in 3s")
    setTimeout(connectBackend, 3000)
  })

  backendWS.on("error", (err) => {
    console.error("[SIM] Backend WS error:", err.message)
  })
}

function sendToBackend(payload) {
  if (wsConnected && backendWS) {
    backendWS.send(JSON.stringify(payload))
  } else {
    // Queue it — will be sent when connection opens
    queue.push(payload)
  }
}

// ---------------------------------------------------------------------------
// Browser WebSocket — pushes feedback from Django back to the HTML page
// ---------------------------------------------------------------------------
const browserWss     = new WebSocket.Server({ port: 3001 })
const browserClients = new Set()

browserWss.on("connection", (socket) => {
  browserClients.add(socket)
  console.log("[SIM] Browser client connected")
  socket.on("close", () => browserClients.delete(socket))
})

function broadcastToBrowser(msg) {
  const data = JSON.stringify(msg)
  browserClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(3000, () => {
  console.log("[SIM] Email client running on :3000")
  console.log(`[SIM] Session: ${SESSION_ID} | Stage: ${STAGE_ID}`)
  connectBackend()
})