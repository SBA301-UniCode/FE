import apiClient from './client'

const VIDEOS_BASE = '/api/v1/videos'

export const videoApi = {
  /**
   * Xin presigned PUT URL để upload thẳng lên S3.
   * Backend trả về { uploadUrl, key }.
   * @param {{ fileName: string, contentType: string, size: string|number }} payload
   */
  generateUploadUrl(payload) {
    return apiClient.post(`${VIDEOS_BASE}/generate-upload-url`, payload)
  },

  /**
   * Tạo record video sau khi upload client-side.
   * Spring đang dùng @RequestPart request (multipart/form-data).
   * @param {{ lessonId: string, duration: number, key: string }} request
   */
  createVideoRecord(request) {
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }), 'request.json')
    return apiClient.post(`${VIDEOS_BASE}/create`, formData)
  },

  /** Lấy tất cả video đang dùng */
  getAllActiveVideos() {
    return apiClient.get(VIDEOS_BASE)
  },

  /** Chi tiết một video theo videoId */
  getVideoDetail(videoId) {
    return apiClient.get(`${VIDEOS_BASE}/${videoId}`)
  },

  /** Lấy signed playback URL (HLS m3u8) theo videoId */
  getVideoPlaybackUrl(videoId) {
    return apiClient.get(`${VIDEOS_BASE}/video-url/${videoId}`)
  },

  /** Xóa video (soft delete + xóa trên Cloudinary) */
  deleteVideo(contentId) {
    return apiClient.delete(`${VIDEOS_BASE}/${contentId}`)
  },
}
