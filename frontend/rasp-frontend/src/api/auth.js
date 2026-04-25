import api from "./axios"
 
export const authApi = {
  login:          (data) => api.post("/auth/login/", data),
  refresh:        (data) => api.post("/auth/refresh/", data),
  me:             ()     => api.get("/auth/me/"),
  changePassword: (data) => api.post("/auth/password/change/", data),
}
 
export const usersApi = {
  list:      ()         => api.get("/users/"),
  create:    (data)     => api.post("/users/", data),
  detail:    (id)       => api.get(`/users/${id}/`),
  update:    (id, data) => api.patch(`/users/${id}/`, data),
  setStatus: (id, data) => api.patch(`/users/${id}/status/`, data),
}