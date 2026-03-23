import { useEffect, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { courseApi, paymentApi } from '../api'
import { useAuth } from '../contexts/useAuth'

type AnyObj = Record<string, unknown>
const formatPrice = (price: unknown) => { if (price === null || price === undefined || price === '') return ''; const n = Number(price); return Number.isNaN(n) ? String(price) : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) }
const getCourseImage = (c: AnyObj) => (c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || '') as string

const Payment = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const { user, isAuthenticated } = useAuth()
  const [course, setCourse] = useState<AnyObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stateCourse = (location.state as { course?: AnyObj })?.course
    if (stateCourse && (stateCourse.courseId === courseId || String(stateCourse.courseId) === courseId)) { setCourse(stateCourse); setLoading(false); return }
    if (!courseId) { setLoading(false); setError('Thiếu thông tin khóa học.'); return }
    let cancelled = false
    courseApi.getById(courseId)
      .then((res) => { const d = res.data?.data ?? res.data; if (!cancelled) setCourse(d as AnyObj) })
      .catch((err: { response?: { status?: number } }) => { if (!cancelled) setError(err.response?.status === 404 ? 'Không tìm thấy khóa học.' : 'Không tải được thông tin khóa học.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId, location.state])

  const handlePayWithMoMo = async () => {
    if (!courseId) return; setPaying(true); setError('')
    try {
      const result = await paymentApi.buySubscription(courseId)
      const payUrl = typeof result === 'string' ? result : ((result as AnyObj)?.data ?? (result as AnyObj)?.message)
      if (payUrl && typeof payUrl === 'string' && (payUrl as string).startsWith('http')) { window.location.href = payUrl as string; return }
      setError('Backend không trả về link thanh toán MoMo.')
    } catch (e: unknown) { setError((e as Error).message || 'Không thể tạo giao dịch MoMo.') }
    finally { setPaying(false) }
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="max-w-[960px] mx-auto px-6 py-6 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[0.82rem] text-text-muted mb-4">
          <Link to="/" className="text-primary-500 no-underline hover:underline">Home</Link><span>›</span>
          <Link to="/courses" className="text-primary-500 no-underline hover:underline">Courses</Link><span>›</span><span>Checkout</span>
        </div>
        <h1 className="m-0 mb-6 text-[1.75rem] font-extrabold">Checkout</h1>

        {loading && <div className="flex flex-col gap-4"><div className="h-[200px] bg-gray-100 rounded-[14px] animate-pulse" /><div className="h-[120px] bg-gray-100 rounded-[14px] animate-pulse" /></div>}

        {!loading && error && !course && (
          <div className="max-w-[500px] mx-auto my-8 text-center p-8 bg-white rounded-[14px] border border-border-medium text-red-600">
            ⚠️ {error}
            <Link to="/courses" className="block mt-3 text-primary-500 no-underline font-semibold">← Quay lại</Link>
          </div>
        )}

        {!loading && course && (
          <div className="grid grid-cols-[1fr_380px] gap-6 items-start max-[860px]:grid-cols-1">
            {/* Order summary */}
            <div>
              <div className="bg-white border border-border-medium rounded-[14px] p-6 mb-4">
                <h2 className="m-0 mb-4 text-lg font-extrabold">Order Summary</h2>
                <div className="flex gap-4 mb-5 pb-5 border-b border-border-subtle">
                  {getCourseImage(course) && <img src={getCourseImage(course)} alt="" className="w-[120px] h-20 rounded-[10px] object-cover shrink-0" />}
                  <div className="flex-1">
                    <h3 className="m-0 mb-1 text-[1.05rem] font-bold leading-snug">{(course.title as string) || 'Khóa học'}</h3>
                    {!!course.instructorName && <p className="m-0 mb-2 text-text-muted text-[0.85rem]">by {String(course.instructorName)}</p>}
                    <div className="flex gap-2">
                      <span className="text-[0.72rem] font-semibold text-text-secondary bg-border-subtle px-2 py-0.5 rounded-md">📗 Full Course</span>
                      <span className="text-[0.72rem] font-semibold text-text-secondary bg-border-subtle px-2 py-0.5 rounded-md">📜 Certificate</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[0.92rem] text-text-secondary"><span>Course price</span><span>{formatPrice(course.price)}</span></div>
                  <div className="flex justify-between border-t border-border-subtle pt-3 mt-1 font-bold text-text-main"><span>Total</span><span className="text-xl font-extrabold text-primary-500">{formatPrice(course.price)}</span></div>
                </div>
              </div>
              {/* Trust */}
              <div className="flex flex-col gap-3">
                {[{ icon: '🔒', title: 'Secure Checkout', sub: 'SSL encrypted payment' }, { icon: '🔄', title: '30-Day Guarantee', sub: 'Full refund if unsatisfied' }, { icon: '♾️', title: 'Lifetime Access', sub: 'Learn at your own pace' }].map((t) => (
                  <div key={t.title} className="flex items-center gap-3 px-4 py-3 bg-white border border-border-subtle rounded-[10px]">
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <div className="flex flex-col"><strong className="text-[0.85rem] font-bold">{t.title}</strong><span className="text-[0.78rem] text-text-muted">{t.sub}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <div className="bg-white border border-border-medium rounded-[14px] p-6 mb-3">
                <h2 className="m-0 mb-4 text-lg font-extrabold">Payment Method</h2>
                <p className="m-0 mb-4 text-text-secondary text-sm">Choose your preferred payment method below.</p>
                {error && <div className="px-4 py-3 mb-4 rounded-[10px] text-[0.88rem] bg-red-50 border border-red-200 text-red-600" role="alert">{error}</div>}
                <button type="button" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-base no-underline border-none cursor-pointer font-[inherit] transition-all bg-[linear-gradient(135deg,#ae2070_0%,#d63384_50%,#7b1fa2_100%)] text-white shadow-[0_4px_16px_rgba(174,32,112,0.3)] hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_24px_rgba(174,32,112,0.35)] disabled:opacity-70 disabled:cursor-not-allowed" onClick={handlePayWithMoMo} disabled={paying}>
                  <span className="flex items-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#fff" fillOpacity="0.2" /><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">M</text></svg></span>
                  {paying ? 'Đang chuyển hướng...' : 'Pay with MoMo'}
                </button>
                <p className="mt-2 text-[0.78rem] text-text-muted text-center">You'll be redirected to MoMo to complete the payment securely.</p>
                <div className="flex items-center gap-3 my-4 text-text-muted text-[0.82rem] before:content-[''] before:flex-1 before:h-px before:bg-border-subtle after:content-[''] after:flex-1 after:h-px after:bg-border-subtle"><span>or</span></div>
                <Link to="/courses" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-base no-underline border-none cursor-pointer transition-colors bg-border-subtle text-text-secondary hover:bg-gray-200">Cancel & Return to Courses</Link>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[rgba(0,86,210,0.04)] text-[0.82rem]">
                <span className="text-text-muted">Paying as</span>
                <span className="font-semibold text-text-main">{user?.name || user?.email || 'User'}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Payment
