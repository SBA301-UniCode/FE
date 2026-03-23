import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { EnrollmentStatus } from '../types'

const ENROLLMENTS_BASE = '/api/v1/enrollments'

export const enrollmentApi = {
  getMyLearning(statusCourse: EnrollmentStatus = 'IN_PROGRESS', page = 0, size = 20): Promise<AxiosResponse> {
    return apiClient.get(`${ENROLLMENTS_BASE}/me`, { params: { statusCourse, page, size } })
  },
  join(courseId: string): Promise<AxiosResponse> {
    return apiClient.post(`${ENROLLMENTS_BASE}/courses/${courseId}`)
  },
  search(body: Record<string, unknown>, page = 0, size = 10): Promise<AxiosResponse> {
    return apiClient.post(`${ENROLLMENTS_BASE}/search`, body, { params: { page, size } })
  },
  updateStatus(body: Record<string, unknown>): Promise<AxiosResponse> {
    return apiClient.patch(`${ENROLLMENTS_BASE}/update`, body)
  },
  getByCourse(courseId: string, page = 0, size = 10): Promise<AxiosResponse> {
    return apiClient.get(`${ENROLLMENTS_BASE}/courses/${courseId}`, { params: { page, size } })
  },
  isEnrolled(courseId: string): Promise<AxiosResponse> {
    return apiClient.get(`${ENROLLMENTS_BASE}/courses/${courseId}/me`)
  },
}
