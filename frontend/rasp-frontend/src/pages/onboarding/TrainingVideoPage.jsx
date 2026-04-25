// src/pages/onboarding/TrainingVideoPage.jsx
//
// Cinematic introductory training video with animated narrator persona,
// kinetic captions, and scene-by-scene animated illustrations.
// Plays automatically like a video. Play/pause/scrub controls included.
// Stores completion in localStorage — no backend model change needed.

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

// ---------------------------------------------------------------------------
// Script — each scene has a narration that drives timing for everything else
// ---------------------------------------------------------------------------
const SCRIPT = [
  {
    id: "intro",
    title: "The Recruitment Ecosystem",
    accent: "#60a5fa",
    duration: 9500,
    narration:
      "Every day, HR professionals and job seekers exchange sensitive information through recruitment. Resumes, messages, job offers — this process is built on one fundamental thing: trust.",
    illustration: "ecosystem",
  },
  {
    id: "trust",
    title: "How Trust is Formed",
    accent: "#a78bfa",
    duration: 10000,
    narration:
      "When a recruiter reaches out personally, your brain makes a fast judgment — this person took time to contact me, they seem legitimate. Trust forms almost instantly. And that reflex is exactly what attackers exploit.",
    illustration: "trust",
  },
  {
    id: "attacker",
    title: "The Attacker's Perspective",
    accent: "#f87171",
    duration: 10500,
    narration:
      "Attackers don't hack systems — they hack people. They study how recruiters communicate, copy their language, and craft messages indistinguishable from the real thing. Their goal is to become someone you believe.",
    illustration: "attacker",
  },
  {
    id: "insider",
    title: "The Slow-Burn Threat",
    accent: "#fb923c",
    duration: 11000,
    narration:
      "Sometimes the attack doesn't happen immediately. An attacker may spend weeks posing as a legitimate contact — building rapport, establishing credibility — before making their move. By the time the payload arrives, the victim fully trusts the sender. This is how insider threats are cultivated.",
    illustration: "insider",
  },
  {
    id: "vectors",
    title: "Three Attack Vectors",
    accent: "#f59e0b",
    duration: 10500,
    narration:
      "In recruitment-based attacks, three vectors dominate. Malicious attachments disguised as job offers or contracts. Credential-harvesting links through fake assessment portals. And information extraction — getting employees to share sensitive data under the guise of a normal business conversation.",
    illustration: "vectors",
  },
  {
    id: "redflags",
    title: "The Tells",
    accent: "#34d399",
    duration: 10000,
    narration:
      "Every attack leaves traces. A domain that's one letter off. An email that doesn't match the company name. A file with a double extension. Pressure to act within 48 hours. These are the tells — and recognizing them is a learnable skill.",
    illustration: "redflags",
  },
  {
    id: "ready",
    title: "Your Training Begins",
    accent: "#4ade80",
    duration: 8000,
    narration:
      "The simulations ahead put you in the chair. Real-looking scenarios, real decision points. Catch what others miss — flag the threat, identify the reason, protect the organization. You're ready.",
    illustration: "ready",
  },
]

const TOTAL_DURATION = SCRIPT.reduce((sum, s) => sum + s.duration, 0)

