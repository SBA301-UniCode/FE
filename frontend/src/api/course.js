import apiClient from './client'

/** Endpoint danh sách khóa học (trùng với Swagger: GET /api/v1/courses) */
const DEFAULT_COURSES_ENDPOINT = '/api/v1/courses'

const COURSES_ENDPOINT =
  import.meta.env.VITE_MY_COURSES_ENDPOINT || import.meta.env.VITE_COURSES_ENDPOINT || DEFAULT_COURSES_ENDPOINT

export const courseApi = {
  /** Lấy danh sách khóa học (hỗ trợ response dạng { data: { content: [...] } }) */
  getMyCourses: (params = {}) => apiClient.get(COURSES_ENDPOINT, { params }),
  /** Lấy chi tiết một khóa học (dùng cho trang thanh toán) */
  getById: (courseId) => apiClient.get(`${COURSES_ENDPOINT}/${courseId}`),
}

