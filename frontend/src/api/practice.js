import apiClient from './client'

const PRACTICE_BASE = '/api/v1/exams'

export const practiceApi = {
  createPractice(lessonId, payload) {
    return apiClient.post(`${PRACTICE_BASE}/practice/${lessonId}`, payload)
  },

  startPractice(contentId) {
    return apiClient.get(`${PRACTICE_BASE}/practice/start/${contentId}`)
  },

  submitPractice(payload) {
    return apiClient.post(`${PRACTICE_BASE}/practice-exams/submit`, payload)
  },
}
