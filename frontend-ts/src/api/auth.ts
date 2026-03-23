import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, LoginResponse } from '../types'

export const authApi = {
  login: (username: string, password: string): Promise<AxiosResponse<ApiResponse<LoginResponse>>> =>
    apiClient.post('/api/auth/login', { username, password }),

  logout: (): Promise<AxiosResponse> =>
    apiClient.get('/api/auth/logout'),

  refreshToken: (refreshToken: string): Promise<AxiosResponse> =>
    apiClient.post('/api/auth/refresh-access-token', { refreshToken }),
}
