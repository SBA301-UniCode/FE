import apiClient from './client'

const WM_BASE = '/api/v1/watermark'

/**
 * Watermark API client – document protection & verification.
 */
export const watermarkApi = {
  /**
   * Download a document with invisible watermark embedded.
   * Returns a Blob for file download.
   */
  downloadWithWatermark(documentId) {
    return apiClient.get(`${WM_BASE}/download/${documentId}`, {
      responseType: 'blob',
    })
  },

  /**
   * Upload a file for watermark verification (admin/instructor).
   * @param {File} file – image or PDF to verify
   */
  verify(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`${WM_BASE}/verify`, formData)
  },
}