// ---------------------------------------------------------------------------
// Narrator persona — animated SVG character
// ---------------------------------------------------------------------------
function Persona({ speaking, accent }) {
  const [blink, setBlink] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(false)
  const [nod, setNod] = useState(false)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 120)
    }, 3200 + Math.random() * 1500)
    return () => clearInterval(blinkInterval)
  }, [])

  useEffect(() => {
    if (!speaking) { setMouthOpen(false); return }
    const mouthInterval = setInterval(() => {
      setMouthOpen(prev => !prev)
    }, 180)
    return () => clearInterval(mouthInterval)
  }, [speaking])

  useEffect(() => {
    if (!speaking) return
    const nodInterval = setInterval(() => {
      setNod(true)
      setTimeout(() => setNod(false), 300)
    }, 2800)
    return () => clearInterval(nodInterval)
  }, [speaking])

  return (
    <svg
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: "100px",
        height: "130px",
        transform: nod ? "translateY(2px)" : "translateY(0)",
        transition: "transform 0.25s ease",
      }}
    >
      {/* Body / jacket */}
      <path d="M20 95 Q15 115 12 128 L88 128 Q85 115 80 95 Q70 88 50 88 Q30 88 20 95Z"
        fill="rgba(30,41,59,0.9)" stroke={accent} strokeWidth="0.8" strokeOpacity="0.5"/>
      {/* Collar */}
      <path d="M38 88 L50 100 L62 88" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      {/* Shirt */}
      <rect x="46" y="88" width="8" height="20" rx="2" fill="rgba(255,255,255,0.1)"/>
      {/* Neck */}
      <rect x="44" y="78" width="12" height="14" rx="4" fill="#c8a882"/>
      {/* Head */}
      <ellipse
        cx="50" cy="60" rx="24" ry="26"
        fill="#c8a882"
        style={{
          transform: nod ? "scaleY(0.97)" : "scaleY(1)",
          transformOrigin: "50px 78px",
          transition: "transform 0.25s ease",
        }}
      />
      {/* Hair */}
      <path d="M26 52 Q28 32 50 30 Q72 32 74 52 Q68 40 50 38 Q32 40 26 52Z"
        fill="rgba(30,20,10,0.9)"/>
      {/* Glasses frame */}
      <rect x="30" y="54" width="16" height="11" rx="3"
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
      <rect x="54" y="54" width="16" height="11" rx="3"
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
      <line x1="46" y1="59" x2="54" y2="59"
        stroke="rgba(255,255,255,0.4)" strokeWidth="0.7"/>
      <line x1="30" y1="59" x2="26" y2="57"
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.7"/>
      <line x1="70" y1="59" x2="74" y2="57"
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.7"/>
      {/* Eyes */}
      {blink ? (
        <>
          <line x1="34" y1="60" x2="42" y2="60" stroke="rgba(40,20,10,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="58" y1="60" x2="66" y2="60" stroke="rgba(40,20,10,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <ellipse cx="38" cy="60" rx="4" ry="3.5" fill="rgba(40,20,10,0.9)"/>
          <ellipse cx="62" cy="60" rx="4" ry="3.5" fill="rgba(40,20,10,0.9)"/>
          <circle cx="39" cy="59" r="1" fill="rgba(255,255,255,0.7)"/>
          <circle cx="63" cy="59" r="1" fill="rgba(255,255,255,0.7)"/>
        </>
      )}
      {/* Nose */}
      <path d="M49 64 Q47 68 49 70 Q51 70 53 68 Q51 64 49 64Z"
        fill="rgba(160,100,60,0.5)"/>
      {/* Mouth */}
      {mouthOpen ? (
        <ellipse cx="50" cy="74" rx="5" ry="3" fill="rgba(40,20,10,0.8)"/>
      ) : (
        <path d="M44 74 Q50 77 56 74" fill="none" stroke="rgba(40,20,10,0.7)" strokeWidth="1" strokeLinecap="round"/>
      )}
      {/* Headset */}
      <path d="M26 55 Q26 35 50 35 Q74 35 74 55"
        fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.7"/>
      <circle cx="26" cy="58" r="4" fill={accent} fillOpacity="0.8"/>
      <circle cx="74" cy="58" r="4" fill={accent} fillOpacity="0.8"/>
      <line x1="26" y1="62" x2="26" y2="68" stroke={accent} strokeWidth="1" strokeOpacity="0.7"/>
      <circle cx="26" cy="70" r="2.5" fill={accent} fillOpacity="0.6"/>
      {/* Speaking indicator dots */}
      {speaking && (
        <g>
          <circle cx="38" cy="120" r="2" fill={accent} fillOpacity="0.9">
            <animate attributeName="r" values="2;3;2" dur="0.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="50" cy="120" r="2" fill={accent} fillOpacity="0.7">
            <animate attributeName="r" values="2;3;2" dur="0.6s" begin="0.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="62" cy="120" r="2" fill={accent} fillOpacity="0.5">
            <animate attributeName="r" values="2;3;2" dur="0.6s" begin="0.4s" repeatCount="indefinite"/>
          </circle>
        </g>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Scene illustrations
// ---------------------------------------------------------------------------
function SceneEcosystem() {
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      {[
        [80,60],[250,40],[420,60],[50,160],[180,180],
        [320,175],[460,160],[250,240]
      ].map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill="rgba(96,165,250,0.1)" stroke="rgba(96,165,250,0.4)" strokeWidth="1">
            <animate attributeName="opacity" values="0;1" dur="0.4s" begin={`${i*0.15}s`} fill="freeze"/>
          </circle>
          <circle cx={x} cy={y} r="6" fill="rgba(96,165,250,0.6)">
            <animate attributeName="opacity" values="0;1" dur="0.4s" begin={`${i*0.15}s`} fill="freeze"/>
          </circle>
        </g>
      ))}
      {[
        [80,60,250,40],[250,40,420,60],[80,60,50,160],
        [250,40,180,180],[420,60,460,160],[250,40,320,175],
        [50,160,180,180],[320,175,460,160],[180,180,250,240],
        [320,175,250,240]
      ].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(96,165,250,0.2)" strokeWidth="0.8" strokeDasharray="3 3">
          <animate attributeName="opacity" values="0;1" dur="0.5s" begin={`${0.8+i*0.1}s`} fill="freeze"/>
        </line>
      ))}
      <text x="250" y="270" textAnchor="middle" fill="rgba(96,165,250,0.5)" fontSize="12" fontFamily="monospace">
        millions of daily trust-based interactions
      </text>
    </svg>
  )
}

