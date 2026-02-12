import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * Axios instance cho API MoMo Sandbox (subscriptions/buy).
 * Interceptors: gắn Bearer token, chuẩn hóa response, xử lý lỗi (401, 4xx, 5xx).
 */
const momoClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// —— Request interceptor: gắn Bearer token cho mọi request MoMo
momoClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// —— Response interceptor: chuẩn hóa data + xử lý lỗi API MoMo
momoClient.interceptors.response.use(
  (response) => {
    // Chuẩn hóa: luôn trả về payload (data hoặc data.data) để caller nhận trực tiếp
    const payload = response.data?.data !== undefined ? response.data.data : response.data
    return { ...response, data: payload }
  },
  (error) => {
    const status = error.response?.status
    const serverMessage = error.response?.data?.message || error.response?.data?.errorCode

    if (status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Chuẩn hóa message lỗi cho API thanh toán
    const normalizedMessage =
      serverMessage ||
      (status === 404 || status === 503
        ? 'Cổng thanh toán MoMo chưa được kích hoạt. Vui lòng cấu hình momo (partner-code, access-key, secret-key) ở backend.'
        : status === 400 || status === 502
          ? 'Yêu cầu thanh toán không hợp lệ. Vui lòng thử lại.'
          : error.message || 'Không thể tạo giao dịch MoMo.')

    const normalizedError = new Error(normalizedMessage)
    normalizedError.response = error.response
    normalizedError.status = status
    return Promise.reject(normalizedError)
  }
)

export default momoClient
