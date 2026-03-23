import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, User, PageResponse } from '../types'

const USERS_BASE = '/api/v1/users'

export const userApi = {
  getMe: (): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get(`${USERS_BASE}/me`),
  getById: (userId: string): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get(`${USERS_BASE}/${userId}`),
  getByEmail: (email: string): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.get(`${USERS_BASE}/email/${email}`),
  getAll: (page = 0, size = 10): Promise<AxiosResponse<ApiResponse<PageResponse<User>>>> =>
    apiClient.get(USERS_BASE, { params: { page, size } }),
  create: (data: Partial<User>): Promise<AxiosResponse> =>
    apiClient.post(USERS_BASE, data),
  update: (userId: string, data: Partial<User>): Promise<AxiosResponse> =>
    apiClient.put(`${USERS_BASE}/${userId}`, data),
  delete: (userId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${USERS_BASE}/${userId}`),
  getEnrollments: (userId: string, page = 0, size = 10): Promise<AxiosResponse> =>
    apiClient.get(`${USERS_BASE}/${userId}/enrollments`, { params: { page, size } }),
}
