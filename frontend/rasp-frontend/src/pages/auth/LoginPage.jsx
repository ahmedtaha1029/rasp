// import { useState } from "react"
// import { useNavigate } from "react-router-dom"
// import { useAuth } from "../../context/AuthContext"
// import { Button, Input, Alert } from "../../components/ui/index"

// export default function LoginPage() {
//   const [form, setForm] = useState({ username: "", password: "" })
//   const [error, setError] = useState("")
//   const [loading, setLoading] = useState(false)
//   const { login, dashboardPath } = useAuth()
//   const navigate = useNavigate()

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setError("")
//     setLoading(true)
//     try {
//       await login(form.username, form.password)
//       navigate(dashboardPath(), { replace: true })
//     } catch (err) {
//       const msg =
//         err.response?.data?.detail ||
//         err.response?.data?.non_field_errors?.[0] ||
//         "Invalid credentials."
//       setError(msg)
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-surface flex">
//       {/* Left panel — branding */}
//       <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-surface-1 border-r border-border relative overflow-hidden">
//         {/* Background grid */}
//         <div
//           className="absolute inset-0 opacity-5 pointer-events-none"
//           style={{
//             backgroundImage:
//               "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
//             backgroundSize: "40px 40px",
//           }}
//         />
//         {/* Glow orb */}
//         <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

//         {/* Logo */}
//         <div className="relative">
//           <div className="flex items-center gap-3 mb-16">
//             <div className="w-20 h-20 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
//               <img src="/rasp_logo.png" alt="RASP Logo" />
//             </div>
//             <div>
//               <p className="font-bold text-text-primary text-lg tracking-wide">R A S P</p>
//               {/* <p className="text-xs text-text-muted font-mono">
//                 Recruitment Attack Simulation Platform
//               </p> */}
//             </div>
//           </div>

//           <div className="space-y-6">
//             <h1 className="text-4xl font-bold text-text-primary leading-tight">
//               Train against<br />
//               <span className="text-primary">recruitment related</span><br />
//               cyber threats.
//             </h1>
//             <p className="text-text-secondary leading-relaxed max-w-sm">
//               Simulate multi-stage employment based attacks across the full
//               hiring process. Measure detection rates, understand your gaps.
//             </p>
//           </div>
//         </div>

//         {/* Feature list */}
//         <div className="relative space-y-2">
//           {[
//             { label: "MITRE ATT&CK Mapped", color: "bg-primary" },
//             { label: "Real-time telemetry", color: "bg-accent" },
//             { label: "Anonymized analytics", color: "bg-success" },
//           ].map(({ label, color }) => (
//             <div key={label} className="flex items-center gap-2.5 text-sm text-text-secondary">
//               <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
//               {label}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Right panel — form */}
//       <div className="flex-1 flex items-center justify-center p-8">
//         <div className="w-full max-w-sm animate-slide-up">
//           {/* Mobile logo */}
//           <div className="flex items-center gap-2.5 mb-10 lg:hidden">
//             <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
//               <img src="/rasp_logo.png" alt="RASP Logo" />
//             </div>
//             <p className="font-bold text-text-primary">RASP</p>
//           </div>

//           <h2 className="text-2xl font-bold text-text-primary mb-1">Sign in</h2>
//           <p className="text-text-secondary text-sm mb-8">
//             Enter your credentials to access the platform.
//           </p>

//           {error && (
//             <div className="mb-5">
//               <Alert variant="danger">{error}</Alert>
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <Input
//               label="Username"
//               type="text"
//               placeholder="your.username"
//               value={form.username}
//               onChange={(e) => setForm({ ...form, username: e.target.value })}
//               required
//               autoFocus
//             />
//             <Input
//               label="Password"
//               type="password"
//               placeholder="••••••••"
//               value={form.password}
//               onChange={(e) => setForm({ ...form, password: e.target.value })}
//               required
//             />
//             <Button
//               type="submit"
//               variant="primary"
//               size="lg"
//               loading={loading}
//               className="w-full mt-2"
//             >
//               {loading ? "Signing in…" : "Sign in"}
//             </Button>
//           </form>

//           <p className="text-xs text-text-muted text-center mt-8">
//             All simulation data is anonymized and contained within this platform.
//           </p>
//         </div>
//       </div>
//     </div>
//   )
// }


// src/pages/auth/LoginPage.jsx

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Button, Input, Alert } from "../../components/ui/index"

export default function LoginPage() {
  const [form,    setForm]    = useState({ email: "", password: "" })
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)
  const { login, dashboardPath } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      // dashboardPath reads from the freshly-set user state
      const path = (() => {
        switch (user.role) {
          case "administrator": return "/admin"
          case "hr_personnel":  return "/hr"
          case "job_seeker":    return "/jobseeker"
          case "both":          return "/combined"
          default:              return "/login"
        }
      })()
      navigate(path, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Invalid credentials."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-surface-1 border-r border-border relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-20 h-20 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <img src="/rasp_logo.png" alt="RASP Logo" />
            </div>
            <p className="font-bold text-text-primary text-lg tracking-wide">R A S P</p>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-text-primary leading-tight">
              Train against<br />
              <span className="text-primary">recruitment related</span><br />
              cyber threats.
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-sm">
              Simulate multi-stage employment based attacks across the full
              hiring process. Measure detection rates, understand your gaps.
            </p>
          </div>
        </div>

        <div className="relative space-y-2">
          {[
            { label: "MITRE ATT&CK Mapped",  color: "bg-primary" },
            { label: "Real-time telemetry",   color: "bg-accent"  },
            { label: "Anonymized analytics",  color: "bg-success" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm text-text-secondary">
              <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <img src="/rasp_logo.png" alt="RASP Logo" />
            </div>
            <p className="font-bold text-text-primary">RASP</p>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-1">Sign in</h2>
          <p className="text-text-secondary text-sm mb-8">
            Enter your email and password to access the platform.
          </p>

          {error && (
            <div className="mb-5">
              <Alert variant="danger">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Registration link for individual users */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              New to RASP?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create a free account
              </Link>
            </p>
          </div>

          <p className="text-xs text-text-muted text-center mt-6">
            All simulation data is anonymized and contained within this platform.
          </p>
        </div>
      </div>
    </div>
  )
}