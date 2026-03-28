import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'

const errorMessages: Record<string, string> = {
  google_login_failed: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
  missing_tokens: 'Không nhận được thông tin đăng nhập. Vui lòng thử lại.',
  oauth_principal_missing: 'Không nhận được thông tin từ Google. Vui lòng thử lại.',
  token_generation_failed: 'Không thể tạo token đăng nhập. Vui lòng thử lại.',
  user_not_found: 'Tài khoản không tồn tại hoặc đã bị xóa.',
  user_inactive: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
  role_not_found: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  invalid_login: 'Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.',
}

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated, user } = useAuth()
  const { t } = useTranslation()
  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/'
  const resolveDefaultAfterLogin = (roleCode?: string) => {
    if (roleCode === 'ADMIN' || roleCode === 'INSTRUCTOR') return '/courses'
    return returnTo
  }
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      const roleCode = (user?.roles as Array<{ roleCode?: string }> | undefined)?.[0]?.roleCode
      navigate(resolveDefaultAfterLogin(roleCode), { replace: true })
      return
    }
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(errorMessages[urlError] || 'Đã xảy ra lỗi. Vui lòng thử lại.')
      navigate('/login', { replace: true })
    }
    const savedUsername = localStorage.getItem('savedUsername')
    if (savedUsername) {
      setFormData((prev) => ({ ...prev, username: savedUsername }))
      setRememberMe(true)
    }
  }, [isAuthenticated, navigate, searchParams, user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
        if (rememberMe) localStorage.setItem('savedUsername', formData.username.trim())
        else localStorage.removeItem('savedUsername')
        const roleCode = (result.user?.roles as Array<{ roleCode?: string }> | undefined)?.[0]?.roleCode
        navigate(resolveDefaultAfterLogin(roleCode), { replace: true })
      } else {
        setError(result.error || 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } catch {
      setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth2/authorization/google`
  }

  return (
    <div className="w-full min-h-screen bg-bg-page flex items-center justify-center p-5 animate-[fadeIn_0.6s_ease-out]">
      <div className="grid grid-cols-2 w-full max-w-[1200px] min-h-[600px] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.1)] animate-[slideUp_0.6s_ease-out] max-md:grid-cols-1 max-md:max-w-[440px]">
        {/* Branding */}
        <div className="bg-[linear-gradient(135deg,#003E99_0%,#0056D2_50%,#1A73E8_100%)] text-white p-12 flex items-center relative overflow-hidden max-md:hidden">
          <div className="absolute -top-1/2 -right-[30%] w-[300px] h-[300px] rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-[40%] -left-[20%] w-[250px] h-[250px] rounded-full bg-white/[0.04]" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-extrabold bg-white/15 px-2.5 py-1.5 rounded-[10px]">&lt;/&gt;</span>
              <span className="text-xl font-extrabold tracking-tight">UniCode</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight m-0">Learn to Code.<br />Build Your Future.</h1>
            <p className="text-[0.95rem] leading-relaxed text-white/85 m-0 max-w-[340px]">Master programming with interactive courses, real-world projects, and guidance from industry experts.</p>
            <div className="flex gap-6">
              {[['500K+', 'ACTIVE LEARNERS'], ['850+', 'COURSES'], ['98%', 'SUCCESS RATE']].map(([v, l]) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-extrabold">{v}</span>
                  <span className="text-xs text-white/70 uppercase tracking-wide">{l}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {['☕ Java', '🐍 Python', '⚛️ React', '🟢 Node.js'].map((t) => (
                <span key={t} className="text-xs font-semibold bg-white/12 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white p-12 max-[480px]:p-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-[linear-gradient(135deg,#0056D2,#003E99)] bg-clip-text text-transparent mb-2 tracking-tight max-[480px]:text-[28px]">UniCode</h1>
            <p className="text-gray-500 text-base max-[480px]:text-sm">{t('login.title')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FormGroup label={t('login.email')} htmlFor="username">
              <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder={t('login.email')} required autoComplete="username" disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-[15px] transition-all bg-gray-50 font-[inherit] focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,86,210,0.1)] disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-gray-400" />
            </FormGroup>

            <FormGroup label={t('login.password')} htmlFor="password">
              <div className="relative flex items-center">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Nhập mật khẩu" required autoComplete="current-password" disabled={loading}
                  className="w-full px-4 py-3.5 pr-12 border-2 border-gray-200 rounded-xl text-[15px] transition-all bg-gray-50 font-[inherit] focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,86,210,0.1)] disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-gray-400" />
                <button type="button" className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-500 p-2 flex items-center justify-center rounded-lg transition-colors hover:text-primary-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowPassword(!showPassword)} aria-label="Hiện/Ẩn mật khẩu" disabled={loading}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>) : (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>)}
                  </svg>
                </button>
              </div>
              {error && <div className="mt-2 text-[0.86rem] font-semibold text-red-600">{error}</div>}
            </FormGroup>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 select-none">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={loading}
                  className="w-[18px] h-[18px] cursor-pointer accent-primary-500" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="text-primary-500 no-underline font-medium transition-colors hover:text-primary-600 hover:underline" onClick={(e) => e.preventDefault()}>Quên mật khẩu?</a>
            </div>

            <button type="submit" className="w-full py-4 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 font-[inherit] shadow-[0_4px_14px_rgba(0,86,210,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,86,210,0.25)] disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0" disabled={loading}>
              {loading ? (<><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>{t('login.loading')}</span></>) : (<span>{t('login.submit')}</span>)}
            </button>

            <div className="flex items-center text-center text-gray-400 text-sm my-2 before:content-[''] before:flex-1 before:border-b before:border-gray-200 after:content-[''] after:flex-1 after:border-b after:border-gray-200">
              <span className="px-4">Hoặc</span>
            </div>

            <button type="button" className="flex items-center justify-center gap-3 w-full py-3.5 bg-white border-2 border-gray-200 rounded-xl text-[15px] font-medium text-gray-700 cursor-pointer font-[inherit] transition-all hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-60 disabled:cursor-not-allowed" onClick={handleGoogleLogin} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>

            
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>{t('login.noAccount')} <Link to="/register" className="text-primary-500 no-underline font-semibold transition-colors hover:text-primary-600 hover:underline">{t('login.register')}</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

const FormGroup = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
)

export default Login