function SceneTrust() {
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      <circle cx="150" cy="130" r="40" fill="rgba(167,139,250,0.1)" stroke="rgba(167,139,250,0.3)" strokeWidth="1">
        <animate attributeName="r" values="40;43;40" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="150" cy="120" r="15" fill="rgba(167,139,250,0.4)" stroke="rgba(167,139,250,0.6)" strokeWidth="1"/>
      <rect x="130" y="138" width="40" height="26" rx="8"
        fill="rgba(167,139,250,0.3)" stroke="rgba(167,139,250,0.5)" strokeWidth="0.8"/>
      <text x="150" y="175" textAnchor="middle" fill="rgba(167,139,250,0.7)" fontSize="10">HR Personnel</text>

      <rect x="215" y="90" width="120" height="60" rx="6"
        fill="rgba(167,139,250,0.08)" stroke="rgba(167,139,250,0.3)" strokeWidth="0.8">
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0.5s" fill="freeze"/>
      </rect>
      <text x="275" y="115" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontFamily="monospace">
        <animate attributeName="opacity" values="0;1" dur="0.3s" begin="0.7s" fill="freeze"/>
        Hi, I came across your
      </text>
      <text x="275" y="130" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontFamily="monospace">
        <animate attributeName="opacity" values="0;1" dur="0.3s" begin="0.9s" fill="freeze"/>
        profile and I'm impressed...
      </text>
      <line x1="215" y1="120" x2="190" y2="125" stroke="rgba(167,139,250,0.3)" strokeWidth="0.8">
        <animate attributeName="opacity" values="0;1" dur="0.3s" begin="0.5s" fill="freeze"/>
      </line>

      <g transform="translate(370,90)">
        <animate attributeName="opacity" values="0;1" dur="0.4s" begin="1.5s" fill="freeze"/>
        <circle cy="-10" r="18" fill="rgba(167,139,250,0.1)" stroke="rgba(167,139,250,0.4)" strokeWidth="1"/>
        <path d="M-6 5 Q0 14 6 5" fill="none" stroke="rgba(74,222,128,0.8)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="-5" cy="-12" r="3" fill="rgba(167,139,250,0.6)"/>
        <circle cx="5" cy="-12" r="3" fill="rgba(167,139,250,0.6)"/>
        <text y="25" textAnchor="middle" fill="rgba(74,222,128,0.7)" fontSize="9">trust formed</text>
      </g>

      <path d="M250 140 L350 140" stroke="rgba(167,139,250,0.3)" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arrowPurple)">
        <animate attributeName="opacity" values="0;1" dur="0.3s" begin="1.2s" fill="freeze"/>
      </path>
      <defs>
        <marker id="arrowPurple" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto">
          <path d="M2 2L8 5L2 8" fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="1.5"/>
        </marker>
      </defs>
      <text x="250" y="270" textAnchor="middle" fill="rgba(167,139,250,0.4)" fontSize="11" fontFamily="monospace">
        fast trust = exploitable trust
      </text>
    </svg>
  )
}

