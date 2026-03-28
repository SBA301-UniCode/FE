import { useEffect, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { courseApi, paymentApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './Payment.css'

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price)
  if (Number.isNaN(num)) return String(price)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

const getCourseImage = (c) =>
  c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || ''

const Payment = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const { user, isAuthenticated } = useAuth()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stateCourse = location.state?.course
    if (stateCourse && (stateCourse.courseId === courseId || stateCourse.courseId?.toString() === courseId)) {
      setCourse(stateCourse)
      setLoading(false)
      return
    }
    if (!courseId) {
      setLoading(false)
      setError('Thiếu thông tin khóa học.')
      return
    }
    let cancelled = false
    courseApi.getById(courseId)
      .then((res) => { const data = res.data?.data ?? res.data; if (!cancelled) setCourse(data) })
      .catch((err) => { if (!cancelled) setError(err.response?.status === 404 ? 'Không tìm thấy khóa học.' : 'Không tải được thông tin khóa học.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId])

  const handlePayWithMoMo = async () => {
    if (!courseId) return
    setPaying(true); setError('')
    try {
      const result = await paymentApi.buySubscription(courseId)
      const payUrl = typeof result === 'string' ? result : (result?.data ?? result?.message)
      if (payUrl && typeof payUrl === 'string' && payUrl.startsWith('http')) {
        window.location.href = payUrl
        return
      }
      setError('Backend không trả về link thanh toán MoMo.')
    } catch (e) {
      setError(e.message || 'Không thể tạo giao dịch MoMo.')
    } finally { setPaying(false) }
  }

  if (!isAuthenticated) return null

  return (
    <div className="pay-page">
      <Header />
      <main className="pay-main">
        {/* ═══ BREADCRUMBS ═══ */}
        <div className="pay-breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          <Link to="/courses">Courses</Link>
          <span>›</span>
          <span>Checkout</span>
        </div>

        <h1 className="pay-title">Checkout</h1>

        {loading && <div className="pay-loading"><div className="pay-skeleton" /><div className="pay-skeleton pay-skeleton-sm" /></div>}

        {!loading && error && !course && (
          <div className="pay-error-box">
            ⚠️ {error}
            <Link to="/courses" className="pay-link">← Quay lại</Link>
          </div>
        )}

        {!loading && course && (
          <div className="pay-layout">
            {/* Left: Order details */}
            <div className="pay-order">
              <div className="pay-order-card">
                <h2 className="pay-section-title">Order Summary</h2>
                <div className="pay-course-row">
                  {getCourseImage(course) && (
                    <img src={getCourseImage(course)} alt="" className="pay-course-thumb" />
                  )}
                  <div className="pay-course-info">
                    <h3 className="pay-course-name">{course.title || 'Khóa học'}</h3>
                    {course.instructorName && <p className="pay-course-meta">by {course.instructorName}</p>}
                    <div className="pay-course-badges">
                      <span className="pay-badge">📗 Full Course</span>
                      <span className="pay-badge">📜 Certificate</span>
                    </div>
                  </div>
                </div>
                <div className="pay-price-breakdown">
                  <div className="pay-price-row">
                    <span>Course price</span>
                    <span>{formatPrice(course.price)}</span>
                  </div>
                  <div className="pay-price-row pay-price-total">
                    <span>Total</span>
                    <span className="pay-total-amount">{formatPrice(course.price)}</span>
                  </div>
                </div>
              </div>

              {/* Trust signals */}
              <div className="pay-trust">
                <div className="pay-trust-item">
                  <span className="pay-trust-icon">🔒</span>
                  <div>
                    <strong>Secure Checkout</strong>
                    <span>SSL encrypted payment</span>
                  </div>
                </div>
                <div className="pay-trust-item">
                  <span className="pay-trust-icon">🔄</span>
                  <div>
                    <strong>30-Day Guarantee</strong>
                    <span>Full refund if unsatisfied</span>
                  </div>
                </div>
                <div className="pay-trust-item">
                  <span className="pay-trust-icon">♾️</span>
                  <div>
                    <strong>Lifetime Access</strong>
                    <span>Learn at your own pace</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Payment method */}
            <div className="pay-method">
              <div className="pay-method-card">
                <h2 className="pay-section-title">Payment Method</h2>
                <p className="pay-method-desc">Choose your preferred payment method below.</p>

                {error && (
                  <div className="pay-error-inline" role="alert">{error}</div>
                )}

                <button
                  type="button"
                  className="pay-btn pay-btn-momo"
                  onClick={handlePayWithMoMo}
                  disabled={paying}
                >
                  <span className="pay-btn-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#fff" fillOpacity="0.2"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">M</text></svg>
                  </span>
                  {paying ? 'Đang chuyển hướng...' : 'Pay with MoMo'}
                </button>
                <p className="pay-redirect-note">
                  You'll be redirected to MoMo to complete the payment securely.
                </p>

                <div className="pay-divider"><span>or</span></div>

                <Link to="/courses" className="pay-btn pay-btn-cancel">
                  Cancel & Return to Courses
                </Link>
              </div>

              <div className="pay-user-info">
                <span className="pay-user-label">Paying as</span>
                <span className="pay-user-name">{user?.name || user?.email || 'User'}</span>
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
