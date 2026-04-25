// import { Navigate } from "react-router-dom"
// import { useAuth } from "../context/AuthContext"
// import { useOnboarding } from "../hooks/useOnboarding"

// export default function ProtectedRoute({ children, allowedRoles }) {
//   const { user, loading } = useAuth()
//   const { needsOnboarding } = useOnboarding()
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-surface flex items-center justify-center">
//         <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
//       </div>
//     )
//   }

//   if (!user) return <Navigate to="/login" replace />

//   if (allowedRoles && !allowedRoles.includes(user.role)) {
//     const paths = {
//       administrator: "/admin",
//       hr_personnel: "/hr",
//       job_seeker: "/jobseeker",
//     }
//     return <Navigate to={paths[user.role] || "/login"} replace />
//   }

//   if (user && needsOnboarding && location.pathname !== "/onboarding") {
//     return <Navigate to="/onboarding" />
//   }

//   return children
// }

// src/routes/ProtectedRoute.jsx
// Fix: imported useLocation from react-router-dom (was missing, caused runtime crash)
// Fix: added "both" role to paths map so dual-role users redirect correctly
// Fix: onboarding redirect only applies to simulation participant roles (not admins)

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useOnboarding } from "../hooks/useOnboarding"

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading }   = useAuth()
  const { needsOnboarding } = useOnboarding()
  const location            = useLocation()   // ← Fix: was using bare location global

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Fix: added "both" role to the redirect map
    const paths = {
      administrator: "/admin",
      hr_personnel:  "/hr",
      job_seeker:    "/jobseeker",
      both:          "/combined",
    }
    return <Navigate to={paths[user.role] || "/login"} replace />
  }

  // Fix: only redirect simulation participants — not admins — to onboarding
  const isParticipant = ["hr_personnel", "job_seeker", "both"].includes(user?.role)
  if (user && isParticipant && needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
