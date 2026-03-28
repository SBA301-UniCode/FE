import apiClient from './client'

const LESSONS_BASE = '/api/v1/lessons'

export const lessonApi = {
  getById(lessonId) {
    return apiClient.get(`${LESSONS_BASE}/${lessonId}`)
  },

  /** Danh sách bài giảng theo chương (sắp xếp orderIndex) */
  getByChapterId(chapterId) {
    return apiClient.get(`${LESSONS_BASE}/chapter/${chapterId}`)
  },

  getAll(params = {}) {
    return apiClient.get(LESSONS_BASE, { params })
  },

  create(payload) {
    return apiClient.post(LESSONS_BASE, payload)
  },

  update(lessonId, payload) {
    return apiClient.put(`${LESSONS_BASE}/${lessonId}`, payload)
  },

  delete(lessonId) {
    return apiClient.delete(`${LESSONS_BASE}/${lessonId}`)
  },
}
