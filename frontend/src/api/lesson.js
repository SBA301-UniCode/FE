import apiClient from './client'

const COURSES_BASE = import.meta.env.VITE_COURSES_ENDPOINT || '/api/v1/courses'

/**
 * Lesson / Curriculum API client.
 * Backend: GET /api/v1/courses/{courseId}/curriculum
 * Response: { data: { courseId, courseTitle, chapters: [ { chapterId, title, orderIndex, lessons: [ { lessonId, title, orderIndex, contents: [ { contentId, contentType, lessonId } ] } ] } ] } }
 */
export const lessonApi = {
  getCurriculum: (courseId) =>
    apiClient.get(`${COURSES_BASE}/${courseId}/curriculum`),
}
