import apiClient from './client'

export const authApi = {
  login: (username, password) =>
    apiClient.post('/api/auth/login', { username, password }),

  logout: () =>
    apiClient.get('/api/auth/logout'),

  refreshToken: (refreshToken) =>
    apiClient.post('/api/auth/refresh-access-token', { refreshToken }),
}
