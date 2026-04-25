// src/pages/admin/AttackVectorBuilder.jsx
//
// Attack vector builder using the pre-built template pool.
// Flow: Pick template → Customize fields → Save
//
// Props:
//   stageId   — the stage this vector belongs to
//   vectorId  — if editing an existing vector (optional)
//   onSaved   — callback after successful save
//   onCancel  — callback to close without saving
//
// Fix log:
//   [Fix #1] template.detection_criteria was accessed without guarding against
//            undefined, crashing TemplatePicker and CustomizeForm when any
//            template entry is missing that field. Added optional chaining
//            throughout (?.mitre_id, ?.indicators, ?.length, etc.).
//
//   [Fix #2] vector_type was set to template.category, which uses UI-only
//            labels (e.g. "extraction", "attachment", "impersonation") that
//            don't match Django's VectorType enum choices. Added
//            CATEGORY_TO_VECTOR_TYPE mapping as a safety net, and prefer
//            template.vector_type (the explicit field added to every template).
//
//   [Fix #3] The advanced multi-vector template has no `email` field, so
//            initialising CustomizeForm state from template.email crashed.
//            TemplatePicker now detects multiVector:true templates and routes
//            them to a dedicated notice instead of CustomizeForm.

import { useState } from "react"
import { scenariosApi } from "../../api/index"
import { Button, Alert } from "../../components/ui/index"
import {
  ATTACK_TEMPLATES,
  ATTACK_CATEGORIES,
  VECTOR_TYPE_TO_IMAGE,
} from "../../constants/attackTemplates"

// ---------------------------------------------------------------------------
// Safety-net mapping: UI category id → Django AttackVector.VectorType value.
//
// Django accepts exactly: phishing_link | malicious_file | credential_form
//                         fake_identity | geographic     | urgency
//
// This map is consulted only when template.vector_type is absent or unset.
// Now that every template carries vector_type, this is purely defensive.
// ---------------------------------------------------------------------------
const CATEGORY_TO_VECTOR_TYPE = {
  // Pass-throughs (already valid backend values)
  phishing_link: "phishing_link",
  malicious_file: "malicious_file",
  credential_form: "credential_form",
  fake_identity: "fake_identity",
  geographic: "geographic",
  urgency: "urgency",
  // Legacy UI-only category names that diverged from the backend enum
  attachment: "malicious_file",
  extraction: "credential_form",
  impersonation: "fake_identity",
  social: "fake_identity",
  phishing: "phishing_link",
  malware: "malicious_file",
  geo: "geographic",
}

/**
 * Resolve the correct Django VectorType string for a template.
 * Priority: template.vector_type → CATEGORY_TO_VECTOR_TYPE[category] → raw category
 */
function resolveVectorType(template) {
  if (template.vector_type && CATEGORY_TO_VECTOR_TYPE[template.vector_type]) {
    return template.vector_type
  }
  return CATEGORY_TO_VECTOR_TYPE[template.category] ?? template.category
}

