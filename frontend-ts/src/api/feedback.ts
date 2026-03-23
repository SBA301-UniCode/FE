import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { FeedbackRequest } from '../types'

const FEEDBACKS_BASE = '/api/v1/feedbacks'

const appendFiles = (formData: FormData, fileList: File[] = []): void => {
  if (!Array.isArray(fileList)) return
  fileList.forEach((file) => {
    if (file) formData.append('fileList', file)
  })
}

export const feedbackApi = {
  create(courseId: string, feedbackRequest: FeedbackRequest, fileList: File[] = []): Promise<AxiosResponse> {
    const formData = new FormData()
    const requestBlob = new Blob([JSON.stringify(feedbackRequest)], { type: 'application/json' })
    formData.append('feedbackRequest', requestBlob, 'feedbackRequest.json')
    appendFiles(formData, fileList)
    return apiClient.post(`${FEEDBACKS_BASE}/${courseId}`, formData)
  },
  getByCourse: (courseId: string, page = 1, size = 5): Promise<AxiosResponse> =>
    apiClient.get(`${FEEDBACKS_BASE}/course/${courseId}`, { params: { page, size } }),
  canFeedback: (courseId: string): Promise<AxiosResponse> =>
    apiClient.get(`${FEEDBACKS_BASE}/can-feedback/${courseId}`),
  canEdit: (feedbackId: string): Promise<AxiosResponse> =>
    apiClient.get(`${FEEDBACKS_BASE}/can-edit/${feedbackId}`),
  update(feedbackId: string, request: FeedbackRequest, fileList: File[] = []): Promise<AxiosResponse> {
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }), 'request.json')
    appendFiles(formData, fileList)
    return apiClient.put(`${FEEDBACKS_BASE}/${feedbackId}`, formData)
  },
  delete: (feedbackId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${FEEDBACKS_BASE}/${feedbackId}`),
}
