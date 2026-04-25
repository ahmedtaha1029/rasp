// src/pages/auth/RegisterPage.jsx

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { authApi } from "../../api/index"
import { Button, Input, Alert } from "../../components/ui/index"

const ROLE_OPTIONS = [
  {
    value: "job_seeker",
    label: "Job Seeker",
    desc:  "Practice spotting scams, fake job postings, and phishing during a job search.",
  },
  {
    value: "hr_personnel",
    label: "HR / Recruiter",
    desc:  "Train to identify fraudulent applicants, malicious CVs, and social engineering.",
  },
  {
    value: "both",
    label: "Both",
    desc:  "Get access to scenarios for both job seeker and HR perspectives.",
  },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email:            "",
    password:         "",
    confirm_password: "",
    role:             "job_seeker",
  })
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      await authApi.register(form)
      navigate("/login", {
        state: { message: "Account created! Sign in to get started." },
      })
    } catch (err) {
      const data = err.response?.data
      if (typeof data === "object") {
        const firstMsg = Object.values(data).flat()[0]
        setError(typeof firstMsg === "string" ? firstMsg : "Registration failed.")
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-4xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <img src="/rasp_logo.png" alt="RASP" className="w-6 h-6 object-contain" />
          </div>
          <p className="font-bold text-text-primary">RASP</p>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-1">Create an account</h2>
        <p className="text-text-secondary text-sm mb-5">
          Free access to cybersecurity simulations. No organisation required.
        </p>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Role selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                What describes you best?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`
                      flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                      ${form.role === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-surface-1 hover:border-border-light"}
                    `}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={form.role === opt.value}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{opt.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Right: Credentials */}
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Submit + footer */}
          <div className="mt-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-sm text-text-secondary text-center mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>

            <p className="text-xs text-text-muted text-center mt-3">
              All simulation data is anonymized. No personal information is stored during exercises.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}