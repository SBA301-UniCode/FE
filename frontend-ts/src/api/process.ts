import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { TrackContentPayload, ProgressPayload } from '../types'

const PROCESS_BASE = '/api/v1/process'

/**
 * Map FE-friendly field names (courseId, lessonId, chapterId) to BE's expected field name ("id").
 * BE TrackingRequest only has { id: UUID, enrollmentId: UUID }.
 */
const toTrackingRequest = (payload: ProgressPayload) => ({
  id: payload.courseId || payload.chapterId || payload.lessonId || payload.id,
  enrollmentId: payload.enrollmentId,
})

export const processApi = {
  trackContent: (payload: TrackContentPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/tracking`, payload),
  getLessonProgress: (payload: ProgressPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/lessons`, toTrackingRequest(payload)),
  getChapterProgress: (payload: ProgressPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/chapters`, toTrackingRequest(payload)),
  getCourseProgress: (payload: ProgressPayload): Promise<AxiosResponse> =>
    apiClient.post(`${PROCESS_BASE}/courses`, toTrackingRequest(payload)),
}
