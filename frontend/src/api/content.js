import apiClient from './client'

const CONTENTS_BASE = '/api/v1/contents'

/**
 * Content thuộc Lesson; loại VIDEO sẽ gắn với một Video (Cloudinary).
 */
export const contentApi = {
  /**
   * Tạo content (cần có trước khi upload video).
   * @param {{ contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ', lessonId: string }}
   */
  create(payload) {
    return apiClient.post(CONTENTS_BASE, payload)
  },

  /** Lấy tất cả content của một bài giảng (path backend dùng "lesonId") */
  getByLessonId(lessonId) {
    return apiClient.get(`${CONTENTS_BASE}/${lessonId}`)
  },

  update(contentId, payload) {
    return apiClient.put(`${CONTENTS_BASE}/${contentId}`, payload)
  },

  delete(contentId) {
    return apiClient.delete(`${CONTENTS_BASE}/${contentId}`)
  },
}
