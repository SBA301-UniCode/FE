import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-icon">&lt;/&gt;</span> UniCode.com
          </Link>
          <p className="footer-desc">
            Nền tảng học trực tuyến hàng đầu với các khóa học chất lượng cao từ các giảng viên uy tín.
          </p>
        </div>

        <div>
          <h4 className="footer-col-title">Khám phá</h4>
          <ul className="footer-links">
            <li><Link to="/courses" className="footer-link">Tất cả khóa học</Link></li>
            <li><Link to="/verify-certificate" className="footer-link">Xác minh chứng chỉ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-col-title">Cộng đồng</h4>
          <ul className="footer-links">
            <li><a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Blog</a></li>
            <li><a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Diễn đàn</a></li>
            <li><a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Hỗ trợ</a></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-col-title">Thông tin</h4>
          <ul className="footer-links">
            <li><a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Về chúng tôi</a></li>
            <li><a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Điều khoản</a></li>
            <li><a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Chính sách bảo mật</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copyright">© {new Date().getFullYear()} UniCode. All rights reserved.</span>
        <div className="footer-social">
          <a href="#" className="footer-social-link" aria-label="Facebook" onClick={(e) => e.preventDefault()}>f</a>
          <a href="#" className="footer-social-link" aria-label="YouTube" onClick={(e) => e.preventDefault()}>▶</a>
          <a href="#" className="footer-social-link" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}>in</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
