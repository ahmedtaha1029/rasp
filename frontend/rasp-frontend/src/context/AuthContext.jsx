// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react"
import api from "../api/axios"
import { authApi } from "../api/index"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore session from stored tokens
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
      })
      .finally(() => setLoading(false))
  }, [])

  /**
   * login — accepts email or username, stores tokens, sets user state.
   */
  const login = async (emailOrUsername, password) => {
    const { data } = await api.post("/auth/login/", {
      username: emailOrUsername, // backend accepts email or username here
      password,
    })
    localStorage.setItem("access_token",  data.access)
    localStorage.setItem("refresh_token", data.refresh)
    // Fetch full user profile so we have all fields
    const profile = await authApi.me()
    setUser(profile.data)
    return profile.data
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
  }

  /**
   * dashboardPath — returns the correct landing route for this user's role.
   */
  const dashboardPath = () => {
    if (!user) return "/login"
    switch (user.role) {
      case "administrator": return "/admin"
      case "hr_personnel":  return "/hr"
      case "job_seeker":    return "/jobseeker"
      case "both":          return "/combined"
      default:              return "/login"
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, dashboardPath }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}