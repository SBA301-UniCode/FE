import apiClient from './client'

const CERTS_BASE = '/api/v1/certificates'

/**
 * Certificate API client – quản lý chứng chỉ học viên.
 */
export const certificateApi = {
  /**
   * Lấy tất cả certificates (phân trang) – dành cho admin.
   */
  getAll(page = 0, size = 20) {
    return apiClient.get(CERTS_BASE, { params: { page, size } })
  },

  /**
   * Lấy certificates theo learnerId.
   */
  getByLearnerId(learnerId) {
    return apiClient.get(`${CERTS_BASE}/user/${learnerId}`)
  },

  /**
   * Lấy certificates của user hiện tại (cần auth).
   */
  getMyList() {
    return apiClient.get(`${CERTS_BASE}/me`)
  },

  /**
   * Tạo certificate mới cho một khóa học (backend validate 100%).
   */
  create(payload) {
    return apiClient.post(CERTS_BASE, payload)
  },

  getById(certificateId) {
    return apiClient.get(`${CERTS_BASE}/${certificateId}`)
  },

  /**
   * Xác minh certificate bằng serial number (public, không cần auth).
   */
  verifyBySerial(serialNumber) {
    return apiClient.get(`${CERTS_BASE}/verify/${serialNumber}`)
  },

  delete(certificateId) {
    return apiClient.delete(`${CERTS_BASE}/${certificateId}`)
  },
}
