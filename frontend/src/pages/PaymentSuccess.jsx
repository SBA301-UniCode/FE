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
        if (!alreadyEnrolled) await enrollmentApi.join(courseId)
        sessionStorage.setItem(enrollStorageKey, 'done')
      } catch (error) {
        if (error?.response?.status === 409) {
          sessionStorage.setItem(enrollStorageKey, 'done')
        } else {
          sessionStorage.removeItem(enrollStorageKey)
        }
      } finally { if (!cancelled) setEnrolling(false) }
    }
    autoEnroll()
    return () => { cancelled = true }
  }, [isError, courseId, enrollStorageKey])

  return (
    <div className="ps-page">
      <Header />
      <main className="ps-main">
        {/* Confetti decoration for success */}
        {!isError && <div className="ps-confetti" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="ps-confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              background: ['#0056D2','#16a34a','#d97706','#dc2626','#8b5cf6','#ec4899'][i % 6],
            }} />
          ))}
        </div>}

        <div className={`ps-card ${isError ? 'ps-card--error' : 'ps-card--success'}`}>
          {isError ? (
            <>
              <div className="ps-icon ps-icon--error">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <h1 className="ps-title">Thanh toán chưa thành công</h1>
              <p className="ps-desc">{message || 'Giao dịch bị từ chối. Vui lòng thử lại hoặc liên hệ hỗ trợ.'}</p>
              <p className="ps-hint">
                Trong MoMo Sandbox, lỗi thường do: tài khoản test, giới hạn sandbox, hoặc cấu hình ví test.
              </p>
              <div className="ps-actions">
                {courseId && (
                  <Link to={`/payment?courseId=${courseId}`} className="ps-btn ps-btn-primary">
                    🔄 Thử thanh toán lại
                  </Link>
                )}
                <Link to="/courses" className="ps-btn ps-btn-ghost">
                  Chọn khóa học khác
                </Link>
                <Link to="/" className="ps-btn ps-btn-ghost">
                  Về trang chủ
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="ps-icon ps-icon--success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h1 className="ps-title">Payment Successful! 🎉</h1>
              <p className="ps-desc">Bạn đã thanh toán thành công. Khóa học đã sẵn sàng trong tài khoản.</p>
              {enrolling && <p className="ps-enrolling">Đang ghi danh khóa học...</p>}
              <div className="ps-what-next">
                <h3>What&apos;s next?</h3>
                <div className="ps-steps">
                  <div className="ps-step">
                    <span className="ps-step-num">1</span>
                    <span>Truy cập khóa học trong My Learning</span>
                  </div>
                  <div className="ps-step">
                    <span className="ps-step-num">2</span>
                    <span>Bắt đầu học và theo dõi tiến trình</span>
                  </div>
                  <div className="ps-step">
                    <span className="ps-step-num">3</span>
                    <span>Hoàn thành 100% để nhận chứng chỉ</span>
                  </div>
                </div>
              </div>
              <div className="ps-actions">
                <Link to="/my-learning" className="ps-btn ps-btn-primary">
                  📚 Vào My Learning
                </Link>
                {courseId && (
                  <Link to={`/courses/${courseId}`} className="ps-btn ps-btn-ghost">
                    Xem chi tiết khóa học
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default PaymentSuccess
