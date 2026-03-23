import apiClient from './client'
import type { AxiosResponse } from 'axios'

const VIDEOS_BASE = '/api/v1/videos'

interface UploadUrlPayload { fileName: string; contentType: string; size: string | number }
interface CreateVideoPayload { lessonId: string; duration: number; key: string }

export const videoApi = {
  generateUploadUrl: (payload: UploadUrlPayload): Promise<AxiosResponse> =>
    apiClient.post(`${VIDEOS_BASE}/generate-upload-url`, payload),

  createVideoRecord(request: CreateVideoPayload): Promise<AxiosResponse> {
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }), 'request.json')
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
