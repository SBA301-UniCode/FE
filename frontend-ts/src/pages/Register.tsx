import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '../api'
import { useTranslation } from 'react-i18next'

const Register = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError(t('register.errorName'))
    if (!email.trim()) return setError(t('register.errorEmail'))
    if (password.length < 6) return setError(t('register.errorPasswordMin'))
    if (password !== confirmPassword) return setError(t('register.errorPasswordMatch'))

    setLoading(true)
    try {
      await userApi.create({ name: name.trim(), email: email.trim(), password, roleCodes: new Set(['LEARNER']) } as unknown as Parameters<typeof userApi.create>[0])
      navigate('/login', { state: { registered: true } })
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string; errorCode?: string } }; message?: string }
      const msg = axErr.response?.data?.message || axErr.response?.data?.errorCode || axErr.message || t('register.errorFailed')
      if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate')) {
        setError(t('register.errorDuplicate'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' }
    if (password.length < 6) return { level: 1, text: t('register.strengthWeak'), color: '#dc2626' }
    if (password.length < 10 && /^[a-zA-Z]+$/.test(password)) return { level: 2, text: t('register.strengthMedium'), color: '#d97706' }
    if (password.length >= 10 || /(?=.*[0-9])(?=.*[a-zA-Z])/.test(password)) return { level: 3, text: t('register.strengthStrong'), color: '#16a34a' }
    return { level: 2, text: t('register.strengthMedium'), color: '#d97706' }
  }
  const strength = getPasswordStrength()

  const inputCls = "w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-[15px] transition-all bg-gray-50 font-[inherit] focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,86,210,0.1)] disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-gray-400"

  return (
    <div className="w-full min-h-screen bg-bg-page flex items-center justify-center p-5 animate-[fadeIn_0.6s_ease-out]">
      <div className="grid grid-cols-2 w-full max-w-[1200px] min-h-[600px] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.1)] max-md:grid-cols-1 max-md:max-w-[440px]">
        {/* Branding */}
        <div className="bg-[linear-gradient(135deg,#003E99_0%,#0056D2_50%,#1A73E8_100%)] text-white p-12 flex items-center relative overflow-hidden max-md:hidden">
          <div className="absolute -top-1/2 -right-[30%] w-[300px] h-[300px] rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-[40%] -left-[20%] w-[250px] h-[250px] rounded-full bg-white/[0.04]" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-extrabold bg-white/15 px-2.5 py-1.5 rounded-[10px]">&lt;/&gt;</span>
              <span className="text-xl font-extrabold tracking-tight">UniCode</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight m-0">Start Your<br />Journey Today.</h1>
            <p className="text-[0.95rem] leading-relaxed text-white/85 m-0 max-w-[340px]">Join 500,000+ learners mastering programming skills with interactive courses and real-world projects.</p>
            <div className="flex gap-6">
              {[['500K+', 'Active Learners'], ['850+', 'Courses'], ['Free', 'Certificates']].map(([v, l]) => (
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
            <h1 className="text-4xl font-bold bg-[linear-gradient(135deg,#0056D2,#003E99)] bg-clip-text text-transparent mb-2 tracking-tight">{t('register.title')}</h1>
            <p className="text-gray-500 text-base">{t('register.subtitle')}</p>
          </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-name" className="text-sm font-medium text-gray-700">{t('register.name')}</label>
              <input id="reg-name" type="text" placeholder={t('register.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} disabled={loading} autoComplete="name" className={inputCls} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">{t('register.email')}</label>
              <input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" className={inputCls} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">{t('register.password')}</label>
              <div className="relative flex items-center">
                <input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder={t('register.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="new-password" className={`${inputCls} pr-12`} />
                <button type="button" className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-500 p-2 flex items-center justify-center rounded-lg transition-colors hover:text-primary-500 hover:bg-gray-100" onClick={() => setShowPassword(!showPassword)} disabled={loading} tabIndex={-1}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>) : (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>)}
                  </svg>
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(strength.level / 3) * 100}%`, background: strength.color }} />
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: strength.color }}>{strength.text}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-confirm" className="text-sm font-medium text-gray-700">{t('register.confirm')}</label>
              <input id="reg-confirm" type={showPassword ? 'text' : 'password'} placeholder={t('register.confirmPlaceholder')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} autoComplete="new-password" className={inputCls} />
              {confirmPassword && password !== confirmPassword && (
                <span className="block mt-1 text-xs text-red-600 font-medium">{t('register.passwordMismatch')}</span>
              )}
            </div>

            <button type="submit" className="w-full py-4 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 font-[inherit] shadow-[0_4px_14px_rgba(0,86,210,0.25)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed" disabled={loading}>
              {loading ? (<><span>⏳</span> {t('register.loading')}</>) : t('register.submit')}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>{t('register.hasAccount')} <Link to="/login" className="text-primary-500 no-underline font-semibold transition-colors hover:text-primary-600 hover:underline">{t('register.login')}</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
