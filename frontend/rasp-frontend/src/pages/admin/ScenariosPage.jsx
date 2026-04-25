// src/pages/admin/ScenariosPage.jsx

import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import {
  Button, Badge, Card, Table,
  Modal, Input, Select, Alert, Toast, Spinner,
} from "../../components/ui/index"
import { scenariosApi } from "../../api/index"
import AttackVectorBuilder from "./AttackVectorBuilder"


const VECTOR_CONFIG = {
  phishing_link: {
    label: "Phishing Link",
    image: "rasp/sim-phishing:latest",
    description: "Standard email phishing simulation."
  },
  credential_form: {
    label: "Credential Harvesting",
    image: "rasp/sim-credential-form:latest",
    description: "Fake login portal to test credential submission."
  },
  fake_identity: {
    label: "Fake Identity Profile",
    image: "rasp/sim-fake-identity:latest",
    description: "Social engineering via fabricated profiles."
  },
  geographic: {
    label: "Geographic Anomaly",
    image: "rasp/sim-geographic:latest",
    description: "Impossible travel / unusual login location."
  }
}

const VECTOR_TO_IMAGE = Object.fromEntries(
  Object.entries(VECTOR_CONFIG).map(([k, v]) => [k, v.image])
)

// ===========================================================================
// Scenarios List Page
// ===========================================================================
export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    scenariosApi.list()
      .then((r) => setScenarios(r.data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggleActivate = async (scenario) => {
    try {
      await scenariosApi.activate(scenario.id)
      setToast({
        message: `Scenario ${scenario.active_status ? "deactivated" : "activated"}.`,
        type: "success",
      })
      load()
    } catch (err) {
      const msg =
        err.response?.data?.active_status ||
        Object.values(err.response?.data || {}).flat().join(" ") ||
        "Action failed."
      setToast({ message: msg, type: "error" })
    }
  }

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (r) => (
        <span
          className="text-text-primary font-medium cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/admin/scenarios/${r.id}`)}
        >
          {r.title}
        </span>
      ),
    },
    {
      key: "version",
      label: "Version",
      render: (r) => <span className="font-mono text-xs text-text-muted">v{r.version}</span>,
    },
    {
      key: "stage_count",
      label: "Stages",
      render: (r) => <span className="font-mono">{r.stage_count}</span>,
    },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (r) => (
        <Badge variant={["", "success", "warning", "danger"][r.difficulty]}>
          {r.difficulty_display}
        </Badge>
      ),
    },
    {
      key: "active_status",
      label: "Status",
      render: (r) => (
        <Badge variant={r.active_status ? "success" : "muted"}>
          {r.active_status ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/scenarios/${r.id}`)}
          >
            Edit
          </Button>
          <Button
            variant={r.active_status ? "danger" : "accent"}
            size="sm"
            onClick={() => toggleActivate(r)}
          >
            {r.active_status ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Scenarios"
        subtitle="Design and manage recruitment attack simulations"
        action={
          <Button variant="primary" onClick={() => navigate("/admin/scenarios/new")}>
            + New Scenario
          </Button>
        }
      />
      <Card>
        <Table
          columns={columns}
          data={scenarios}
          loading={loading}
          emptyMessage="No scenarios yet."
        />
      </Card>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  )
}


// ===========================================================================
// Scenario Builder Page — create or edit a scenario + its stages + vectors
// ===========================================================================

const PHASE_OPTIONS = [
  { value: "application", label: "Application" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "technical_assessment", label: "Technical Assessment" },
  { value: "onboarding", label: "Onboarding" },
]

export function ScenarioBuilderPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  // ── Scenario form fields ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    description: "",
    company_profile: "",
    container_image: "rasp/sim-phishing:latest",
    difficulty: 1,
  })

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState(null)
  const [scenario, setScenario] = useState(null)
  const [stages, setStages] = useState([])

  // Stage modal
  const [stageModal, setStageModal] = useState(false)
  const [stageForm, setStageForm] = useState({ stage_order: 1, name: "application", description: "" })
  const [stageSaving, setStageSaving] = useState(false)

  // Attack vector builder — which stage is being edited
  const [vectorBuilderStageId, setVectorBuilderStageId] = useState(null)
  const [vectorBuilderVectorId, setVectorBuilderVectorId] = useState(null)

  // ── Load existing scenario when editing ──────────────────────────────────
  useEffect(() => {
    if (!isEditing) return
    scenariosApi.detail(id)
      .then((r) => {
        setScenario(r.data)
        setForm({
          title: r.data.title,
          description: r.data.description || "",
          company_profile: r.data.company_profile || "",
          container_image: r.data.container_image,
          difficulty: r.data.difficulty,
        })
        setStages(r.data.stages || [])
      })
      .catch(() => setError("Failed to load scenario."))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  // ── Reload stages ─────────────────────────────────────────────────────────
  const loadStages = async (scenarioId) => {
    const sid = scenarioId || scenario?.id || id
    if (!sid) return
    const { data } = await scenariosApi.listStages(sid)
    setStages(data)
  }

  // ── Save scenario ─────────────────────────────────────────────────────────
  const saveScenario = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      let result
      if (isEditing && scenario) {
        result = await scenariosApi.update(scenario.id, form)
      } else {
        result = await scenariosApi.create(form)
      }
      setScenario(result.data)
      setToast({
        message: isEditing
          ? "Scenario updated."
          : "Scenario created. Now add stages below.",
        type: "success",
      })
    } catch (err) {
      const data = err.response?.data || {}
      setError(
        Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ") || "Failed to save."
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
  if (stages.length > 0 && scenario) {
    const firstVector = stages[0]?.attack_vectors?.[0]
    if (firstVector) {
      const correctImage = VECTOR_TO_IMAGE[firstVector.vector_type] || "rasp/sim-phishing:latest"
      if (scenario.container_image !== correctImage) {
        scenariosApi.patch(scenario.id, { container_image: correctImage })
          .then(r => {
            setScenario(r.data)
            setForm(f => ({ ...f, container_image: correctImage }))
          })
          .catch(err => console.error("Failed to auto-sync container image:", err))
      }
    }
  }
}, [stages])

  // ── Add stage ─────────────────────────────────────────────────────────────
  const openStageModal = () => {
    setStageForm({
      stage_order: stages.length + 1,
      name: "application",
      description: "",
    })
    setStageModal(true)
  }

  const saveStage = async () => {
    const sid = scenario?.id || id
    if (!sid) return
    setStageSaving(true)
    try {
      await scenariosApi.createStage(sid, stageForm)
      setStageModal(false)
      await loadStages(sid)
      setToast({ message: "Stage added.", type: "success" })
    } catch (err) {
      const data = err.response?.data || {}
      setToast({
        message:
          Object.values(data).flat().join(" ") || "Failed to save stage.",
        type: "error",
      })
    } finally {
      setStageSaving(false)
    }
  }

  const deleteStage = async (stageId) => {
    const sid = scenario?.id || id
    if (!sid || !window.confirm("Delete this stage and all its vectors?")) return
    try {
      await scenariosApi.deleteStage(sid, stageId)
      await loadStages(sid)
      setToast({ message: "Stage deleted.", type: "success" })
    } catch {
      setToast({ message: "Failed to delete stage.", type: "error" })
    }
  }

  const deleteVector = async (stageId, vectorId) => {
    if (!window.confirm("Delete this attack vector?")) return
    try {
      await scenariosApi.deleteVector(stageId, vectorId)
      await loadStages(scenario?.id || id)
      setToast({ message: "Vector deleted.", type: "success" })
    } catch {
      setToast({ message: "Failed to delete vector.", type: "error" })
    }
  }

  // ── Helper: get vector category color ────────────────────────────────────
  const CATEGORY_COLORS = {
    phishing: "danger",
    attachment: "warning",
    extraction: "accent",
    impersonation: "primary",
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  // ── If attack vector builder is open, show it full-screen ─────────────────
  if (vectorBuilderStageId !== null) {
    return (
      <DashboardLayout>
        <AttackVectorBuilder
          stageId={vectorBuilderStageId}
          vectorId={vectorBuilderVectorId}
          onSaved={async (containerImage) => {
            setVectorBuilderStageId(null)
            setVectorBuilderVectorId(null)
            await loadStages(scenario?.id || id)

            // Keep the scenario's container_image in sync with the vector type
            // that was just added. If the image has changed, patch it silently.
            if (containerImage && containerImage !== form.container_image) {
              try {
                const sid = scenario?.id || id
                await scenariosApi.update(sid, { ...form, container_image: containerImage })
                setForm((prev) => ({ ...prev, container_image: containerImage }))
              } catch {
                // Non-fatal — log but don't block the user
                console.warn("Could not sync container_image on scenario:", containerImage)
              }
            }

            setToast({ message: "Attack vector saved.", type: "success" })
          }}
          onCancel={() => {
            setVectorBuilderStageId(null)
            setVectorBuilderVectorId(null)
          }}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? "Edit Scenario" : "New Scenario"}
        subtitle={
          isEditing
            ? `Editing: ${scenario?.title || "..."}`
            : "Fill in the details, then add stages and attack vectors"
        }
        action={
          <Button variant="ghost" onClick={() => navigate("/admin/scenarios")}>
            ← Back to Scenarios
          </Button>
        }
      />

      <div className="space-y-6 animate-fade-in">

        {/* ── Section 1: Scenario details ────────────────────────────────── */}
        <Card>
          <h3 className="font-semibold text-text-primary mb-5">Scenario Details</h3>

          {error && (
            <Alert variant="danger" className="mb-4">{error}</Alert>
          )}

          <form onSubmit={saveScenario} className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="LinkedIn Recruiter Attack"
              required
            />

            <div className="space-y-1.5">
              <label className="label">Description</label>
              <textarea
                className="input min-h-[70px] resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this scenario tests..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="label">Company Profile</label>
              <textarea
                className="input min-h-[80px] resize-none font-mono text-xs"
                value={form.company_profile}
                onChange={(e) => setForm({ ...form, company_profile: e.target.value })}
                placeholder={"Name: TechCorp Global\nIndustry: Software\nLocation: San Francisco, CA"}
              />
              <p className="text-2xs text-text-muted">
                Used to personalize the simulation. Format: Name / Industry / Location on separate lines.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">

              <Select
                label="Difficulty"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
              >
                <option value={1}>Basic</option>
                <option value={2}>Intermediate</option>
                <option value={3}>Advanced</option>
              </Select>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="w-full"
            >
              {isEditing ? "Save Changes" : "Create Scenario"}
            </Button>
          </form>
        </Card>

        {/* ── Section 2: Stages + Attack Vectors ─────────────────────────── */}
        {/* Only show this section once a scenario has been saved */}
        {scenario && (
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-text-primary">Stages</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Each stage is one phase of the recruitment process.
                  Add attack vectors to each stage.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={openStageModal}>
                + Add Stage
              </Button>
            </div>

            {stages.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-sm">
                No stages yet. Add the first stage to get started.
              </div>
            ) : (
              <div className="space-y-5">
                {stages.map((stage) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    categoryColors={CATEGORY_COLORS}
                    onAddVector={() => {
                      setVectorBuilderStageId(stage.id)
                      setVectorBuilderVectorId(null)
                    }}
                    onEditVector={(vectorId) => {
                      setVectorBuilderStageId(stage.id)
                      setVectorBuilderVectorId(vectorId)
                    }}
                    onDeleteVector={(vectorId) => deleteVector(stage.id, vectorId)}
                    onDeleteStage={() => deleteStage(stage.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Add Stage Modal ────────────────────────────────────────────────── */}
      <Modal open={stageModal} onClose={() => setStageModal(false)} title="Add Stage">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">Stage Order</label>
            <input
              type="number"
              className="input"
              min={1}
              value={stageForm.stage_order}
              onChange={(e) =>
                setStageForm({ ...stageForm, stage_order: Number(e.target.value) })
              }
            />
          </div>

          <Select
            label="Phase"
            value={stageForm.name}
            onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
          >
            {PHASE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>

          <div className="space-y-1.5">
            <label className="label">Description (optional)</label>
            <textarea
              className="input min-h-[60px] resize-none"
              value={stageForm.description}
              onChange={(e) =>
                setStageForm({ ...stageForm, description: e.target.value })
              }
              placeholder="What happens in this stage..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={saveStage}
              loading={stageSaving}
              className="flex-1"
            >
              Add Stage
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStageModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  )
}


// ===========================================================================
// StageCard — shows one stage and its attack vectors
// ===========================================================================

function StageCard({
  stage,
  categoryColors,
  onAddVector,
  onEditVector,
  onDeleteVector,
  onDeleteStage,
}) {
  const vectors = stage.attack_vectors || []

  return (
    <div className="border border-border rounded-xl overflow-hidden">

      {/* Stage header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-surface-3 border border-border flex items-center justify-center font-mono text-xs text-text-muted">
            {stage.stage_order}
          </span>
          <div>
            <p className="font-medium text-sm text-text-primary capitalize">
              {stage.name?.replace(/_/g, " ")}
            </p>
            {stage.description && (
              <p className="text-xs text-text-muted">{stage.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onAddVector}>
            + Add Attack Vector
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeleteStage}>
            Delete Stage
          </Button>
        </div>
      </div>

      {/* Attack vectors list */}
      <div className="divide-y divide-border">
        {vectors.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-text-muted">
            No attack vectors yet.{" "}
            <button
              onClick={onAddVector}
              className="text-primary hover:underline"
            >
              Add one from the template pool →
            </button>
          </div>
        ) : (
          vectors.map((vector) => (
            <VectorRow
              key={vector.id}
              vector={vector}
              categoryColors={categoryColors}
              onEdit={() => onEditVector(vector.id)}
              onDelete={() => onDeleteVector(vector.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}


// ===========================================================================
// VectorRow — one attack vector inside a stage
// ===========================================================================

function VectorRow({ vector, categoryColors, onEdit, onDelete }) {
  // Pull the email subject from detection_criteria if it exists
  const email = vector.detection_criteria?.email || {}
  const indicators = vector.detection_criteria?.indicators || []
  const category = vector.vector_type || "phishing"

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-surface-2 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">

        {/* Category color bar */}
        <div className={`w-1 h-10 rounded-full flex-shrink-0 bg-${categoryColors[category] || "muted"}`} />

        <div className="flex-1 min-w-0">
          {/* Sender + subject */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={categoryColors[category] || "muted"} className="text-xs">
              {category}
            </Badge>
            {email.sender_name && (
              <span className="text-sm font-medium text-text-primary truncate">
                {email.sender_name}
              </span>
            )}
          </div>

          {email.subject && (
            <p className="text-xs text-text-secondary truncate mb-1">
              {email.subject}
            </p>
          )}

          {/* Indicator count + MITRE ID */}
          <div className="flex items-center gap-3">
            {indicators.length > 0 && (
              <span className="text-2xs text-text-muted">
                {indicators.length} red flag{indicators.length !== 1 ? "s" : ""}
              </span>
            )}
            {vector.mitre_id && (
              <span className="mitre-tag text-2xs">{vector.mitre_id}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  )
}