import { Link, useSearchParams, Navigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import './PaymentSuccess.css'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const demo = searchParams.get('demo') === '1'
  const noRedirect = searchParams.get('noRedirect') === '1'
  const status = searchParams.get('status') || searchParams.get('statusPayment') || ''
  const message = searchParams.get('message') || searchParams.get('msg') || ''
  const resultCode = searchParams.get('resultCode')
  const isResultError = resultCode !== null && resultCode !== undefined && String(resultCode) !== '0'

  const isError = !demo && (
    status.toUpperCase() === 'ERROR' ||
    isResultError ||
    (message && message.toLowerCase().includes('declined'))
  )

  if (!isError && !noRedirect) {
    const target = courseId ? `/my-learning?purchased=${encodeURIComponent(courseId)}` : '/my-learning'
    return <Navigate to={target} replace />
  }

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
          ) : !isError ? (
            <>
              <div className="payment-success-icon">✓</div>
              <h1>Thanh toán thành công</h1>
              {demo ? (
                <p>Bạn đã dùng chế độ demo Sandbox (coi như đã thanh toán). Khóa học được ghi nhận chỉ trên trình duyệt này để bạn trải nghiệm.</p>
              ) : (
                <p>Khóa học đã được kích hoạt. Bạn sẽ được chuyển đến trang Khóa học đã mua.</p>
              )}
              <div className="payment-success-actions">
                <Link to={courseId ? `/my-learning?purchased=${encodeURIComponent(courseId)}` : '/my-learning'} className="payment-success-btn payment-success-btn-primary">
                  {courseId ? 'Vào trang Khóa học đã mua' : 'Xem khóa học đã mua'}
                </Link>
                <Link to="/" className="payment-success-btn payment-success-btn-ghost">
                  Về trang chủ
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default PaymentSuccess
