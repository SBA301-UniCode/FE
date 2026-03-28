import apiClient from './client'

const QB_BASE = '/api/v1/question-banks'

export const questionBankApi = {
  createQuestion(lessonId, payload) {
    return apiClient.post(`${QB_BASE}/${lessonId}`, payload)
  },

  getByLessonId(lessonId, page = 0, size = 100) {
    return apiClient.get(`${QB_BASE}/${lessonId}?page=${page}&size=${size}`)
  },

  getById(questionBankId) {
    return apiClient.get(`${QB_BASE}/detail/${questionBankId}`)
  },

  update(questionBankId, payload) {
    return apiClient.put(`${QB_BASE}/${questionBankId}`, payload)
  },

  delete(questionBankId) {
    return apiClient.delete(`${QB_BASE}/${questionBankId}`)
  },
}
