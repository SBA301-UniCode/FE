import apiClient from './client'

const DOCUMENTS_BASE = '/api/v1/documents'

export const documentApi = {
  create(payload) {
    return apiClient.post(`${DOCUMENTS_BASE}/create`, payload)
  },

  getByLessonId(lessonId) {
    return apiClient.get(`${DOCUMENTS_BASE}/lesson/${lessonId}`)
  },

  update(documentId, payload) {
    return apiClient.put(`${DOCUMENTS_BASE}/${documentId}`, payload)
  },

  delete(documentId) {
    return apiClient.delete(`${DOCUMENTS_BASE}/${documentId}`)
  },
}
