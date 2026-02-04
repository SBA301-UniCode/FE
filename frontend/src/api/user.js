import apiClient from './client'

export const userApi = {
  /** Lấy thông tin user đang đăng nhập (cần token) */
  getMe: () =>
    apiClient.get('/api/v1/users/me'),
}
