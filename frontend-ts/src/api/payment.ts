import momoClient from './momoClient'

const SUBSCRIPTIONS_BUY_PATH = '/api/v1/subscriptions/buy'

export const paymentApi = {
  buySubscription: async (courseId: string): Promise<{ code: number; message: string; success: boolean }> => {
    const res = await momoClient.post(`${SUBSCRIPTIONS_BUY_PATH}/${courseId}`, {})
    return res.data
  },
}
