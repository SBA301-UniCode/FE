import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '../api'
import './Login.css'

const Register = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Vui lòng nhập họ tên.')
    if (!email.trim()) return setError('Vui lòng nhập email.')
    if (password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.')
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận không khớp.')

    setLoading(true)
    try {
      await userApi.create({
        name: name.trim(),
        email: email.trim(),
        password,
        roleCodes: ['LEARNER'],
      })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errorCode ||
        err.message ||
        'Đăng ký thất bại.'
      if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
        setError('Email này đã được sử dụng. Vui lòng dùng email khác.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' }
    if (password.length < 6) return { level: 1, text: 'Yếu', color: '#dc2626' }
    if (password.length < 10 && /^[a-zA-Z]+$/.test(password)) return { level: 2, text: 'Trung bình', color: '#d97706' }
    if (password.length >= 10 || /(?=.*[0-9])(?=.*[a-zA-Z])/.test(password)) return { level: 3, text: 'Mạnh', color: '#16a34a' }
    return { level: 2, text: 'Trung bình', color: '#d97706' }
  }

  const strength = getPasswordStrength()

  return (
    <div className="login-container">
      <div className="login-split">
        <div className="login-branding">
          <div className="login-branding-content">
            <div className="login-branding-logo">
              <span className="login-branding-logo-icon">&lt;/&gt;</span>
              <span className="login-branding-logo-text">UniCode</span>
            </div>
            <h1 className="login-branding-title">Start Your<br />Journey Today.</h1>
            <p className="login-branding-desc">
              Join 500,000+ learners mastering programming skills with interactive courses and real-world projects.
            </p>
            <div className="login-branding-stats">
              <div className="login-branding-stat">
                <span className="login-branding-stat-value">500K+</span>
                <span className="login-branding-stat-label">Active Learners</span>
              </div>
              <div className="login-branding-stat">
                <span className="login-branding-stat-value">850+</span>
                <span className="login-branding-stat-label">Courses</span>
              </div>
              <div className="login-branding-stat">
                <span className="login-branding-stat-value">Free</span>
                <span className="login-branding-stat-label">Certificates</span>
              </div>
            </div>
            <div className="login-branding-techs">
              <span>☕ Java</span>
              <span>🐍 Python</span>
              <span>⚛️ React</span>
              <span>🟢 Node.js</span>
            </div>
          </div>
        </div>
        <div className="login-card">
          <div className="login-header">
            <h1 className="logo">Tạo tài khoản</h1>
            <p className="subtitle">Bắt đầu hành trình học tập của bạn</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="reg-name">Họ và tên</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Nhập họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Mật khẩu</label>
              <div className="password-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ít nhất 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {password && (
                <div className="password-strength">
                  <div className="password-strength-bar">
                    <div className="password-strength-fill" style={{ width: `${(strength.level / 3) * 100}%`, background: strength.color }} />
                  </div>
                  <span className="password-strength-text" style={{ color: strength.color }}>{strength.text}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Xác nhận mật khẩu</label>
              <div className="password-input-wrapper">
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span className="password-mismatch">Mật khẩu không khớp</span>
              )}
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="button-loader">⏳</span> Đang đăng ký...
                </>
              ) : (
                'Tạo tài khoản miễn phí'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Đã có tài khoản? <Link to="/login" className="signup-link">Đăng nhập</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
