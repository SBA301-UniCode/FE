import apiClient from './client'

const VIDEOS_BASE = '/api/v1/videos'

/**
 * Tích hợp video Cloudinary qua backend.
 * Backend upload file lên Cloudinary và lưu URL vào DB.
 */
export const videoApi = {
  /**
   * Upload video cho lesson (backend tự tạo Content(VIDEO)).
   * @param {{ lessonId: string, duration: number }} request
   * @param {File} file - file video
   */
  uploadVideo(request, file) {
    const formData = new FormData()
    // Spring @RequestPart("request") expects a JSON part.
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }), 'request.json')
    formData.append('file', file)
    return apiClient.post(`${VIDEOS_BASE}/create`, formData, { timeout: 300000 })
  },

  /** Lấy tất cả video đang dùng */
  getAllActiveVideos() {
    return apiClient.get(VIDEOS_BASE)
  },

  /** Chi tiết một video theo videoId */
  getVideoDetail(videoId) {
    return apiClient.get(`${VIDEOS_BASE}/${videoId}`)
  },

  /** Xóa video (soft delete + xóa trên Cloudinary) */
  deleteVideo(contentId) {
    return apiClient.delete(`${VIDEOS_BASE}/${contentId}`)
  },

  /**
   * Tạo URL stream qua backend proxy (giấu Cloudinary URL).
   * Dùng cho <video src="..."> — browser không gửi Authorization header,
   * nên truyền token qua query param.
   */
  getStreamUrl(videoId) {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    return `${VIDEOS_BASE}/${videoId}/stream${token ? '?token=' + encodeURIComponent(token) : ''}`
  },
}
