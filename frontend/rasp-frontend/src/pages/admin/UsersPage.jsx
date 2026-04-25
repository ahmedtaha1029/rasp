// src/pages/admin/UsersPage.jsx
import { useState, useEffect } from "react"
import { DashboardLayout, PageHeader } from "../../components/layout/Sidebar"
import {
  Button, Badge, Card, Table,
  Modal, Input, Select, Alert, Toast,
} from "../../components/ui/index"
import { usersApi } from "../../api/auth"

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({
    username: "", email: "", role: "job_seeker",
    password: "", confirm_password: "",
  })
  const [error, setError] = useState("")
  const [toast, setToast] = useState(null)

  const load = () => {
    setLoading(true)
    usersApi.list()
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const createUser = async () => {
    setError("")
    try {
      await usersApi.create(form)
      setToast({ message: "User created successfully.", type: "success" })
      setModal(false)
      setForm({ username: "", email: "", role: "job_seeker", password: "", confirm_password: "" })
      load()
    } catch (err) {
      const data = err.response?.data || {}
      const msg  = Object.entries(data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ")
      setError(msg || "Failed to create user.")
    }
  }

  const toggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active"
    try {
      await usersApi.setStatus(user.id, { status: newStatus })
      setToast({
        message: `Account ${newStatus === "active" ? "activated" : "deactivated"}.`,
        type: "success",
      })
      load()
    } catch (err) {
      setToast({
        message: err.response?.data?.detail || "Action failed.",
        type: "error",
      })
    }
  }

  const roleVariant = {
    administrator: "primary",
    hr_personnel:  "accent",
    job_seeker:    "muted",
  }

  const columns = [
    {
      key: "username",
      label: "Username",
      render: (r) => (
        <span className="text-text-primary font-medium">{r.username}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (r) => (
        <span className="text-text-secondary text-sm">{r.email}</span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (r) => (
        <Badge variant={roleVariant[r.role] || "muted"}>
          {r.role.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant={r.status === "active" ? "success" : "danger"}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "date_joined",
      label: "Joined",
      render: (r) => (
        <span className="text-xs text-text-muted">
          {new Date(r.date_joined).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button
          variant={r.status === "active" ? "danger" : "accent"}
          size="sm"
          onClick={() => toggleStatus(r)}
        >
          {r.status === "active" ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Users"
        subtitle="Manage platform accounts and roles"
        action={
          <Button variant="primary" onClick={() => setModal(true)}>
            + New User
          </Button>
        }
      />
      <Card>
        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found."
        />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Create User">
        <div className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="administrator">Administrator</option>
            <option value="hr_personnel">HR Personnel</option>
            <option value="job_seeker">Job Seeker</option>
          </Select>
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={form.confirm_password}
            onChange={(e) =>
              setForm({ ...form, confirm_password: e.target.value })
            }
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={createUser}
              className="flex-1"
            >
              Create User
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