// ---------------------------------------------------------------------------
// Category badge — colored pill matching the attack type
// ---------------------------------------------------------------------------
function CategoryBadge({ category }) {
  const cat = ATTACK_CATEGORIES.find((c) => c.id === category)
  if (!cat) return null
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full border"
      style={{
        background: `${cat.color}18`,
        borderColor: `${cat.color}50`,
        color: cat.color,
      }}
    >
      {cat.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Template picker grid
// ---------------------------------------------------------------------------
function TemplatePicker({ onSelect, onSelectMultiVector }) {
  const [activeCategory, setActiveCategory] = useState("all")

  const filtered =
    activeCategory === "all"
      ? ATTACK_TEMPLATES
      : ATTACK_TEMPLATES.filter((t) => t.category === activeCategory)

  return (
    <div>
      {/* Category filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${activeCategory === "all"
              ? "bg-accent/10 border-accent/40 text-accent"
              : "border-border text-text-secondary hover:border-border-secondary"
            }`}
        >
          All ({ATTACK_TEMPLATES.length})
        </button>
        {ATTACK_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="px-3 py-1 rounded-full text-xs border transition-colors"
            style={{
              background: activeCategory === cat.id ? `${cat.color}15` : "transparent",
              borderColor: activeCategory === cat.id ? `${cat.color}60` : "var(--color-border-tertiary)",
              color: activeCategory === cat.id ? cat.color : "var(--color-text-secondary)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((template) => {
          const isMulti = !!template.multiVector

          return (
            <button
              key={template.id}
              onClick={() =>
                isMulti ? onSelectMultiVector(template) : onSelect(template)
              }
              className={`card text-left p-4 transition-all hover:-translate-y-0.5 active:translate-y-0 ${isMulti
                  ? "hover:border-warning/60 border-warning/30 bg-warning/5"
                  : "hover:border-border-primary"
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-sm text-text-primary">{template.name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isMulti && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-warning/50 bg-warning/10 text-warning font-medium">
                      Multi-Vector
                    </span>
                  )}
                  <CategoryBadge category={template.category} />
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                {template.description}
              </p>
              {/* Fix #1 — guard against missing detection_criteria */}
              <div className="flex items-center gap-3 text-text-muted text-xs font-mono">
                <span>{template.detection_criteria?.mitre_id ?? "—"}</span>
                <span>·</span>
                {isMulti ? (
                  <span>{template.stageTemplate?.vectors?.length ?? 0} vectors</span>
                ) : (
                  <span>{template.detection_criteria?.indicators?.length ?? 0} indicators</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Multi-vector notice — shown when admin selects an advanced template.
// Full multi-vector creation is handled outside this component (Stage Builder).
// ---------------------------------------------------------------------------
function MultiVectorNotice({ template, onBack }) {
  const vectors = template.stageTemplate?.vectors ?? []
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-xs text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:border-border-secondary transition-colors"
        >
          ← back to templates
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary">{template.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-warning/50 bg-warning/10 text-warning font-medium">
            Multi-Vector
          </span>
        </div>
      </div>

      <div className="card p-5 border-warning/30 bg-warning/5 space-y-4">
        <p className="text-sm text-text-primary font-medium">
          This template creates {vectors.length} attack vectors simultaneously on a single stage.
        </p>
        <p className="text-sm text-text-secondary">
          Multi-vector stages must be created through the Stage Builder's advanced flow — they cannot
          be customized individually here. Open the Stage Builder, select this stage, then use
          "Add Advanced Template" to apply all {vectors.length} vectors at once.
        </p>

        <div className="space-y-2 pt-1">
          {vectors.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 bg-surface-2 rounded-lg border border-border text-xs"
            >
              <span className="font-mono text-accent w-5 shrink-0">{i + 1}.</span>
              <span className="font-medium text-text-primary capitalize">
                {v.vector_type.replace(/_/g, " ")}
              </span>
              <span className="mitre-tag ml-auto shrink-0">{v.mitre_id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Customize form (single-vector templates only)
// ---------------------------------------------------------------------------
function CustomizeForm({ template, onBack, onSave, saving, apiError }) {
  // Pre-fill everything from the template — admin edits what they need
  // Fix #1 — guard all template.email accesses with optional chaining
  const [senderName, setSenderName] = useState(template.email?.sender_name ?? "")
  const [senderEmail, setSenderEmail] = useState(template.email?.sender_email ?? "")
  const [senderTitle, setSenderTitle] = useState(template.email?.sender_title ?? "")
  const [subject, setSubject] = useState(template.email?.subject ?? "")
  const [body, setBody] = useState(template.email?.body ?? "")
  const [timePressure, setTimePressure] = useState(
    Math.round((template.detection_criteria?.time_pressure_ms ?? 30000) / 1000)
  )

  const handleSave = () => {
    const vectorData = {
      vector_type: resolveVectorType(template),
      mitre_id: template.detection_criteria?.mitre_id ?? "",
      detection_criteria: {
        email: {
          sender_name: senderName,
          sender_email: senderEmail,
          sender_title: senderTitle,
          subject,
          body,
          has_attachment: template.email?.has_attachment ?? false,
          attachment_name: template.email?.attachment_name ?? null,
        },
        target_elements: template.detection_criteria?.target_elements ?? [],
        success_action: template.detection_criteria?.success_action ?? [],
        fail_actions: template.detection_criteria?.fail_actions ?? [],
        time_pressure_ms: timePressure * 1000,
        indicators: template.detection_criteria?.indicators ?? [],
        best_practice: template.detection_criteria?.best_practice ?? "",
        mitre_id: template.detection_criteria?.mitre_id ?? "",
        mitre_description: template.detection_criteria?.mitre_description ?? "",
      },
    }
    onSave(vectorData)
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-xs text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:border-border-secondary transition-colors"
        >
          ← back to templates
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary">{template.name}</span>
          <CategoryBadge category={template.category} />
        </div>
      </div>

      {/* API error */}
      {apiError && (
        <Alert variant="danger" className="mb-4">{apiError}</Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: email content ── */}
        <div>
          <p className="section-title mb-4">Email Content</p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="label">Sender Name</label>
              <input
                className="input"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Sarah Reynolds"
              />
            </div>

            <div className="space-y-1.5">
              <label className="label">Sender Email</label>
              <input
                className="input font-mono text-sm"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="sarah@techcorp-global.net"
              />
              <p className="text-2xs text-text-muted">
                This is the visible attack indicator — keep it close-but-wrong (e.g. linkedln.com not linkedin.com)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="label">Sender Title</label>
              <input
                className="input"
                value={senderTitle}
                onChange={(e) => setSenderTitle(e.target.value)}
                placeholder="Senior Recruiter at TechCorp"
              />
            </div>

            <div className="space-y-1.5">
              <label className="label">Subject Line</label>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Exciting opportunity — urgent response needed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="label">Email Body</label>
              <textarea
                className="input font-mono text-xs"
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        {/* ── Right: indicators, scoring, settings ── */}
        <div>
          <p className="section-title mb-4">Attack Indicators</p>

          {/* Red flags list — read only, pulled from template */}
          <div className="space-y-2 mb-5">
            {/* Fix #1 — guard against missing detection_criteria.indicators */}
            {(template.detection_criteria?.indicators ?? []).map((ind, i) => (
              <div
                key={i}
                className="flex gap-2 items-start px-3 py-2 bg-surface-2 rounded-lg border border-border text-xs"
              >
                <span className="text-warning font-bold shrink-0">!</span>
                <span className="text-text-secondary">{ind}</span>
              </div>
            ))}
            <p className="text-2xs text-text-muted mt-1">
              These are shown to users as educational feedback after the simulation.
            </p>
          </div>

          {/* Time pressure slider */}
          <div className="space-y-1.5 mb-5">
            <label className="label">
              Time Pressure
              <span className="font-normal text-text-muted ml-1 normal-case">
                — full points if flagged within this window
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={timePressure}
                onChange={(e) => setTimePressure(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-sm font-medium text-text-primary w-10 text-right">
                {timePressure}s
              </span>
            </div>
            <p className="text-2xs text-text-muted">
              After {timePressure}s, a correct flag scores 80 pts instead of 100.
            </p>
          </div>

          {/* Scoring preview */}
          <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5">
            <p className="text-xs font-medium text-text-secondary mb-3">Scoring preview</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Flag + correct reason</span>
                <span className="text-success font-medium">100 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Flag (no reason)</span>
                <span className="text-success">80 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Delete without flagging</span>
                <span className="text-warning">50 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Click / reply / download</span>
                <span className="text-danger">0 pts</span>
              </div>
              <div className="border-t border-border pt-2 mt-1 flex justify-between">
                <span className="text-text-muted">Time penalty (too slow)</span>
                <span className="text-text-muted">−20 pts</span>
              </div>
            </div>
          </div>

          {/* MITRE reference — Fix #1 guard */}
          <p className="text-2xs text-text-muted font-mono mb-4">
            {template.detection_criteria?.mitre_id ?? "—"}
            {" · "}
            {template.detection_criteria?.mitre_description ?? ""}
          </p>

          {/* Save button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSave}
            loading={saving}
          >
            Save Attack Vector
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AttackVectorBuilder({ stageId, vectorId, onSaved, onCancel }) {
  const [step, setStep] = useState("pick")   // "pick" | "customize" | "multi"
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState(null)

  const handleSelectTemplate = (template) => {
    setSelected(template)
    setApiError(null)
    setStep("customize")
  }

  // Fix #3 — multi-vector templates bypass CustomizeForm entirely
  const handleSelectMultiVector = (template) => {
    setSelected(template)
    setApiError(null)
    setStep("multi")
  }

  const handleBack = () => {
    setStep("pick")
    setApiError(null)
  }

  const handleSave = async (vectorData) => {
    setSaving(true)
    setApiError(null)
    try {
      if (vectorId) {
        await scenariosApi.updateVector(stageId, vectorId, vectorData)
      } else {
        await scenariosApi.createVector(stageId, vectorData)
      }
      const containerImage =
        VECTOR_TYPE_TO_IMAGE[vectorData.vector_type] ?? "rasp/sim-phishing:latest"
      onSaved?.(containerImage)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === "object") {
        const msg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
        setApiError(msg || "Failed to save. Please try again.")
      } else {
        setApiError(err.response?.data?.detail || "Failed to save. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {step === "pick" && "Choose an Attack Template"}
            {step === "customize" && "Customize Attack Vector"}
            {step === "multi" && "Multi-Vector Template"}
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {step === "pick"
              ? "Pick a pre-built template to get started — you can customize everything after"
              : step === "customize"
                ? "Edit the email content and settings, then save"
                : "This template creates multiple vectors at once"}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {step === "pick" && (
        <TemplatePicker
          onSelect={handleSelectTemplate}
          onSelectMultiVector={handleSelectMultiVector}
        />
      )}

      {step === "customize" && selected && (
        <CustomizeForm
          template={selected}
          onBack={handleBack}
          onSave={handleSave}
          saving={saving}
          apiError={apiError}
        />
      )}

      {/* Fix #3 — multi-vector templates show instructions, not CustomizeForm */}
      {step === "multi" && selected && (
        <MultiVectorNotice
          template={selected}
          onBack={handleBack}
        />
      )}

    </div>
  )
}