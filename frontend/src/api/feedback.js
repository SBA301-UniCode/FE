import apiClient from './client'

const FEEDBACKS_BASE = '/api/v1/feedbacks'

const appendFiles = (formData, fileList = []) => {
  if (!Array.isArray(fileList)) return
  fileList.forEach((file) => {
    if (file) formData.append('fileList', file)
  })
}

export const feedbackApi = {
  create(courseId, feedbackRequest, fileList = []) {
    const formData = new FormData()
    const requestBlob = new Blob([JSON.stringify(feedbackRequest)], { type: 'application/json' })
    formData.append(
      'feedbackRequest',
      requestBlob,
      'feedbackRequest.json'
    )
    // Keep a fallback part name to match backend variants that use "request".
    formData.append('request', requestBlob, 'request.json')
    appendFiles(formData, fileList)
    return apiClient.post(`${FEEDBACKS_BASE}/${courseId}`, formData)
  },

  getByCourse(courseId, page = 1, size = 5) {
    return apiClient.get(`${FEEDBACKS_BASE}/course/${courseId}`, { params: { page, size } })
  },

  canFeedback(courseId) {
    return apiClient.get(`${FEEDBACKS_BASE}/can-feedback/${courseId}`)
  },

  canEdit(feedbackId) {
    return apiClient.get(`${FEEDBACKS_BASE}/can-edit/${feedbackId}`)
  },

  update(feedbackId, request, fileList = []) {
    const formData = new FormData()
    formData.append(
      'request',
      new Blob([JSON.stringify(request)], { type: 'application/json' }),
      'request.json'
    )
    appendFiles(formData, fileList)
    return apiClient.put(`${FEEDBACKS_BASE}/${feedbackId}`, formData)
  },

  delete(feedbackId) {
    return apiClient.delete(`${FEEDBACKS_BASE}/${feedbackId}`)
  },
}
