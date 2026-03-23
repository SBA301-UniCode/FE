import apiClient from './client'
import type { AxiosResponse } from 'axios'
import type { ContentType } from '../types'

const CONTENTS_BASE = '/api/v1/contents'

interface CreateContentPayload { contentType: ContentType; lessonId: string }

export const contentApi = {
  create: (payload: CreateContentPayload): Promise<AxiosResponse> =>
    apiClient.post(CONTENTS_BASE, payload),
  getByLessonId: (lessonId: string): Promise<AxiosResponse> =>
    apiClient.get(`${CONTENTS_BASE}/${lessonId}`),
  update: (contentId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.put(`${CONTENTS_BASE}/${contentId}`, payload),
  delete: (contentId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${CONTENTS_BASE}/${contentId}`),
}
