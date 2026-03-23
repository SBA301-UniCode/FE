import apiClient from './client'
import type { AxiosResponse } from 'axios'

const SYLLABUSES_BASE = '/api/v1/syllabuses'

export const syllabusApi = {
  getAll: (page = 0, size = 10): Promise<AxiosResponse> =>
    apiClient.get(SYLLABUSES_BASE, { params: { page, size } }),
  getById: (syllabusId: string): Promise<AxiosResponse> =>
    apiClient.get(`${SYLLABUSES_BASE}/${syllabusId}`),
  create: (data: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(SYLLABUSES_BASE, data),
  update: (syllabusId: string, data: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${SYLLABUSES_BASE}/${syllabusId}`, data),
  delete: (syllabusId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${SYLLABUSES_BASE}/${syllabusId}`),
}
