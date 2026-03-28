import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { MindmapNode } from '../types'

const BASE = '/api/v1/mindmap'

export const mindmapApi = {
  getTree: (courseId: string): Promise<AxiosResponse> =>
    apiClient.get(`${BASE}/${courseId}`),
  saveTree: (courseId: string, treeData: MindmapNode): Promise<AxiosResponse> =>
    apiClient.put(`${BASE}/${courseId}`, treeData, { headers: { 'Content-Type': 'application/json' } }),
  resetTree: (courseId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${BASE}/${courseId}`),
}
