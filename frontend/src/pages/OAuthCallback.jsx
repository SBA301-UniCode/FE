import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import './OAuthCallback.css'

const OAuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleGoogleCallback } = useAuth()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const error = searchParams.get('error')

    if (error) {
      // Handle error
      navigate('/login?error=' + error, { replace: true })
      return
    }

    if (accessToken && refreshToken) {
      // Handle successful login
      handleGoogleCallback(accessToken, refreshToken)
      navigate('/dashboard', { replace: true })
    } else {
      // Missing tokens, redirect to login
      navigate('/login?error=missing_tokens', { replace: true })
    }
  }, [searchParams, navigate, handleGoogleCallback])

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        <div className="loading-spinner">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="loading-message">Đang xử lý đăng nhập Google...</p>
      </div>
    </div>
  )
}

export default OAuthCallback
