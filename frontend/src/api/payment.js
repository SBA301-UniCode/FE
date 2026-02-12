import apiClient from './client'
import momoClient from './momoClient'

/**
 * API mua khóa học / thanh toán MoMo Sandbox.
 * Backend: POST /api/v1/subscriptions/buy/{courseId} (body rỗng).
 * Response 200: { code: 1000, message: "https://test-payment.momo.vn/v2/gateway/pay?t=...&s=...", success: true }
 * → Link thanh toán MoMo nằm trong field "message".
 */
const SUBSCRIPTIONS_BASE = '/api/v1/subscriptions'
const SUBSCRIPTIONS_BUY_PATH = `${SUBSCRIPTIONS_BASE}/buy`

export const paymentApi = {
  /**
   * Mua khóa học qua MoMo Sandbox – backend trả về link thanh toán trong field "message".
   * @param {string} courseId - UUID khóa học
   * @returns {Promise<{ code: number, message: string, success: boolean }>} message = payUrl (redirect sang MoMo)
   */
  buySubscription: async (courseId) => {
    const res = await momoClient.post(`${SUBSCRIPTIONS_BUY_PATH}/${courseId}`, {})
    return res.data
  },

  /**
   * Lấy danh sách khóa học đã mua (subscriptions) của user hiện tại.
   * Backend: GET /api/v1/subscriptions/me (nếu có). Response: { data: [ { subcriptionId, courseId, course, statusPayment, ... } ] }
   */
  getMySubscriptions: () => apiClient.get(`${SUBSCRIPTIONS_BASE}/me`),
}
