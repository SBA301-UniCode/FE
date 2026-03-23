/* ═══ Generic API response wrapper ═══ */
export interface ApiResponse<T> {
  code: number
  message: string
  success: boolean
  data: T
}

export interface PageResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
  size: number
  number: number
}

/* ═══ Auth ═══ */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export interface Role {
  roleCode: string
  roleName: string
  description: string
  privileges: Privilege[]
}

export interface Privilege {
  privilegeCode: string
  privilegeName: string
  description: string
}

export interface User {
  userId: string
  name: string
  fullName: string
  email: string
  username: string
  password?: string
  dateOfBirth: string
  phoneNumber: string
  avatarUrl: string
  createdDate: string
  updatedDate: string
  roles: Role[]
  isActive?: boolean
  active?: boolean
  roleCodes?: Set<string>
  [key: string]: unknown
}

/* ═══ Course ═══ */
export interface Course {
  courseId: string
  courseName: string
  description: string
  image: string
  imageUrl: string
  thumbnail: string
  coverImage: string
  price: number
  isFree: boolean
  level: string
  tags: string[]
  instructorName: string
  instructorId: string
  averageRating: number
  totalReviews: number
  totalEnrollments: number
  totalChapters: number
  totalLessons: number
  createdDate: string
  updatedDate: string
  [key: string]: unknown
}

/* ═══ Chapter ═══ */
export interface Chapter {
  chapterId: string
  chapterName: string
  description: string
  orderIndex: number
  courseId: string
}

/* ═══ Lesson ═══ */
export interface Lesson {
  lessonId: string
  lessonName: string
  description: string
  orderIndex: number
  chapterId: string
}

/* ═══ Content ═══ */
export type ContentType = 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE'

export interface Content {
  contentId: string
  contentType: ContentType
  lessonId: string
  title: string
  description: string
  [key: string]: unknown
}

/* ═══ Video ═══ */
export interface Video {
  videoId: string
  contentId: string
  url: string
  videoUrl: string
  secureUrl: string
  duration: number
  key: string
}

/* ═══ Enrollment ═══ */
export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface Enrollment {
  enrollmentId: string
  courseId: string
  learnerId: string
  statusCourse: EnrollmentStatus
  createdDate: string
  courseResponse?: Course
  course?: Course
}

/* ═══ Process / Progress ═══ */
export type ProcessStatus = 'NOT_STARTED' | 'IN_PROCESS' | 'COMPLETED'

export interface ProcessItem {
  id: string
  contentId: string
  lessonId: string
  chapterId: string
  statusContent: ProcessStatus
  status: ProcessStatus
}

export interface TrackContentPayload {
  contentId: string
  enrollmentId: string
  status: ProcessStatus | string
}

export interface ProgressPayload {
  enrollmentId: string
  id?: string
  courseId?: string
  chapterId?: string
  lessonId?: string
  [key: string]: unknown
}

/* ═══ Certificate ═══ */
export interface Certificate {
  certificateId: string
  serialNumber: string
  learnerId: string
  courseId: string
  issueDate: string
  courseName: string
  learnerName: string
}

/* ═══ Feedback ═══ */
export interface FeedbackImage {
  imageId: string
  imageUrl: string
  url: string
}

export interface FeedbackRequest {
  comment: string
  rating: number
}

export interface Feedback {
  feedBackId: string
  feedbackId: string
  id: string
  comment: string
  rating: number
  createdAt: string
  createdDate: string
  updatedAt: string
  userResponse: {
    fullName: string
    name: string
    username: string
    email: string
  }
  imageResponses: FeedbackImage[]
}

/* ═══ Syllabus ═══ */
export interface Syllabus {
  syllabusId: string
  courseId: string
  content: string
  methodology: string
  materials: string
  courseName: string
}

/* ═══ Payment ═══ */
export interface PaymentResponse {
  code: number
  message: string
  success: boolean
}

/* ═══ Subscription ═══ */
export interface Subscription {
  subscriptionId: string
  courseId: string
  userId: string
  amount: number
  status: string
  createdDate: string
}

/* ═══ Exam / Quiz ═══ */
export interface Exam {
  examId: string
  title: string
  description: string
  duration: number
  totalQuestions: number
  passingScore: number
  status: string
}

export interface Question {
  questionBankId: string
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface ExamAttempt {
  examAttemptId: string
  examId: string
  score: number
  status: string
  startedAt: string
  submittedAt: string
}

/* ═══ Document ═══ */
export interface Document {
  documentId: string
  title: string
  fileUrl: string
  lessonId: string
}

/* ═══ Mindmap ═══ */
export interface MindmapNode {
  id: string
  name: string
  children?: MindmapNode[]
  [key: string]: unknown
}
