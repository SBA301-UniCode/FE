import apiClient from './client'
import type { AxiosResponse } from 'axios'

const CHAPTERS_BASE = '/api/v1/chapters'

export const chapterApi = {
  getById: (chapterId: string): Promise<AxiosResponse> =>
    apiClient.get(`${CHAPTERS_BASE}/${chapterId}`),
  getByCourseId: (courseId: string): Promise<AxiosResponse> =>
    apiClient.get(`${CHAPTERS_BASE}/course/${courseId}`),
  getAll: (params: Record<string, unknown> = {}): Promise<AxiosResponse> =>
    apiClient.get(CHAPTERS_BASE, { params }),
  create: (payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(CHAPTERS_BASE, payload),
  update: (chapterId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${CHAPTERS_BASE}/${chapterId}`, payload),
  delete: (chapterId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${CHAPTERS_BASE}/${chapterId}`),
}
