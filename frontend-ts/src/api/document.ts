import apiClient from './client'
import type { AxiosResponse } from 'axios'

const DOCUMENTS_BASE = '/api/v1/documents'

export const documentApi = {
  create(data: Record<string, unknown>, file?: File): Promise<AxiosResponse> {
    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('request', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    return apiClient.post(`${DOCUMENTS_BASE}/create`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getByLessonId: (lessonId: string): Promise<AxiosResponse> =>
    apiClient.get(`${DOCUMENTS_BASE}/lesson/${lessonId}`),
  update: (documentId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${DOCUMENTS_BASE}/${documentId}`, payload),
  delete: (documentId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${DOCUMENTS_BASE}/${documentId}`),
}
