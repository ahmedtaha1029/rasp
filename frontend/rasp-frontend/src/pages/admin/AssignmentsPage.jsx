// src/pages/admin/AssignmentsPage.jsx
import { useState, useEffect } from "react"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import {
  Button, Badge, Card, Table,
  Modal, Select, Alert, Toast, Spinner, StatCard,
} from "../../components/ui/index"
import { simulationsApi, scenariosApi } from "../../api/index"
import { usersApi } from "../../api/auth"

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([])
  const [scenarios,   setScenarios]   = useState([])
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState({
    user: "", scenario: "", deadline: "",
  })
  const [error,  setError]  = useState("")
  const [toast,  setToast]  = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      simulationsApi.listAssignments(),
      scenariosApi.list(),
      usersApi.list(),
    ]).then(([a, s, u]) => {
      setAssignments(a.data)
      // Only active scenarios can be assigned (BR-06)
      setScenarios(s.data.filter((sc) => sc.active_status))
      // Only active non-admin users
      setUsers(
        u.data.filter(
          (usr) =>
            usr.status === "active" &&
            usr.role !== "administrator"
        )
      )
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = () => {
    setForm({ user: "", scenario: "", deadline: "" })
    setError("")
    setModal(true)
  }

  const createAssignment = async () => {
    setError("")
    if (!form.user || !form.scenario) {
      setError("User and scenario are required.")
      return
    }
    setSaving(true)
    try {
      await simulationsApi.createAssignment({
        user:     Number(form.user),
        scenario: Number(form.scenario),
        deadline: form.deadline || null,
      })
      setToast({ message: "Assignment created successfully.", type: "success" })
      setModal(false)
      load()
    } catch (err) {
      const data = err.response?.data || {}
      const msg  = Object.entries(data)
        .map(([k, v]) => `${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ")
      setError(msg || "Failed to create assignment.")
    } finally {
      setSaving(false)
    }
  }

  const deleteAssignment = async (id) => {
    if (!window.confirm("Remove this assignment?")) return
    try {
      await simulationsApi.deleteAssignment(id)
      setToast({ message: "Assignment removed.", type: "success" })
      load()
    } catch {
      setToast({ message: "Failed to remove assignment.", type: "error" })
    }
  }

  const roleVariant = {
    hr_personnel: "accent",
    job_seeker:   "muted",
  }

  const columns = [
    {
      key: "user",
      label: "User",
      render: (r) => (
        <div>
          <p className="text-text-primary font-medium text-sm">
            {r.user.username}
          </p>
          <Badge variant={roleVariant[r.user.role] || "muted"}>
            {r.user.role.replace(/_/g, " ")}
          </Badge>
        </div>
      ),
    },
    {
      key: "scenario",
      label: "Scenario",
      render: (r) => (
        <div>
          <p className="text-text-primary text-sm font-medium">
            {r.scenario.title}
          </p>
          <span className="font-mono text-2xs text-text-muted">
            v{r.scenario.version}
          </span>
        </div>
      ),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (r) => (
        <Badge variant={["","success","warning","danger"][r.scenario.difficulty]}>
          {r.scenario.difficulty_display}
        </Badge>
      ),
    },
    {
      key: "assigned_at",
      label: "Assigned",
      render: (r) => (
        <span className="text-xs text-text-muted">
          {new Date(r.assigned_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "deadline",
      label: "Deadline",
      render: (r) =>
        r.deadline ? (
          <span className="text-xs text-warning">
            {new Date(r.deadline).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => deleteAssignment(r.id)}
        >
          Remove
        </Button>
      ),
    },
  ]

  const pendingCount   = assignments.length
  const uniqueUsers    = new Set(assignments.map((a) => a.user.id)).size
  const uniqueScenarios = new Set(assignments.map((a) => a.scenario.id)).size

  return (
    <DashboardLayout>
      <PageHeader
        title="Assignments"
        subtitle="Assign scenarios to HR Personnel and Job Seekers"
        action={
          <Button variant="primary" onClick={openModal}>
            + New Assignment
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Assignments" value={pendingCount} accent />
            <StatCard label="Users Assigned"    value={uniqueUsers} />
            <StatCard label="Scenarios Used"    value={uniqueScenarios} />
          </div>

          {/* No active scenarios warning */}
          {scenarios.length === 0 && (
            <div className="card p-4 border-warning/30 bg-warning/5">
              <p className="text-sm text-warning font-medium">
                No active scenarios available.
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Activate at least one scenario before creating assignments.
              </p>
            </div>
          )}

          <Card>
            <Table
              columns={columns}
              data={assignments}
              loading={false}
              emptyMessage="No assignments yet. Click '+ New Assignment' to get started."
            />
          </Card>
        </div>
      )}

      {/* Create assignment modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New Assignment"
      >
        <div className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Select
            label="User"
            value={form.user}
            onChange={(e) => setForm({ ...form, user: e.target.value })}
          >
            <option value="">— Select a user —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.role.replace(/_/g, " ")})
              </option>
            ))}
          </Select>

          <Select
            label="Scenario"
            value={form.scenario}
            onChange={(e) => setForm({ ...form, scenario: e.target.value })}
          >
            <option value="">— Select a scenario —</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.difficulty_display}
              </option>
            ))}
          </Select>

          <div className="space-y-1.5">
            <label className="label">Deadline (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={createAssignment}
              loading={saving}
              className="flex-1"
            >
              Assign
            </Button>
            <Button
              variant="secondary"
              onClick={() => setModal(false)}
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