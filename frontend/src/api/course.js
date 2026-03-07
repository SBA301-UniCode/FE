import apiClient from './client'

const COURSES_BASE = '/api/v1/courses'

export const courseApi = {
  getMyCourses: (params = {}) => apiClient.get(COURSES_BASE, { params }),
  getById: (courseId) => apiClient.get(`${COURSES_BASE}/${courseId}`),
  getAll: (page = 0, size = 10) => apiClient.get(COURSES_BASE, { params: { page, size } }),
  create: (data) => apiClient.post(COURSES_BASE, data),
  update: (courseId, data) => apiClient.put(`${COURSES_BASE}/${courseId}`, data),
  delete: (courseId) => apiClient.delete(`${COURSES_BASE}/${courseId}`),
}

