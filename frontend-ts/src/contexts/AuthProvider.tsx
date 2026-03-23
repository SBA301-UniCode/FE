import { useEffect, useState, type ReactNode } from 'react'
import { authApi, userApi } from '../api'
import { AuthContext, type AuthContextType } from './authContext'
import type { User } from '../types'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchUser = async () => {
    try {
      const res = await userApi.getMe()
      const data = res.data?.data ?? res.data
      setUser(data as User)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (token) {
      setIsAuthenticated(true)
      fetchUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false)
      setUser(null)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login: AuthContextType['login'] = async (username, password, rememberMe) => {
    try {
      const res = await authApi.login(username, password)
      const data = res.data?.data ?? res.data
      const { accessToken, refreshToken } = data as { accessToken: string; refreshToken: string }

      if (rememberMe) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
      } else {
        sessionStorage.setItem('accessToken', accessToken)
        sessionStorage.setItem('refreshToken', refreshToken)
      }

      setIsAuthenticated(true)
      await fetchUser()
      return { success: true }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string; errorCode?: string } } }
      return {
        success: false,
        error:
          axiosError.response?.data?.message ||
          axiosError.response?.data?.errorCode ||
          'Đăng nhập thất bại. Vui lòng thử lại.',
      }
    }
  }

  const handleGoogleCallback = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setIsAuthenticated(true)
    await fetchUser()
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    setIsAuthenticated(false)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    handleGoogleCallback,
    logout,
    refreshUser: fetchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