function SceneAttacker() {
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      <circle cx="130" cy="120" r="40" fill="rgba(241,90,90,0.05)" stroke="rgba(241,90,90,0.2)" strokeWidth="1"/>
      <circle cx="130" cy="110" r="16" fill="rgba(30,30,30,0.8)" stroke="rgba(241,90,90,0.4)" strokeWidth="1"/>
      <rect x="108" y="128" width="44" height="28" rx="8" fill="rgba(30,30,30,0.8)" stroke="rgba(241,90,90,0.3)" strokeWidth="0.8"/>
      <path d="M118 108 Q130 96 142 108" fill="rgba(20,20,20,0.9)" stroke="rgba(241,90,90,0.4)" strokeWidth="0.8"/>
      <line x1="122" y1="112" x2="128" y2="112" stroke="rgba(241,90,90,0.5)" strokeWidth="0.8"/>
      <line x1="132" y1="112" x2="138" y2="112" stroke="rgba(241,90,90,0.5)" strokeWidth="0.8"/>
      <text x="130" y="175" textAnchor="middle" fill="rgba(241,90,90,0.6)" fontSize="10">threat actor</text>

      <g>
        <animate attributeName="opacity" values="0;1" dur="0.4s" begin="1s" fill="freeze"/>
        <rect x="210" y="70" width="130" height="90" rx="6"
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        <rect x="210" y="70" width="130" height="24" rx="6"
          fill="rgba(255,255,255,0.06)"/>
        <circle cx="223" cy="82" r="4" fill="rgba(96,165,250,0.5)"/>
        <text x="240" y="86" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">linkedin.com</text>
        <text x="225" y="115" fill="rgba(255,255,255,0.7)" fontSize="10">Sarah Reynolds</text>
        <text x="225" y="128" fill="rgba(255,255,255,0.4)" fontSize="9">Senior Recruiter · TechCorp</text>
        <text x="225" y="141" fill="rgba(96,165,250,0.6)" fontSize="9">✓ 500+ connections</text>
      </g>

      <g>
        <animate attributeName="opacity" values="0;1" dur="0.4s" begin="2s" fill="freeze"/>
        <line x1="170" y1="115" x2="208" y2="115" stroke="rgba(241,90,90,0.4)" strokeWidth="1" strokeDasharray="3 2"/>
        <text x="188" y="109" textAnchor="middle" fill="rgba(241,90,90,0.6)" fontSize="9">crafted by</text>
      </g>

      <g>
        <animate attributeName="opacity" values="0;1" dur="0.4s" begin="2.8s" fill="freeze"/>
        <rect x="360" y="85" width="100" height="60" rx="4"
          fill="rgba(241,90,90,0.08)" stroke="rgba(241,90,90,0.3)" strokeWidth="0.8"/>
        <text x="410" y="108" textAnchor="middle" fill="rgba(241,90,90,0.8)" fontSize="10" fontWeight="500">indistinguishable</text>
        <text x="410" y="122" textAnchor="middle" fill="rgba(241,90,90,0.6)" fontSize="9">from the real thing</text>
        <text x="410" y="136" textAnchor="middle" fill="rgba(241,90,90,0.5)" fontSize="9">T1566 · phishing</text>
        <line x1="340" y1="115" x2="358" y2="115" stroke="rgba(241,90,90,0.3)" strokeWidth="0.8"/>
      </g>

      <text x="250" y="270" textAnchor="middle" fill="rgba(241,90,90,0.4)" fontSize="11" fontFamily="monospace">
        they hack judgment, not systems
      </text>
    </svg>
  )
}

