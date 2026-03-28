import apiClient from './client'

const SYLLABUSES_BASE = '/api/v1/syllabuses'

export const syllabusApi = {
  getAll: (page = 0, size = 10) => apiClient.get(SYLLABUSES_BASE, { params: { page, size } }),
  getById: (sylabusId) => apiClient.get(`${SYLLABUSES_BASE}/${sylabusId}`),
  create: (data) => apiClient.post(SYLLABUSES_BASE, data),
  update: (sylabusId, data) => apiClient.put(`${SYLLABUSES_BASE}/${sylabusId}`, data),
  delete: (sylabusId) => apiClient.delete(`${SYLLABUSES_BASE}/${sylabusId}`),
}
