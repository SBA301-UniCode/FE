import apiClient from './client'
import type { AxiosResponse } from 'axios'

const LESSONS_BASE = '/api/v1/lessons'

export const lessonApi = {
  getById: (lessonId: string): Promise<AxiosResponse> =>
    apiClient.get(`${LESSONS_BASE}/${lessonId}`),
  getByChapterId: (chapterId: string): Promise<AxiosResponse> =>
    apiClient.get(`${LESSONS_BASE}/chapter/${chapterId}`),
  getAll: (params: Record<string, unknown> = {}): Promise<AxiosResponse> =>
    apiClient.get(LESSONS_BASE, { params }),
  create: (payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(LESSONS_BASE, payload),
  update: (lessonId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${LESSONS_BASE}/${lessonId}`, payload),
  delete: (lessonId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${LESSONS_BASE}/${lessonId}`),
}