function SceneInsider() {
  const steps = [
    { t: 0, label: "Week 1", sub: "first contact", ok: true },
    { t: 1.2, label: "Week 3", sub: "builds rapport", ok: true },
    { t: 2.4, label: "Week 6", sub: "shares intel", warn: true },
    { t: 3.6, label: "Week 8", sub: "payload delivered", bad: true },
  ]
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      <line x1="60" y1="130" x2="440" y2="130"
        stroke="rgba(251,146,60,0.2)" strokeWidth="1" strokeDasharray="4 3"/>
      {steps.map((s, i) => (
        <g key={i}>
          <animate attributeName="opacity" values="0;1" dur="0.4s" begin={`${s.t}s`} fill="freeze"/>
          <circle cx={80 + i*120} cy={130} r="12"
            fill={s.bad ? "rgba(241,90,90,0.15)" : s.warn ? "rgba(251,146,60,0.15)" : "rgba(251,146,60,0.1)"}
            stroke={s.bad ? "rgba(241,90,90,0.6)" : s.warn ? "rgba(251,146,60,0.6)" : "rgba(251,146,60,0.4)"}
            strokeWidth="1"/>
          <circle cx={80 + i*120} cy={130} r="4"
            fill={s.bad ? "rgba(241,90,90,0.7)" : s.warn ? "rgba(251,146,60,0.7)" : "rgba(251,146,60,0.5)"}/>
          <text x={80 + i*120} y={110} textAnchor="middle"
            fill={s.bad ? "rgba(241,90,90,0.8)" : "rgba(251,146,60,0.8)"}
            fontSize="11" fontWeight="500">{s.label}</text>
          <text x={80 + i*120} y={155} textAnchor="middle"
            fill="rgba(255,255,255,0.4)" fontSize="9">{s.sub}</text>
        </g>
      ))}
      <g>
        <animate attributeName="opacity" values="0;1" dur="0.5s" begin="4s" fill="freeze"/>
        <rect x="300" y="170" width="150" height="45" rx="5"
          fill="rgba(241,90,90,0.1)" stroke="rgba(241,90,90,0.4)" strokeWidth="0.8"/>
        <text x="375" y="189" textAnchor="middle" fill="rgba(241,90,90,0.8)" fontSize="11">victim fully trusts</text>
        <text x="375" y="205" textAnchor="middle" fill="rgba(241,90,90,0.6)" fontSize="10">the attacker by now</text>
        <line x1="320" y1="142" x2="340" y2="170" stroke="rgba(241,90,90,0.3)" strokeWidth="0.8"/>
      </g>
      <text x="250" y="265" textAnchor="middle" fill="rgba(251,146,60,0.4)" fontSize="11" fontFamily="monospace">
        slow-burn attacks are the hardest to detect
      </text>
    </svg>
  )
}

function SceneVectors() {
  const vectors = [
    { x: 50, label: "Malicious attachments", sub: ".pdf.exe · .docx macros", color: "rgba(248,113,113,", delay: 0 },
    { x: 190, label: "Fake portals", sub: "credential harvesting links", color: "rgba(251,146,60,", delay: 0.6 },
    { x: 330, label: "Info extraction", sub: "posing as legitimate contact", color: "rgba(250,204,21,", delay: 1.2 },
  ]
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      {vectors.map((v, i) => (
        <g key={i}>
          <animate attributeName="opacity" values="0;1" dur="0.5s" begin={`${v.delay}s`} fill="freeze"/>
          <rect x={v.x} y="60" width="120" height="140" rx="8"
            fill={`${v.color}0.07)`} stroke={`${v.color}0.4)`} strokeWidth="1"/>
          <rect x={v.x} y="60" width="120" height="40" rx="8"
            fill={`${v.color}0.12)`}/>
          <text x={v.x + 60} y="86" textAnchor="middle"
            fill={`${v.color}0.9)`} fontSize="11" fontWeight="500">{i + 1}</text>
          <text x={v.x + 60} y="120" textAnchor="middle"
            fill="rgba(255,255,255,0.75)" fontSize="10">{v.label}</text>
          <text x={v.x + 60} y="140" textAnchor="middle"
            fill="rgba(255,255,255,0.4)" fontSize="9">{v.sub.split(' ').slice(0,2).join(' ')}</text>
          <text x={v.x + 60} y="153" textAnchor="middle"
            fill="rgba(255,255,255,0.4)" fontSize="9">{v.sub.split(' ').slice(2).join(' ')}</text>
        </g>
      ))}
      <text x="250" y="265" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="monospace">
        all three exploit the recruitment trust chain
      </text>
    </svg>
  )
}

