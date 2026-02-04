import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated } = useAuth()
  const returnTo = location.state?.returnTo || '/dashboard'
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate(returnTo, { replace: true })
      return
    }

    // Check for error from URL params (Google login failure)
    const urlError = searchParams.get('error')
    if (urlError) {
      const errorMessages = {
        'google_login_failed': 'Đăng nhập Google thất bại. Vui lòng thử lại.',
        'missing_tokens': 'Không nhận được thông tin đăng nhập. Vui lòng thử lại.',
        'oauth_principal_missing': 'Không nhận được thông tin từ Google. Vui lòng thử lại.',
        'token_generation_failed': 'Không thể tạo token đăng nhập. Vui lòng thử lại.',
        'user_not_found': 'Tài khoản không tồn tại hoặc đã bị xóa.',
        'user_inactive': 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
        'role_not_found': 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
        'invalid_login': 'Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.'
      }
      
      setError(errorMessages[urlError] || 'Đã xảy ra lỗi. Vui lòng thử lại.')
      // Clear error from URL
      navigate('/login', { replace: true })
    }

    // Load saved username
    const savedUsername = localStorage.getItem('savedUsername')
    if (savedUsername) {
      setFormData(prev => ({ ...prev, username: savedUsername }))
      setRememberMe(true)
    }
  }, [isAuthenticated, navigate, searchParams])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // Clear error on input change
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.username.trim() || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin đăng nhập')
      return
    }

    setLoading(true)

    try {
      const result = await login(formData.username.trim(), formData.password, rememberMe)

      if (result.success) {
        // Save username if remember me is checked
        if (rememberMe) {
          localStorage.setItem('savedUsername', formData.username.trim())
        } else {
          localStorage.removeItem('savedUsername')
        }
        navigate(returnTo, { replace: true })
      } else {
        setError(result.error || 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } catch (err) {
      setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth2/authorization/google`
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="logo">UniCode</h1>
          <p className="subtitle">Chào mừng trở lại!</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập hoặc Email</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập hoặc email"
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Hiện/Ẩn mật khẩu"
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>
              Quên mật khẩu?
            </a>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <svg className="button-loader" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>

          <div className="divider">
            <span>Hoặc</span>
          </div>

          <button
            type="button"
            className="google-login-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Đăng nhập với Google</span>
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </form>

        <div className="login-footer">
          <p>Chưa có tài khoản? <a href="#" className="signup-link" onClick={(e) => e.preventDefault()}>Đăng ký ngay</a></p>
        </div>
      </div>
    </div>
  )
}

export default Login
