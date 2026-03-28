import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'

const OAuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleGoogleCallback, user } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    const resolveByRole = (role?: string) => {
      const r = String(role || '').toUpperCase()
      if (r === 'ADMIN' || r === 'INSTRUCTOR') return '/courses'
      if (r === 'LEARNER') return '/my-learning'
      return '/'
    }
    const run = async () => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const role = searchParams.get('role')
    const error = searchParams.get('error')

    if (error) {
      navigate('/login?error=' + error, { replace: true })
      return
    }

    if (accessToken && refreshToken) {
      await handleGoogleCallback(accessToken, refreshToken)
      const roleFromUser = (user?.roles as Array<{ roleCode?: string }> | undefined)?.[0]?.roleCode
      navigate(resolveByRole(role || roleFromUser), { replace: true })
    } else {
      navigate('/login?error=missing_tokens', { replace: true })
    }
    }
    run().catch(() => navigate('/login?error=google_login_failed', { replace: true }))
  }, [searchParams, navigate, handleGoogleCallback, user])

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-page">
      <div className="text-center p-8">
        <div className="animate-spin inline-block text-primary-500">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="mt-4 text-text-muted text-base">{t('oauth.processing')}</p>
      </div>
    </div>
  )
}

export default OAuthCallback
