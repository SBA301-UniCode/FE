import apiClient from './client'
import type { AxiosResponse } from 'axios'

const CERTS_BASE = '/api/v1/certificates'

export const certificateApi = {
  getAll: (page = 0, size = 20): Promise<AxiosResponse> =>
    apiClient.get(CERTS_BASE, { params: { page, size } }),
  getByLearnerId: (learnerId: string): Promise<AxiosResponse> =>
    apiClient.get(`${CERTS_BASE}/user/${learnerId}`),
  getMyList: (): Promise<AxiosResponse> =>
    apiClient.get(`${CERTS_BASE}/me`),
  create: (payload: Record<string, unknown>): Promise<AxiosResponse> =>
    apiClient.post(CERTS_BASE, payload),
  getById: (certificateId: string): Promise<AxiosResponse> =>
    apiClient.get(`${CERTS_BASE}/${certificateId}`),
  verifyBySerial: (serialNumber: string): Promise<AxiosResponse> =>
    apiClient.get(`${CERTS_BASE}/verify/${serialNumber}`),
  delete: (certificateId: string): Promise<AxiosResponse> =>
    apiClient.delete(`${CERTS_BASE}/${certificateId}`),
}
