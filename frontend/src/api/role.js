import apiClient from './client'

const ROLES_BASE = '/api/v1/roles'

export const roleApi = {
  getAll: (page = 0, size = 50) => apiClient.get(ROLES_BASE, { params: { page, size } }),
  getById: (roleCode) => apiClient.get(`${ROLES_BASE}/${roleCode}`),
  create: (data) => apiClient.post(ROLES_BASE, data),
  update: (roleCode, data) => apiClient.put(`${ROLES_BASE}/${roleCode}`, data),
  delete: (roleCode) => apiClient.delete(`${ROLES_BASE}/${roleCode}`),
}
