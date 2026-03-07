import apiClient from './client'

const CHAPTERS_BASE = '/api/v1/chapters'

export const chapterApi = {
  getById(chapterId) {
    return apiClient.get(`${CHAPTERS_BASE}/${chapterId}`)
  },

  /** Danh sách chương theo khóa học */
  getByCourseId(courseId) {
    return apiClient.get(`${CHAPTERS_BASE}/course/${courseId}`)
  },

  getAll(params = {}) {
    return apiClient.get(CHAPTERS_BASE, { params })
  },

  create(payload) {
    return apiClient.post(CHAPTERS_BASE, payload)
  },

  update(chapterId, payload) {
    return apiClient.put(`${CHAPTERS_BASE}/${chapterId}`, payload)
  },

  delete(chapterId) {
    return apiClient.delete(`${CHAPTERS_BASE}/${chapterId}`)
  },
}
