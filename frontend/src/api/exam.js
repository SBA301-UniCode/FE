import apiClient from './client'

const EXAMS_BASE = '/api/v1/exams'

export const examApi = {
  createExam(lessonId, payload) {
    return apiClient.post(`${EXAMS_BASE}/${lessonId}`, payload)
  },

  updateExam(examId, payload) {
    return apiClient.patch(`${EXAMS_BASE}/${examId}`, payload)
  },

  changeStatus(examId) {
    return apiClient.patch(`${EXAMS_BASE}/${examId}/status`)
  },

  getQuestionsByExam(examId) {
    return apiClient.get(`${EXAMS_BASE}/${examId}/questions`)
  },

  getExamById(examId) {
    return apiClient.get(`${EXAMS_BASE}/${examId}`)
  },

  startExam(examId) {
    return apiClient.post(`${EXAMS_BASE}/${examId}/start`)
  },

  submitExam(payload) {
    return apiClient.post(`${EXAMS_BASE}/submit`, payload)
  },

  getAttemptHistory(examAttemptId) {
    return apiClient.get(`${EXAMS_BASE}/attempts/${examAttemptId}/history`)
  },

  getAttemptResults(examAttemptId) {
    return apiClient.get(`${EXAMS_BASE}/attempts/${examAttemptId}/results`)
  },
}
