import apiClient from './client'

const BASE = '/api/v1/mindmap'

export const mindmapApi = {
  getTree(courseId) {
    return apiClient.get(`${BASE}/${courseId}`)
  },
  saveTree(courseId, treeData) {
    return apiClient.put(`${BASE}/${courseId}`, treeData, {
      headers: { 'Content-Type': 'application/json' },
    })
  },
  resetTree(courseId) {
    return apiClient.delete(`${BASE}/${courseId}`)
  },
}