function SceneRedFlags() {
  const flags = [
    { x: 60, y: 70, label: "linkedln.com", hint: "wrong domain", color: "rgba(52,211,153,", delay: 0 },
    { x: 180, y: 110, label: "sarah@techcorp-global.net", hint: "domain mismatch", color: "rgba(52,211,153,", delay: 0.8 },
    { x: 310, y: 75, label: "48 hours to respond", hint: "urgency pressure", color: "rgba(52,211,153,", delay: 1.6 },
    { x: 90, y: 175, label: "JobOffer.pdf.exe", hint: "double extension", color: "rgba(52,211,153,", delay: 2.4 },
    { x: 300, y: 165, label: "no company verification", hint: "unverifiable source", color: "rgba(52,211,153,", delay: 3.2 },
  ]
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      {flags.map((f, i) => (
        <g key={i}>
          <animate attributeName="opacity" values="0;1" dur="0.4s" begin={`${f.delay}s`} fill="freeze"/>
          <rect x={f.x} y={f.y} width={Math.max(120, f.label.length * 7 + 20)} height="30" rx="4"
            fill={`${f.color}0.08)`} stroke={`${f.color}0.5)`} strokeWidth="0.8"/>
          <text x={f.x + 8} y={f.y + 14} fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="monospace">{f.label}</text>
          <text x={f.x + 8} y={f.y + 25} fill={`${f.color}0.8)`} fontSize="8">{f.hint}</text>
          <circle cx={f.x + Math.max(120, f.label.length * 7 + 20) - 8} cy={f.y + 10} r="5"
            fill={`${f.color}0.15)`} stroke={`${f.color}0.7)`} strokeWidth="0.8"/>
          <text
            x={f.x + Math.max(120, f.label.length * 7 + 20) - 8}
            y={f.y + 14}
            textAnchor="middle"
            fill={`${f.color}0.9)`} fontSize="8" fontWeight="bold">!</text>
        </g>
      ))}
      <text x="250" y="265" textAnchor="middle" fill="rgba(52,211,153,0.4)" fontSize="11" fontFamily="monospace">
        every attack leaves traces — train your eye
      </text>
    </svg>
  )
}

function SceneReady() {
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{width:"100%", height:"100%"}}>
      <circle cx="250" cy="125" r="65" fill="rgba(74,222,128,0.06)" stroke="rgba(74,222,128,0.2)" strokeWidth="1">
        <animate attributeName="r" values="65;68;65" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="250" cy="125" r="48" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.3)" strokeWidth="1.5"/>
      <path d="M225 125 L241 141 L275 107"
        stroke="rgba(74,222,128,0.9)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" values="0 100;100 0" dur="0.8s" fill="freeze"/>
        <animate attributeName="stroke-dashoffset" values="0;0" dur="0.8s" fill="freeze"/>
      </path>
      <text x="250" y="205" textAnchor="middle" fill="rgba(74,222,128,0.7)" fontSize="13" fontWeight="500">
        you are ready to begin
      </text>
      <text x="250" y="222" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10">
        flag threats · identify reasons · protect the organization
      </text>
    </svg>
  )
}

const ILLUSTRATIONS = {
  ecosystem: <SceneEcosystem />,
  trust:     <SceneTrust />,
  attacker:  <SceneAttacker />,
  insider:   <SceneInsider />,
  vectors:   <SceneVectors />,
  redflags:  <SceneRedFlags />,
  ready:     <SceneReady />,
}

