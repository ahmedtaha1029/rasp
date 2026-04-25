import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import ProtectedRoute from "./routes/ProtectedRoute"

// Auth
import LoginPage    from "./pages/auth/LoginPage"
import RegisterPage from "./pages/auth/RegisterPage"

// Admin
import AdminDashboard    from "./pages/admin/AdminDashboard"
import ScenariosPage, { ScenarioBuilderPage } from "./pages/admin/ScenariosPage"
import UsersPage         from "./pages/admin/UsersPage"
import AnalyticsPage     from "./pages/admin/AnalyticsPage"
import AssignmentsPage   from "./pages/admin/AssignmentsPage"

// Role dashboards
import HRDashboard        from "./pages/hr/HRDashboard"
import JobSeekerDashboard from "./pages/jobseeker/JobSeekerDashboard"
import CombinedDashboard  from "./pages/combined/CombinedDashboard"

// Shared
import SimulationPage        from "./pages/simulation/SimulationPage"
import NotificationsPage     from "./pages/NotificationsPage"
import OnboardingPage        from "./pages/onboarding/TrainingVideoPage"
import PersonalAnalyticsPage from "./pages/analytics/PersonalAnalyticsPage"

// ---------------------------------------------------------------------------
// RootRedirect — sends authenticated users to the right dashboard,
// or to /login if unauthenticated.
// ---------------------------------------------------------------------------
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const paths = {
    administrator: "/admin",
    hr_personnel:  "/hr",
    job_seeker:    "/jobseeker",
    both:          "/combined",   // self-registered users with dual role
  }
  return <Navigate to={paths[user.role] || "/login"} replace />
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public routes ─────────────────────────────────────────── */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<RootRedirect />} />

          {/* ── Onboarding (any authenticated user) ───────────────────── */}
          <Route path="/onboarding" element={
            <ProtectedRoute><OnboardingPage /></ProtectedRoute>
          } />

          {/* ── Admin ─────────────────────────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["administrator"]}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/scenarios" element={
            <ProtectedRoute allowedRoles={["administrator"]}><ScenariosPage /></ProtectedRoute>
          } />
          <Route path="/admin/scenarios/new" element={
            <ProtectedRoute allowedRoles={["administrator"]}><ScenarioBuilderPage /></ProtectedRoute>
          } />
          <Route path="/admin/scenarios/:id" element={
            <ProtectedRoute allowedRoles={["administrator"]}><ScenarioBuilderPage /></ProtectedRoute>
          } />
          <Route path="/admin/assignments" element={
            <ProtectedRoute allowedRoles={["administrator"]}><AssignmentsPage /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={["administrator"]}><UsersPage /></ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={["administrator"]}><AnalyticsPage /></ProtectedRoute>
          } />

          {/* ── HR Personnel ──────────────────────────────────────────── */}
          <Route path="/hr" element={
            <ProtectedRoute allowedRoles={["hr_personnel"]}><HRDashboard /></ProtectedRoute>
          } />
          <Route path="/hr/simulations/:scenarioId" element={
            <ProtectedRoute allowedRoles={["hr_personnel"]}><SimulationPage /></ProtectedRoute>
          } />

          {/* ── Job Seeker ────────────────────────────────────────────── */}
          <Route path="/jobseeker" element={
            <ProtectedRoute allowedRoles={["job_seeker"]}><JobSeekerDashboard /></ProtectedRoute>
          } />
          <Route path="/jobseeker/simulations/:scenarioId" element={
            <ProtectedRoute allowedRoles={["job_seeker"]}><SimulationPage /></ProtectedRoute>
          } />

          {/* ── Combined (self-registered "both" role) ────────────────── */}
          <Route path="/combined" element={
            <ProtectedRoute allowedRoles={["both"]}><CombinedDashboard /></ProtectedRoute>
          } />
          <Route path="/combined/simulations/:scenarioId" element={
            <ProtectedRoute allowedRoles={["both"]}><SimulationPage /></ProtectedRoute>
          } />

          {/* ── Personal analytics (all non-admin roles) ──────────────── */}
          <Route path="/my-analytics" element={
            <ProtectedRoute allowedRoles={["hr_personnel", "job_seeker", "both"]}>
              <PersonalAnalyticsPage />
            </ProtectedRoute>
          } />

          {/* ── Notifications (any authenticated user) ────────────────── */}
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />

          {/* ── Fallback ──────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}