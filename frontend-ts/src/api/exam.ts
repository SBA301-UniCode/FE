import apiClient from './client'
import type { AxiosResponse } from 'axios'

const EXAMS_BASE = '/api/v1/exams'

export const examApi = {
  createExam: (lessonId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(`${EXAMS_BASE}/quiz/${lessonId}`, payload),
  updateExam: (examId: string, payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.patch(`${EXAMS_BASE}/${examId}`, payload),
  changeStatus: (examId: string): Promise<AxiosResponse> =>
    apiClient.patch(`${EXAMS_BASE}/${examId}/status`),
  getQuestionsByExam: (examId: string): Promise<AxiosResponse> =>
    apiClient.get(`${EXAMS_BASE}/${examId}/questions`),
  getExamById: (examId: string): Promise<AxiosResponse> =>
    apiClient.get(`${EXAMS_BASE}/${examId}`),
  startExam: (examId: string): Promise<AxiosResponse> =>
    apiClient.post(`${EXAMS_BASE}/${examId}/start`),
  submitExam: (payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(`${EXAMS_BASE}/submit`, payload),
  getAttemptHistory: (examAttemptId: string): Promise<AxiosResponse> =>
    apiClient.get(`${EXAMS_BASE}/attempts/${examAttemptId}/history`),
  getAttemptResults: (examAttemptId: string): Promise<AxiosResponse> =>
    apiClient.get(`${EXAMS_BASE}/attempts/${examAttemptId}/results`),
  getMyAttemptResults: (examId: string): Promise<AxiosResponse> =>
    apiClient.get(`${EXAMS_BASE}/attempts/${examId}/my-attempt`),
}
