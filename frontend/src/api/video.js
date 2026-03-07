import apiClient from './client'

const VIDEOS_BASE = '/api/v1/videos'

/**
 * Tích hợp video Cloudinary qua backend.
 * Backend upload file lên Cloudinary và lưu URL vào DB.
 */
export const videoApi = {
  /**
   * Upload video (backend gửi lên Cloudinary).
   * @param {{ contentId: string, duration: number }} request
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

  /** Chi tiết một video theo contentId */
  getVideoDetail(contentId) {
    return apiClient.get(`${VIDEOS_BASE}/${contentId}`)
  },

  /** Xóa video (soft delete + xóa trên Cloudinary) */
  deleteVideo(contentId) {
    return apiClient.delete(`${VIDEOS_BASE}/${contentId}`)
  },
}
