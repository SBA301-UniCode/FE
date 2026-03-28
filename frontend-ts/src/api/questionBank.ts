import apiClient from './client'
import type { AxiosResponse } from 'axios'

const QB_BASE = '/api/v1/question-banks'

export const questionBankApi = {
  createQuestion: (lessonId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(`${QB_BASE}/${lessonId}`, payload),
  getByLessonId: (lessonId: string, page = 0, size = 100): Promise<AxiosResponse> =>
    apiClient.get(`${QB_BASE}/${lessonId}?page=${page}&size=${size}`),
  getById: (questionBankId: string): Promise<AxiosResponse> =>
    apiClient.get(`${QB_BASE}/detail/${questionBankId}`),
  update: (questionBankId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${QB_BASE}/${questionBankId}`, payload),
  delete: (questionBankId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${QB_BASE}/${questionBankId}`),
}
