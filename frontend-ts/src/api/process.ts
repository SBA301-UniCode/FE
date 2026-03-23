import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { TrackContentPayload, ProgressPayload } from '../types'

const PROCESS_BASE = '/api/v1/process'

export const processApi = {
  trackContent: (payload: TrackContentPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/tracking`, payload),
  getLessonProgress: (payload: ProgressPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/lessons`, payload),
  getChapterProgress: (payload: ProgressPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/chapters`, payload),
  getCourseProgress: (payload: ProgressPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/courses`, payload),
}
