import apiClient from './client'
import type { AxiosResponse } from 'axios'

const PRACTICE_BASE = '/api/v1/exams'

export const practiceApi = {
  createPractice: (lessonId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(`${PRACTICE_BASE}/practice/${lessonId}`, payload),
  startPractice: (contentId: string): Promise<AxiosResponse> =>
    apiClient.get(`${PRACTICE_BASE}/practice/start/${contentId}`),
  submitPractice: (payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(`${PRACTICE_BASE}/practice-exams/submit`, payload),
}
