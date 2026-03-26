import apiClient from './client'

const AI_BASE = '/api/v1/ai'

export const chatApi = {
  sendMessage: (message: string) =>
    apiClient.post(`${AI_BASE}/course-chat`, { message }),
}
