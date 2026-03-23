import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Course, PageResponse } from '../types'

const COURSES_BASE = '/api/v1/courses'

export const courseApi = {
  getMyCourses: (params: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse<PageResponse<Course>>>> =>
    apiClient.get(COURSES_BASE, { params }),
  getById: (courseId: string): Promise<AxiosResponse<ApiResponse<Course>>> =>
    apiClient.get(`${COURSES_BASE}/${courseId}`),
  getAll: (page = 0, size = 10): Promise<AxiosResponse<ApiResponse<PageResponse<Course>>>> =>
    apiClient.get(COURSES_BASE, { params: { page, size } }),
  create: (data: Partial<Course>): Promise<AxiosResponse> =>
    apiClient.post(COURSES_BASE, data),
  update: (courseId: string, data: Partial<Course>): Promise<AxiosResponse> =>
    apiClient.put(`${COURSES_BASE}/${courseId}`, data),
  updateImage: (courseId: string, data: FormData): Promise<AxiosResponse> =>
    apiClient.post(`${COURSES_BASE}/${courseId}/image`, data),
  delete: (courseId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${COURSES_BASE}/${courseId}`),
}
