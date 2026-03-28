/**
 * Gemini AI Service for Code Testing
 * Calls backend proxy at /api/v1/ai/code-assistant
 * API key is securely stored on the backend — NOT exposed to browser
 */

import apiClient from '../api/client'

export interface AICodeRequest {
  code: string
  language: string
  description: string
  testResults?: { input: string; expected: string; actual: string; passed: boolean }[]
  mode: 'hint' | 'explain_error' | 'review' | 'suggest_fix'
}

export const askGeminiCode = async (req: AICodeRequest): Promise<string> => {
  try {
    const res = await apiClient.post('/api/v1/ai/code-assistant', {
      code: req.code,
      language: req.language,
      description: req.description,
      mode: req.mode,
      testResults: req.testResults || []
    })

    // ApiResponse format: { code, message, success, data }
    const body = res.data
    const data = body?.data ?? body

    if (typeof data === 'string' && data.length > 0) {
      return data
    }

    // Fallback: try nested data
    if (typeof data?.data === 'string') {
      return data.data
    }

    throw new Error('AI không trả về phản hồi.')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    const msg = err.response?.data?.message || err.message || 'Lỗi kết nối AI Assistant'
    throw new Error(msg)
  }
}
