import apiClient from './client'

const CERTS_BASE = '/api/v1/certificates'

/**
 * Certificate API client – quản lý chứng chỉ học viên.
 */
export const certificateApi = {
  /**
   * Lấy tất cả certificates (phân trang) – dành cho admin (nếu cần).
   */
  getAll(page = 0, size = 20) {
    return apiClient.get(CERTS_BASE, { params: { page, size } })
  },

  /**
   * Lấy certificates theo learnerId.
   * Lưu ý: backend không có endpoint /me, nên nếu cần tự động,
   * FE phải biết learnerId (ví dụ từ userApi.getMe()).
   */
  getByLearnerId(learnerId) {
    return apiClient.get(`${CERTS_BASE}/user/${learnerId}`)
  },

  /**
   * Tạo certificate mới cho một khóa học (khi đã hoàn thành 100%).
   * Cần xem CertificateCreateRequest bên backend để map đúng field.
   */
  create(payload) {
    return apiClient.post(CERTS_BASE, payload)
  },

  getById(certificateId) {
    return apiClient.get(`${CERTS_BASE}/${certificateId}`)
  },

  delete(certificateId) {
    return apiClient.delete(`${CERTS_BASE}/${certificateId}`)
  },
}