// ---------------------------------------------------------------------------
// Main video component
// ---------------------------------------------------------------------------
export default function TrainingVideoPage() {
  const [sceneIndex, setSceneIndex]     = useState(0)
  const [playing, setPlaying]           = useState(true)
  const [wordIndex, setWordIndex]       = useState(0)
  const [totalProgress, setTotalProgress] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const rafRef    = useRef(null)
  const startRef  = useRef(null)
  const pausedMs  = useRef(0)

  const scene = SCRIPT[sceneIndex]
  const words = scene.narration.split(" ")

  const handleComplete = useCallback(() => {
    localStorage.setItem("has_completed_onboarding", "true")
    const path = user?.role === "hr_personnel" ? "/hr"
               : user?.role === "administrator" ? "/admin"
               : "/jobseeker"
    navigate(path)
  }, [user, navigate])

  const jumpToScene = useCallback((idx) => {
    if (idx >= SCRIPT.length) { handleComplete(); return }
    setTransitioning(true)
    setWordIndex(0)
    startRef.current = null
    pausedMs.current = 0
    const elapsed = SCRIPT.slice(0, idx).reduce((s, sc) => s + sc.duration, 0)
    setTotalProgress(elapsed / TOTAL_DURATION * 100)
    setTimeout(() => {
      setSceneIndex(idx)
      setTransitioning(false)
    }, 320)
  }, [handleComplete])

  // Main animation loop
  useEffect(() => {
    if (!playing) return

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts - pausedMs.current
      const elapsed = ts - startRef.current
      const pct = Math.min(elapsed / scene.duration, 1)

      // Update word reveal
      const wIdx = Math.floor(pct * words.length)
      setWordIndex(Math.min(wIdx, words.length - 1))

      // Update total progress bar
      const prevDur = SCRIPT.slice(0, sceneIndex).reduce((s, sc) => s + sc.duration, 0)
      setTotalProgress(((prevDur + elapsed) / TOTAL_DURATION) * 100)

      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Pause briefly at end of scene before advancing
        setTimeout(() => jumpToScene(sceneIndex + 1), 600)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [playing, sceneIndex, scene.duration, words.length, jumpToScene])

  const togglePlay = () => {
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      // Store how far through current scene we are
      const prevDur = SCRIPT.slice(0, sceneIndex).reduce((s, sc) => s + sc.duration, 0)
      pausedMs.current = (totalProgress / 100) * TOTAL_DURATION - prevDur
      startRef.current = null
    }
    setPlaying(p => !p)
  }

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`
  }

  const elapsed = (totalProgress / 100) * TOTAL_DURATION

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090e",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Ambient scene color */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 60% 40%, ${scene.accent}06 0%, transparent 65%)`,
        transition: "background 1.2s ease",
        pointerEvents: "none",
      }}/>

      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{
            background: `${scene.accent}20`,
            border: `0.5px solid ${scene.accent}40`,
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            color: scene.accent,
            fontFamily: "monospace",
            transition: "all 0.5s ease",
          }}>
            {sceneIndex + 1}/{SCRIPT.length} · {scene.title}
          </div>
        </div>
        <button
          onClick={handleComplete}
          style={{
            background: "transparent",
            border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            color: "rgba(255,255,255,0.35)",
            fontSize: "12px",
            padding: "5px 14px",
            cursor: "pointer",
          }}
        >
          skip →
        </button>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        position: "relative",
        zIndex: 5,
      }}>
        {/* Illustration */}
        <div style={{
          width: "100%",
          maxWidth: "580px",
          height: "260px",
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "scale(0.97)" : "scale(1)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}>
          {ILLUSTRATIONS[scene.illustration]}
        </div>

        {/* Caption / kinetic text */}
        <div style={{
          width: "100%",
          maxWidth: "620px",
          minHeight: "80px",
          marginTop: "16px",
          padding: "0 12px",
          textAlign: "center",
          opacity: transitioning ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}>
          <p style={{
            fontSize: "17px",
            lineHeight: "1.65",
            color: "rgba(255,255,255,0.85)",
            margin: 0,
            letterSpacing: "0.01em",
          }}>
            {words.map((word, i) => (
              <span
                key={i}
                style={{
                  opacity: i <= wordIndex ? 1 : 0.12,
                  transition: i === wordIndex ? "opacity 0.15s ease" : "none",
                  marginRight: "4px",
                  display: "inline",
                  color: i === wordIndex ? scene.accent : undefined,
                }}
              >
                {word}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Persona + controls bar */}
      <div style={{
        position: "relative",
        zIndex: 10,
        padding: "0 24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        {/* Progress bar */}
        <div style={{
          height: "3px",
          background: "rgba(255,255,255,0.07)",
          borderRadius: "2px",
          position: "relative",
          cursor: "pointer",
        }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = (e.clientX - rect.left) / rect.width
            const targetTime = pct * TOTAL_DURATION
            let acc = 0
            for (let i = 0; i < SCRIPT.length; i++) {
              if (acc + SCRIPT[i].duration > targetTime) {
                pausedMs.current = targetTime - acc
                startRef.current = null
                setSceneIndex(i)
                setWordIndex(0)
                setTotalProgress(pct * 100)
                break
              }
              acc += SCRIPT[i].duration
            }
          }}
        >
          <div style={{
            height: "100%",
            width: `${Math.min(totalProgress, 100)}%`,
            background: scene.accent,
            borderRadius: "2px",
            transition: "width 0.1s linear, background 0.5s ease",
          }}/>
          {/* Chapter markers */}
          {SCRIPT.map((s, i) => {
            const pct = SCRIPT.slice(0,i).reduce((sum,sc) => sum+sc.duration,0) / TOTAL_DURATION * 100
            return (
              <div key={i} style={{
                position: "absolute",
                left: `${pct}%`,
                top: "-3px",
                width: "2px",
                height: "9px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "1px",
              }}/>
            )
          })}
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Persona */}
          <Persona speaking={playing && !transitioning} accent={scene.accent}/>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: `${scene.accent}18`,
              border: `0.5px solid ${scene.accent}40`,
              color: scene.accent,
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Scene prev/next */}
          <button
            onClick={() => sceneIndex > 0 && jumpToScene(sceneIndex - 1)}
            disabled={sceneIndex === 0}
            style={{
              background: "transparent",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              color: sceneIndex === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)",
              fontSize: "12px",
              padding: "6px 12px",
              cursor: sceneIndex === 0 ? "default" : "pointer",
            }}
          >
            ← prev
          </button>
          <button
            onClick={() => jumpToScene(sceneIndex + 1)}
            style={{
              background: "transparent",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "12px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            next →
          </button>

          <div style={{ flex: 1 }}/>

          {/* Time display */}
          <span style={{
            fontFamily: "monospace",
            fontSize: "12px",
            color: "rgba(255,255,255,0.3)",
          }}>
            {formatTime(elapsed)} / {formatTime(TOTAL_DURATION)}
          </span>

          {/* Chapter dots */}
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            {SCRIPT.map((s, i) => (
              <button
                key={i}
                onClick={() => jumpToScene(i)}
                style={{
                  width: i === sceneIndex ? "20px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: i < sceneIndex
                    ? scene.accent
                    : i === sceneIndex
                    ? scene.accent
                    : "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  opacity: i === sceneIndex ? 0.9 : i < sceneIndex ? 0.4 : 0.25,
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Begin button — last scene */}
          {sceneIndex === SCRIPT.length - 1 && (
            <button
              onClick={handleComplete}
              style={{
                background: "rgba(74,222,128,0.12)",
                border: "0.5px solid rgba(74,222,128,0.4)",
                borderRadius: "8px",
                color: "rgba(74,222,128,0.95)",
                fontSize: "13px",
                fontWeight: "600",
                padding: "9px 22px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(74,222,128,0.12)"}
            >
              Begin Simulation →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}