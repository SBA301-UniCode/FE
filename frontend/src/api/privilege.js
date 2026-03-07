import apiClient from './client'

const PRIVILEGES_BASE = '/api/v1/privileges'

export const privilegeApi = {
  getAll: (page = 0, size = 50) => apiClient.get(PRIVILEGES_BASE, { params: { page, size } }),
  getById: (code) => apiClient.get(`${PRIVILEGES_BASE}/${code}`),
  create: (data) => apiClient.post(PRIVILEGES_BASE, data),
  update: (code, data) => apiClient.put(`${PRIVILEGES_BASE}/${code}`, data),
  delete: (code) => apiClient.delete(`${PRIVILEGES_BASE}/${code}`),
}
