import apiClient from './client'
import type { AxiosResponse } from 'axios'

const ROLES_BASE = '/api/v1/roles'

export const roleApi = {
  getAll: (page = 0, size = 50, deleted = false): Promise<AxiosResponse> =>
    apiClient.get(ROLES_BASE, { params: { page, size, deleted } }),
  getById: (roleCode: string): Promise<AxiosResponse> =>
    apiClient.get(`${ROLES_BASE}/${roleCode}`),
  create: (data: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(ROLES_BASE, data),
  update: (roleCode: string, data: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${ROLES_BASE}/${roleCode}`, data),
  delete: (roleCode: string): Promise<AxiosResponse> =>
    apiClient.delete(`${ROLES_BASE}/${roleCode}`),
}
