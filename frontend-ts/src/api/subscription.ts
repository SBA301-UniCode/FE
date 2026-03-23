import apiClient from './client'
import type { AxiosResponse } from 'axios'

const SUBS_BASE = '/api/v1/subscriptions'

export const subscriptionApi = {
  buy: (courseId: string): Promise<AxiosResponse> =>
    apiClient.post(`${SUBS_BASE}/buy/${courseId}`, {}),
  getById: (id: string): Promise<AxiosResponse> =>
    apiClient.get(`${SUBS_BASE}/${id}`),
  search: (body: Record<string, unknown>, page = 0, size = 10): Promise<AxiosResponse> =>
    apiClient.post(`${SUBS_BASE}/search`, body, { params: { page, size } }),
  report: (body: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(`${SUBS_BASE}/report`, body),
}
