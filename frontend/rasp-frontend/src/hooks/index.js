// // src/hooks/index.js

// import { useState, useEffect, useCallback, useRef } from "react"
// import { notificationsApi, simulationsApi } from "../api/index"
// import api from "../api/axios"


// // ---------------------------------------------------------------------------
// // useNotifications
// // ---------------------------------------------------------------------------
// export function useNotifications() {
//   const [notifications, setNotifications] = useState([])
//   const [unreadCount, setUnreadCount] = useState(0)

//   const fetch = useCallback(async () => {
//     try {
//       const { data } = await notificationsApi.list()
//       setNotifications(data)
//       setUnreadCount(data.filter((n) => !n.is_read).length)
//     } catch {
//       // silent — user might not be logged in yet
//     }
//   }, [])

//   useEffect(() => {
//     fetch()
//     const interval = setInterval(fetch, 30000)
//     return () => clearInterval(interval)
//   }, [fetch])

//   const markRead = async (id) => {
//     await notificationsApi.markRead(id)
//     setNotifications((prev) =>
//       prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
//     )
//     setUnreadCount((c) => Math.max(0, c - 1))
//   }

//   const markAllRead = async () => {
//     await notificationsApi.markAllRead()
//     setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
//     setUnreadCount(0)
//   }

//   return { notifications, unreadCount, markRead, markAllRead, refresh: fetch }
// }


// // ---------------------------------------------------------------------------
// // useSession
// //
// // Manages the full simulation session lifecycle including:
// //   - Initial provisioning + container status polling
// //   - Stage advancement (advanceStage)
// //   - Session completion
// //
// // Stage state (currentStage, totalStages) is updated from the 202 response
// // returned by the /advance/ endpoint so the UI always reflects what the
// // backend considers the current stage.
// // ---------------------------------------------------------------------------
// export function useSession() {
//   const [session, setSession] = useState(null)
//   const [containerReady, setContainerReady] = useState(false)
//   const [containerUrl, setContainerUrl] = useState(null)
//   const [error, setError] = useState(null)
//   const [status, setStatus] = useState("idle")
//   const [currentStage, setCurrentStage] = useState(1)
//   const [totalStages, setTotalStages] = useState(1)

//   const pollRef = useRef(null)

//   const stopPolling = () => {
//     if (pollRef.current) {
//       clearInterval(pollRef.current)
//       pollRef.current = null
//     }
//   }

//   const startPolling = (sessionId) => {
//     stopPolling()

//     pollRef.current = setInterval(async () => {
//       try {
//         const { data } = await api.get(`/containers/${sessionId}/status/`)

//         if (data.status === "active") {
//           stopPolling()
//           setContainerReady(true)
//           const token = localStorage.getItem("access_token")
//           const proxyUrl = `/api/containers/${sessionId}/proxy/?token=${token}`
//           setContainerUrl(proxyUrl)
//           setStatus("active")

//         } else if (data.status === "error") {
//           stopPolling()
//           setError("Container provisioning failed. Please try again.")
//           setStatus("error")
//         }
//         // provisioning → keep polling
//       } catch (err) {
//         if (err.response?.status === 401) {
//           stopPolling()
//           setError("Session expired. Please log in again.")
//           setStatus("error")
//         } else if (err.response?.status === 404) {
//           // Container record not created yet — keep polling
//         } else {
//           stopPolling()
//           setError("Lost connection to session. Please try again.")
//           setStatus("error")
//         }
//       }
//     }, 3000)
//   }

//   const startSession = async (scenarioId) => {
//     setStatus("provisioning")
//     setError(null)
//     setContainerReady(false)
//     setContainerUrl(null)
//     setCurrentStage(1)
//     setTotalStages(1)

//     try {
//       const { data } = await simulationsApi.startSession(scenarioId)
//       setSession(data)
//       startPolling(data.session_id)
//     } catch (err) {
//       const msg = err.response?.data?.detail || "Failed to start session."
//       setError(msg)
//       setStatus("error")
//     }
//   }

//   const acknowledge = async () => {
//     if (!session) return
//     const id = session.session_id || session.id
//     await simulationsApi.acknowledge(id)
//     setSession((s) => ({ ...s, ethical_warning_acknowledged: true }))
//   }

//   /**
//    * advanceStage
//    *
//    * Called when the frontend receives stage_complete=true from the
//    * telemetry WebSocket and the user clicks "Next Stage".
//    *
//    * Steps:
//    *   1. POST /sessions/{id}/advance/  → backend stops old container,
//    *      resets the ScenarioContainer record, increments current_stage_order,
//    *      and fires a new Celery provisioning task.
//    *   2. Reset local container state so the provisioning spinner shows.
//    *   3. Resume polling — same as initial session start.
//    */
//   const advanceStage = async () => {
//     if (!session) return

//     if (advancingRef.current) return
//     advancingRef.current = true 

//     const id = session.session_id || session.id
//     try {
//       const { data } = await simulationsApi.advanceStage(id)
//       // Update local stage counters from the backend response
//       setCurrentStage(data.current_stage_order)
//       setTotalStages(data.total_stages)
//       // Reset container state — UI will show provisioning spinner
//       setContainerReady(false)
//       setContainerUrl(null)
//       setStatus("provisioning")
//       // Re-start polling for the new container
//       startPolling(id)
//     } catch (err) {
//       const msg = err.response?.data?.detail || "Failed to advance to next stage."
//       setError(msg)
//       setStatus("error")
//     }
//   }

//   const completeSession = async () => {
//     if (!session) return null
//     const id = session.session_id || session.id
//     const { data } = await simulationsApi.complete(id)
//     setStatus("completed")
//     return data
//   }

