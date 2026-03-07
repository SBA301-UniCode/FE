import apiClient from './client'

const ENROLLMENTS_BASE = '/api/v1/enrollments'

export const enrollmentApi = {
  getMyLearning(statusCourse = 'IN_PROGRESS', page = 0, size = 20) {
    return apiClient.get(`${ENROLLMENTS_BASE}/me`, {
      params: { statusCourse, page, size },
    })
  },

  join(courseId) {
    return apiClient.post(`${ENROLLMENTS_BASE}/courses/${courseId}`)
  },

  search(body, page = 0, size = 10) {
    return apiClient.post(`${ENROLLMENTS_BASE}/search`, body, { params: { page, size } })
  },

  updateStatus(body) {
    return apiClient.patch(`${ENROLLMENTS_BASE}/update`, body)
  },

  getByCourse(courseId, page = 0, size = 10) {
    return apiClient.get(`${ENROLLMENTS_BASE}/courses/${courseId}`, { params: { page, size } })
  },

  isEnrolled(courseId) {
    return apiClient.get(`${ENROLLMENTS_BASE}/courses/${courseId}/me`)
  },
}

