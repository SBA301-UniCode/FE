import apiClient from './client'
import type { AxiosResponse } from 'axios'

const PRIVILEGES_BASE = '/api/v1/privileges'

export const privilegeApi = {
  getAll: (page = 0, size = 50, deleted = false): Promise<AxiosResponse> =>
    apiClient.get(PRIVILEGES_BASE, { params: { page, size, deleted } }),
  getById: (code: string): Promise<AxiosResponse> =>
    apiClient.get(`${PRIVILEGES_BASE}/${code}`),
  create: (data: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(PRIVILEGES_BASE, data),
  update: (code: string, data: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${PRIVILEGES_BASE}/${code}`, data),
  delete: (code: string): Promise<AxiosResponse> =>
    apiClient.delete(`${PRIVILEGES_BASE}/${code}`),
  active: (code: string): Promise<AxiosResponse> =>
    apiClient.get(`${PRIVILEGES_BASE}/active/${code}`),
}
