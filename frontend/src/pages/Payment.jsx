import { useEffect, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import { courseApi, paymentApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './Payment.css'

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

  const handlePayWithMoMo = async () => {
    if (!courseId) return
    setPaying(true)
    setError('')
    try {
      const result = await paymentApi.buySubscription(courseId)
      const payUrl = result?.message
      if (payUrl && typeof payUrl === 'string' && payUrl.startsWith('http')) {
        window.location.href = payUrl
        return
      }
      setError('Backend không trả về link thanh toán MoMo.')
    } catch (e) {
      setError(e.message || 'Không thể tạo giao dịch MoMo.')
    } finally {
      setPaying(false)
    }
  }

  if (!isAuthenticated) {
    return null
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
