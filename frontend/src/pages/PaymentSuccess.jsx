import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import './PaymentSuccess.css'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const status = searchParams.get('status') || searchParams.get('statusPayment') || ''
  const message = searchParams.get('message') || ''

  const isError = status.toUpperCase() === 'ERROR' || message.toLowerCase().includes('declined')

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
              <div className="payment-success-actions">
                <Link to="/dashboard" className="payment-success-btn payment-success-btn-primary">
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
