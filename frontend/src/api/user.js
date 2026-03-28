import apiClient from './client'

const USERS_BASE = '/api/v1/users'

export const userApi = {
  getMe: () => apiClient.get(`${USERS_BASE}/me`),
  getById: (userId) => apiClient.get(`${USERS_BASE}/${userId}`),
  getByEmail: (email) => apiClient.get(`${USERS_BASE}/email/${email}`),
  getAll: (page = 0, size = 10) => apiClient.get(USERS_BASE, { params: { page, size } }),
  create: (data) => apiClient.post(USERS_BASE, data),
  update: (userId, data) => apiClient.put(`${USERS_BASE}/${userId}`, data),
  delete: (userId) => apiClient.delete(`${USERS_BASE}/${userId}`),
  getEnrollments: (userId, page = 0, size = 10) =>
    apiClient.get(`${USERS_BASE}/${userId}/enrollments`, { params: { page, size } }),
}
