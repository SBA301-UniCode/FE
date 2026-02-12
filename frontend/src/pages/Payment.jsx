import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import { courseApi, paymentApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './Payment.css'

const PAYING_TIMEOUT_MS = 15000

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price)
  if (Number.isNaN(num)) return String(price)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

const Payment = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const { user, isAuthenticated } = useAuth()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [declinedOfferDemo, setDeclinedOfferDemo] = useState(false)

  // Lấy course từ state (khi chuyển từ trang Courses) hoặc fetch theo courseId
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
    courseApi
      .getById(courseId)
      .then((res) => {
        const data = res.data?.data ?? res.data
        if (!cancelled) setCourse(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.status === 404
            ? 'Không tìm thấy khóa học. Vui lòng quay lại danh sách khóa học.'
            : 'Không tải được thông tin khóa học.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  useEffect(() => () => {
    if (payingTimeoutRef.current) clearTimeout(payingTimeoutRef.current)
  }, [])

  const payingTimeoutRef = useRef(null)

  const handleDemoPayment = () => {
    if (!courseId) return
    try {
      const key = 'unicode_demo_paid_courses'
      const raw = localStorage.getItem(key)
      const list = raw ? JSON.parse(raw) : []
      if (!list.includes(courseId)) list.push(courseId)
      localStorage.setItem(key, JSON.stringify(list))
    } catch (_) { /* ignore */ }
    window.location.href = `/payment/success?courseId=${encodeURIComponent(courseId)}&demo=1`
  }

  const handlePayWithMoMo = async () => {
    if (!courseId) return
    setPaying(true)
    setError('')
    setDeclinedOfferDemo(false)
    if (payingTimeoutRef.current) clearTimeout(payingTimeoutRef.current)
    payingTimeoutRef.current = setTimeout(() => {
      setPaying(false)
      setError('Chuyển hướng quá lâu. Môi trường Sandbox: vui lòng thử lại hoặc kiểm tra kết nối / cấu hình backend.')
    }, PAYING_TIMEOUT_MS)
    try {
      const result = await paymentApi.buySubscription(courseId)
      if (payingTimeoutRef.current) {
        clearTimeout(payingTimeoutRef.current)
        payingTimeoutRef.current = null
      }
      const data = result?.data !== undefined ? result.data : result
      const statusPayment = data?.statusPayment ?? result?.statusPayment
      const momoMessage = (data?.message ?? result?.message) || ''

      if (statusPayment === 'ERROR' || (momoMessage && String(momoMessage).toLowerCase().includes('declined'))) {
        setError(
          'MoMo Sandbox từ chối giao dịch ("Declined due to general reasons"). ' +
          'Thường do: (1) Tài khoản test / giới hạn Sandbox, (2) Cấu hình backend (partnerCode, accessKey, secretKey, returnUrl), ' +
          '(3) MoMo Sandbox đôi khi từ chối ngẫu nhiên.'
        )
        setDeclinedOfferDemo(true)
        return
      }

      const payUrl =
        (typeof data?.payUrl === 'string' && data.payUrl.startsWith('http') ? data.payUrl : null) ||
        (typeof data?.paymentUrl === 'string' && data.paymentUrl.startsWith('http') ? data.paymentUrl : null) ||
        (typeof result?.payUrl === 'string' && result.payUrl.startsWith('http') ? result.payUrl : null) ||
        (typeof momoMessage === 'string' && momoMessage.startsWith('http') ? momoMessage : null)
      if (payUrl) {
        window.location.href = payUrl
        return
      }
      setError('Backend không trả về link thanh toán MoMo (payUrl). Kiểm tra API trả về payUrl khi tạo giao dịch thành công.')
      setDeclinedOfferDemo(false)
    } catch (e) {
      if (payingTimeoutRef.current) {
        clearTimeout(payingTimeoutRef.current)
        payingTimeoutRef.current = null
      }
      setError(e.message || 'Không thể tạo giao dịch MoMo.')
    } finally {
      setPaying(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="payment-page">
        <Header />
        <main className="payment-main">
          <div className="payment-card">
            <h1 className="payment-title">Thanh toán khóa học</h1>
            <div className="payment-error">
              Bạn cần đăng nhập để thanh toán khóa học.
            </div>
            <Link to="/login" className="payment-back-link">
              ← Đăng nhập
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="payment-page">
      <Header />
      <main className="payment-main">
        <div className="payment-card">
          <h1 className="payment-title">Thanh toán khóa học</h1>

          {loading && <div className="payment-loading">Đang tải thông tin...</div>}

          {!loading && error && !course && (
            <div className="payment-error">
              {error}
              <Link to="/courses" className="payment-back-link">← Quay lại danh sách khóa học</Link>
            </div>
          )}

          {!loading && course && (
            <>
              <p className="payment-desc">Xem lại thông tin khóa học và chọn phương thức thanh toán bên dưới.</p>
              <div className="payment-summary">
                <div className="payment-course-name">{course.title || 'Khóa học'}</div>
                {course.instructorName && (
                  <div className="payment-course-meta">Giảng viên: {course.instructorName}</div>
                )}
                <div className="payment-course-price">{formatPrice(course.price)}</div>
              </div>
              {error && (
                <div className="payment-error-box" role="alert">
                  {error}
                  {declinedOfferDemo && (
                    <div className="payment-demo-offer">
                      <p className="payment-demo-offer-text">Bạn vẫn có thể tiếp tục trải nghiệm: coi như đã thanh toán (chỉ trên trình duyệt, không ghi nhận ở backend).</p>
                      <button
                        type="button"
                        className="payment-btn payment-btn-demo"
                        onClick={handleDemoPayment}
                      >
                        Sandbox: Coi như đã thanh toán (chỉ demo)
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="payment-actions">
                <button
                  type="button"
                  className="payment-btn payment-btn-momo"
                  onClick={handlePayWithMoMo}
                  disabled={paying}
                >
                  {paying ? 'Đang chuyển hướng...' : 'Thanh toán qua MoMo'}
                </button>
                <p className="payment-note">Bạn sẽ được chuyển sang ví MoMo để hoàn tất thanh toán.</p>
                <p className="payment-sandbox-note">Môi trường Sandbox: chỉ dùng để kiểm thử, giao dịch không thật. Nếu trang bị treo, hãy thử lại sau vài giây.</p>
                <Link to="/courses" className="payment-btn payment-btn-ghost">
                  Hủy / Quay lại
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Payment
