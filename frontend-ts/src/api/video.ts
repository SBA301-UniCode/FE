import apiClient from './client'
import type { AxiosResponse } from 'axios'

const VIDEOS_BASE = '/api/v1/videos'

interface UploadUrlPayload { fileName: string; contentType: string; size: string | number }
interface CreateVideoPayload { lessonId: string; duration: number; key: string }

export const videoApi = {
  generateUploadUrl: (payload: UploadUrlPayload): Promise<AxiosResponse> =>
    apiClient.post(`${VIDEOS_BASE}/generate-upload-url`, payload),

  createVideoRecord(request: CreateVideoPayload): Promise<AxiosResponse> {
    const normalizedKey = String(request?.key || '').trim()
    const formData = new FormData()
    // Backend implementations differ by field name for S3 object key.
    // Send compatible aliases so key is not persisted as null.
    const payload = {
      ...request,
      key: normalizedKey,
      s3Key: normalizedKey,
      objectKey: normalizedKey,
      fileKey: normalizedKey,
    }
    formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'request.json')
    return apiClient.post(`${VIDEOS_BASE}/create`, formData)
  },

  getAllActiveVideos: (): Promise<AxiosResponse> =>
    apiClient.get(VIDEOS_BASE),
  getVideoDetail: (videoId: string): Promise<AxiosResponse> =>
    apiClient.get(`${VIDEOS_BASE}/${videoId}`),
  getVideoPlaybackUrl: (videoId: string): Promise<AxiosResponse> =>
    apiClient.get(`${VIDEOS_BASE}/video-url/${videoId}`),
  deleteVideo: (contentId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${VIDEOS_BASE}/${contentId}`),

  getStreamUrl(videoId: string): string {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    return `${VIDEOS_BASE}/${videoId}/stream${token ? '?token=' + encodeURIComponent(token) : ''}`
  },
}
