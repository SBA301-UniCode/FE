import apiClient from './client'
import type { AxiosResponse } from 'axios'

const WM_BASE = '/api/v1/watermark'

export const watermarkApi = {
  downloadWithWatermark: (documentId: string): Promise<AxiosResponse<Blob>> =>
    apiClient.get(`${WM_BASE}/download/${documentId}`, { responseType: 'blob' }),
  verify(file: File): Promise<AxiosResponse> {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`${WM_BASE}/verify`, formData)
  },
}