//   // Clean up polling on unmount
//   useEffect(() => {
//     return () => stopPolling()
//   }, [])

//   return {
//     session,
//     containerReady,
//     containerUrl,
//     error,
//     status,
//     currentStage,
//     totalStages,
//     startSession,
//     acknowledge,
//     advanceStage,
//     completeSession,
//   }
// }

// src/hooks/index.js

import { useState, useEffect, useCallback, useRef } from "react"
import { notificationsApi, simulationsApi } from "../api/index"
import api from "../api/axios"


// ---------------------------------------------------------------------------
// useNotifications
// ---------------------------------------------------------------------------
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetch = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    } catch {
      // silent — user might not be logged in yet
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [fetch])

  const markRead = async (id) => {
    await notificationsApi.markRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await notificationsApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markRead, markAllRead, refresh: fetch }
}


// ---------------------------------------------------------------------------
// useSession
//
// Manages the full simulation session lifecycle including:
//   - Initial provisioning + container status polling
//   - Stage advancement (advanceStage)
//   - Session completion
//
// Stage state (currentStage, totalStages) is updated from the 202 response
// returned by the /advance/ endpoint so the UI always reflects what the
// backend considers the current stage.
// ---------------------------------------------------------------------------
export function useSession() {
  const [session, setSession] = useState(null)
  const [containerReady, setContainerReady] = useState(false)
  const [containerUrl, setContainerUrl] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState("idle")
  const [currentStage, setCurrentStage] = useState(1)
  const [totalStages, setTotalStages] = useState(1)

  const pollRef = useRef(null)
  // Ref-based guard: prevents concurrent advanceStage calls.
  // useState is async — setAdvancing(true) does NOT block a second click
  // from firing before React re-renders the disabled button. A ref update
  // is synchronous and takes effect immediately in the same call stack.
  const advancingRef = useRef(false)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPolling = (sessionId) => {
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/containers/${sessionId}/status/`)

        if (data.status === "active") {
          stopPolling()
          setContainerReady(true)
          const token = localStorage.getItem("access_token")
          const proxyUrl = `/api/containers/${sessionId}/proxy/?token=${token}`
          setContainerUrl(proxyUrl)
          setStatus("active")

        } else if (data.status === "error") {
          stopPolling()
          setError("Container provisioning failed. Please try again.")
          setStatus("error")
        }
        // provisioning → keep polling
      } catch (err) {
        if (err.response?.status === 401) {
          stopPolling()
          setError("Session expired. Please log in again.")
          setStatus("error")
        } else if (err.response?.status === 404) {
          // Container record not created yet — keep polling
        } else {
          stopPolling()
          setError("Lost connection to session. Please try again.")
          setStatus("error")
        }
      }
    }, 3000)
  }

  const startSession = async (scenarioId) => {
    setStatus("provisioning")
    setError(null)
    setContainerReady(false)
    setContainerUrl(null)
    setCurrentStage(1)
    setTotalStages(1)

    try {
      const { data } = await simulationsApi.startSession(scenarioId)
      setSession(data)
      startPolling(data.session_id)
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to start session."
      setError(msg)
      setStatus("error")
    }
  }

  const acknowledge = async () => {
    if (!session) return
    const id = session.session_id || session.id
    await simulationsApi.acknowledge(id)
    setSession((s) => ({ ...s, ethical_warning_acknowledged: true }))
  }

  /**
   * advanceStage
   *
   * Called when the frontend receives stage_complete=true from the
   * telemetry WebSocket and the user clicks "Next Stage".
   *
   * Steps:
   *   1. POST /sessions/{id}/advance/  → backend stops old container,
   *      resets the ScenarioContainer record, increments current_stage_order,
   *      and fires a new Celery provisioning task.
   *   2. Reset local container state so the provisioning spinner shows.
   *   3. Resume polling — same as initial session start.
   */
  const advanceStage = async () => {
    if (!session) return

    // Synchronous ref guard — blocks concurrent calls that slip through
    // before React has re-rendered the button into its disabled/loading state.
    if (advancingRef.current) return
    advancingRef.current = true

    const id = session.session_id || session.id
    try {
      const { data } = await simulationsApi.advanceStage(id)
      // Update local stage counters from the backend response
      setCurrentStage(data.current_stage_order)
      setTotalStages(data.total_stages)
      // Reset container state — UI will show provisioning spinner
      setContainerReady(false)
      setContainerUrl(null)
      setStatus("provisioning")
      // Re-start polling for the new container
      startPolling(id)
    } catch (err) {
      const httpStatus = err.response?.status
      const msg = err.response?.data?.detail || "Failed to advance to next stage."

      // 400 "already on last stage" almost always means a duplicate request
      // raced ahead of this one and succeeded. The first successful call already
      // set status="provisioning" and started polling — calling setStatus("error")
      // here would clobber that, which is why multiple clicks were needed before.
      if (httpStatus === 400 || httpStatus === 409) {
        // Only surface as a real error if nothing else is in flight.
        // If status is already "provisioning", a concurrent call won the race
        // legitimately, so we silently drop this duplicate response.
        setStatus((prev) => (prev === "provisioning" || prev === "active" ? prev : "error"))
        setError((prev) => (prev ? prev : msg))
      } else {
        setError(msg)
        setStatus("error")
      }
    } finally {
      // Always release the guard so future advances work.
      advancingRef.current = false
    }
  }

  const completeSession = async () => {
    if (!session) return null
    const id = session.session_id || session.id
    const { data } = await simulationsApi.complete(id)
    setStatus("completed")
    return data
  }

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [])

  return {
    session,
    containerReady,
    containerUrl,
    error,
    status,
    currentStage,
    totalStages,
    startSession,
    acknowledge,
    advanceStage,
    completeSession,
  }
}