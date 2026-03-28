import apiClient from './client'

const DOCUMENTS_BASE = '/api/v1/documents'

export const documentApi = {
  create(data, file) {
    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('request', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    return apiClient.post(`${DOCUMENTS_BASE}/create`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
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
