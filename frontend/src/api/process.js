import apiClient from './client'

const PROCESS_BASE = '/api/v1/process'

/**
 * API tiến trình học (Process / Tracking).
 * Chỉ gọi backend hiện có, không sửa logic backend.
 */
export const processApi = {
  /**
   * Cập nhật tiến trình của một content (ví dụ: video).
   * body map với ProcessRequest trong backend.
   */
  trackContent({ contentId, enrollmentId, status }) {
    return apiClient.post(`${PROCESS_BASE}/tracking`, {
      contentId,
      enrollmentId,
      status,
    })
  },

  /** Tiến trình một bài giảng (lesson) theo enrollment */
  getLessonProgress({ lessonId, enrollmentId }) {
    return apiClient.post(`${PROCESS_BASE}/lessons`, {
      id: lessonId,
      enrollmentId,
    })
  },

  /** Tiến trình một chương (chapter) theo enrollment */
  getChapterProgress({ chapterId, enrollmentId }) {
    return apiClient.post(`${PROCESS_BASE}/chapters`, {
      id: chapterId,
      enrollmentId,
    })
  },

  /** Tiến trình một khóa học (course) theo enrollment */
  getCourseProgress({ courseId, enrollmentId }) {
    return apiClient.post(`${PROCESS_BASE}/courses`, {
      id: courseId,
      enrollmentId,
    })
  },
}

