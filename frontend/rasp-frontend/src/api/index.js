// src/api/index.js

import api from "./axios"

export const scenariosApi = {
  list:          ()                  => api.get("/scenarios/"),
  // listPublic:    ()                  => api.get("/scenarios/?is_public=true&active_status=true"),
  create:        (data)              => api.post("/scenarios/", data),
  detail:        (id)                => api.get(`/scenarios/${id}/`),
  update:        (id, data)          => api.put(`/scenarios/${id}/`, data),
  patch:         (id, data)          => api.patch(`/scenarios/${id}/`, data),
  activate:      (id)                => api.patch(`/scenarios/${id}/activate/`),
  listStages:    (scenarioId)        => api.get(`/scenarios/${scenarioId}/stages/`),
  createStage:   (scenarioId, data)  => api.post(`/scenarios/${scenarioId}/stages/`, data),
  updateStage:   (sId, id, data)     => api.patch(`/scenarios/${sId}/stages/${id}/`, data),
  deleteStage:   (sId, id)           => api.delete(`/scenarios/${sId}/stages/${id}/`),
  listVectors:   (stageId)           => api.get(`/stages/${stageId}/vectors/`),
  createVector:  (stageId, data)     => api.post(`/stages/${stageId}/vectors/`, data),
  updateVector:  (stageId, id, data) => api.patch(`/stages/${stageId}/vectors/${id}/`, data),
  deleteVector:  (stageId, id)       => api.delete(`/stages/${stageId}/vectors/${id}/`),
  listPublic: () => api.get("/scenarios/public/"),
}

export const authApi = {
  register: (data) => api.post("/auth/register/", data),
  me:       ()     => api.get("/auth/me/"),
}

export const simulationsApi = {
  listAssignments:  ()           => api.get("/assignments/"),
  createAssignment: (data)       => api.post("/assignments/", data),
  deleteAssignment: (id)         => api.delete(`/assignments/${id}/`),
  startSession:     (scenarioId) => api.post(`/sessions/start/${scenarioId}/`),
  getSession:       (id)         => api.get(`/sessions/${id}/`),
  acknowledge:      (id)         => api.post(`/sessions/${id}/acknowledge/`, { acknowledged: true }),
  advanceStage:     (id)         => api.post(`/sessions/${id}/advance/`),
  complete:         (id)         => api.post(`/sessions/${id}/complete/`),
  // Fix #5: Pause & Resume
  pause:            (id)         => api.post(`/sessions/${id}/pause/`),
  resume:           (id)         => api.post(`/sessions/${id}/resume/`),
  /** GET /api/sessions/mine/ — current user's sessions (for individual accounts) */
  listMySessions: () => api.get("/sessions/mine/"),
 
  /** POST /api/sessions/{id}/pause/ */
  pauseSession:  (id) => api.post(`/sessions/${id}/pause/`),
 
  /** POST /api/sessions/{id}/resume/ */
  resumeSession: (id) => api.post(`/sessions/${id}/resume/`),
}

export const analyticsApi = {
  overview:        ()           => api.get("/analytics/overview/"),
  scenarioMetrics: (scenarioId) => api.get(`/analytics/scenarios/${scenarioId}/`),
  mitreFrequency:  (params)     => api.get("/analytics/mitre/", { params }),
  exportReport:    (data)       => api.post("/analytics/export/", data, { responseType: "blob" }),
  personal:        ()           => api.get("/analytics/me/"),
  // Fix #17: Attack-path force graph data
  attackGraph:     (scenarioId) => api.get(`/analytics/attack-graph/${scenarioId}/`),
  // Fix #19: Hesitation & dwell-time stats
  dwellStats:      (params)     => api.get("/analytics/dwell/", { params }),
  // Fix #13: Educational resource URLs by MITRE ID
  mitreResources:  ()           => api.get("/analytics/mitre-resources/"),
  attackGraph: (scenarioId) => api.get(`/analytics/attack-graph/${scenarioId}/`),
}

export const notificationsApi = {
  list:        (params) => api.get("/notifications/", { params }),
  markRead:    (id)     => api.patch(`/notifications/${id}/read/`),
  markAllRead: (data)   => api.post("/notifications/read-all/", data || {}),
}

export const datasetsApi = {
  list:   (params) => api.get("/datasets/", { params }),
  import: (data)   => api.post("/datasets/import/", data),
  delete: (id)     => api.delete(`/datasets/${id}/`),
}
