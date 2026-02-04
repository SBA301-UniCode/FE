/**
 * Auth service - gọi API đăng nhập/đăng xuất.
 * Nên dùng api/auth.js và AuthContext thay vì import trực tiếp file này.
 */
import apiClient from '../api/client'

export const authService = {
  login: async (username, password) => {
    const res = await apiClient.post('/api/auth/login', { username, password })
    return res
  },
  logout: async () => {
    const res = await apiClient.get('/api/auth/logout')
    return res
  },
  refreshToken: async (refreshToken) => {
    const res = await apiClient.post('/api/auth/refresh-access-token', { refreshToken })
    return res
  },
}

export default apiClient
