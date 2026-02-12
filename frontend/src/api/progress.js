import apiClient from './client'

const COURSES_BASE = import.meta.env.VITE_COURSES_ENDPOINT || '/api/v1/courses'

/**
 * Progress / Process API client.
 * Backend:
 * - GET /api/v1/courses/{courseId}/progress  → current user's progress for course
 * - PUT /api/v1/courses/{courseId}/progress/contents/{contentId}  → update progress
 * Response: { data: { enrollmentId, courseId, courseTitle, statusCourse, percentComplete, enrollmentDate, lastUpdate, processes: [...] } }
 */
export const progressApi = {
  /** Lấy tiến độ khóa học của user hiện tại */
  getProgressByCourse: (courseId) =>
    apiClient.get(`${COURSES_BASE}/${courseId}/progress`),

  /** Cập nhật tiến độ một content (body: { statusContent?, percentComplete? }) */
  updateProgress: (courseId, contentId, body) =>
    apiClient.put(`${COURSES_BASE}/${courseId}/progress/contents/${contentId}`, body),
}
