import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const momoClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

momoClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

momoClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data?.data !== undefined ? response.data.data : response.data
    return { ...response, data: payload }
  },
  (error: AxiosError<{ message?: string; errorCode?: string }>) => {
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

    const normalizedMessage =
      serverMessage ||
      (status === 404 || status === 503
        ? 'Cổng thanh toán MoMo chưa được kích hoạt. Vui lòng cấu hình momo ở backend.'
        : status === 400 || status === 502
          ? 'Yêu cầu thanh toán không hợp lệ. Vui lòng thử lại.'
          : error.message || 'Không thể tạo giao dịch MoMo.')

    const normalizedError = new Error(normalizedMessage) as Error & {
      response?: typeof error.response
      status?: number
    }
    normalizedError.response = error.response
    normalizedError.status = status
    return Promise.reject(normalizedError)
  },
)

export default momoClient
