import apiClient from '../api/client'

export const authService = {
  login: (username: string, password: string) =>
    apiClient.post('/api/auth/login', { username, password }),
  logout: () =>
    apiClient.get('/api/auth/logout'),
  refreshToken: (refreshToken: string) =>
    apiClient.post('/api/auth/refresh-access-token', { refreshToken }),
}
