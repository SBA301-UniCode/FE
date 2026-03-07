import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { enrollmentApi } from '../api'
import './PaymentSuccess.css'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const status = searchParams.get('status') || searchParams.get('statusPayment') || ''
  const resultCode = searchParams.get('resultCode')
  const message = searchParams.get('message') || ''
  const orderId = searchParams.get('orderId') || ''
  const requestId = searchParams.get('requestId') || ''
  const transId = searchParams.get('transId') || searchParams.get('transactionId') || ''
  const [enrolling, setEnrolling] = useState(false)
  const enrollStorageKey = useMemo(() => {
    if (!courseId) return ''
    const transactionPart = [orderId, requestId, transId].filter(Boolean).join('|')
    const identity = transactionPart || `course:${courseId}`
    return `payment-success-enroll:${identity}`
  }, [courseId, orderId, requestId, transId])

  const isError =
    (resultCode != null && resultCode !== '' && resultCode !== '0') ||
    status.toUpperCase() === 'ERROR' ||
    message.toLowerCase().includes('declined')

  useEffect(() => {
    if (isError || !courseId || !enrollStorageKey) return

    const currentState = sessionStorage.getItem(enrollStorageKey)
    if (currentState === 'pending' || currentState === 'done') return
    sessionStorage.setItem(enrollStorageKey, 'pending')

    let cancelled = false
    const autoEnroll = async () => {
      setEnrolling(true)
      try {
        const enrolledRes = await enrollmentApi.isEnrolled(courseId)
        const enrolledData = enrolledRes.data?.data ?? enrolledRes.data
        const alreadyEnrolled = enrolledData === true || enrolledData === 'true'

        if (!alreadyEnrolled) {
          await enrollmentApi.join(courseId)
        }
        sessionStorage.setItem(enrollStorageKey, 'done')
      } catch (error) {
        // Nếu backend báo conflict (đã tồn tại) thì đánh dấu done để không gọi lại
        if (error?.response?.status === 409) {
          sessionStorage.setItem(enrollStorageKey, 'done')
        } else {
          sessionStorage.removeItem(enrollStorageKey)
        }
      } finally {
        if (!cancelled) setEnrolling(false)
      }
    }
    autoEnroll()
    return () => { cancelled = true }
  }, [isError, courseId, enrollStorageKey])

  return (
    <div className="payment-success-page">
      <Header />
      <main className="payment-success-main">
        <div className={`payment-success-card ${isError ? 'payment-success-card--error' : ''}`}>
          {isError ? (
            <>
              <div className="payment-success-icon payment-success-icon--error">!</div>
              <h1>Thanh toán chưa thành công</h1>
              <p>
                {message || 'Giao dịch bị từ chối. Vui lòng thử lại hoặc liên hệ MoMo để biết thêm chi tiết.'}
              </p>
              <p className="payment-success-hint">
                Trong MoMo Sandbox, lỗi &quot;Declined due to general reasons&quot; thường do: tài khoản test, giới hạn sandbox, hoặc cấu hình ví test. Bạn có thể thử lại hoặc kiểm tra tài liệu MoMo Sandbox.
              </p>
              <div className="payment-success-actions">
                <Link to="/courses" className="payment-success-btn payment-success-btn-primary">
                  Chọn khóa học khác
                </Link>
                {courseId && (
                  <Link to={`/payment?courseId=${courseId}`} className="payment-success-btn payment-success-btn-ghost">
                    Thử thanh toán lại
                  </Link>
                )}
                <Link to="/" className="payment-success-btn payment-success-btn-ghost">
                  Về trang chủ
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="payment-success-icon">✓</div>
              <h1>Thanh toán thành công</h1>
              <p>Bạn đã thanh toán qua MoMo. Khóa học đã được kích hoạt trong tài khoản của bạn.</p>
              {enrolling && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Đang ghi danh khóa học...</p>}
              <div className="payment-success-actions">
                <Link
                  to="/my-learning"
                  className="payment-success-btn payment-success-btn-primary"
                >
                  Vào My Learning
                </Link>
                {courseId && (
                  <Link to={`/courses?highlight=${courseId}`} className="payment-success-btn payment-success-btn-ghost">
                    Xem khóa học
                  </Link>
                )}
                <Link to="/" className="payment-success-btn payment-success-btn-ghost">
                  Về trang chủ
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default PaymentSuccess
