import apiClient from './client'

const SUBS_BASE = '/api/v1/subscriptions'

export const subscriptionApi = {
  buy: (courseId) => apiClient.post(`${SUBS_BASE}/buy/${courseId}`, {}),
  getById: (id) => apiClient.get(`${SUBS_BASE}/${id}`),
  search: (body, page = 0, size = 10) =>
    apiClient.post(`${SUBS_BASE}/search`, body, { params: { page, size } }),
  report: (body) => apiClient.post(`${SUBS_BASE}/report`, body),
}
