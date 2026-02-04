import { useEffect, useState } from 'react'
import { authApi, userApi } from '../api'
import { AuthContext } from './authContext'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchUser = async () => {
    try {
      const res = await userApi.getMe()
      const data = res.data?.data ?? res.data
      setUser(data)
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

  const login = async (username, password, rememberMe) => {
    try {
      const res = await authApi.login(username, password)
      const data = res.data?.data ?? res.data
      const { accessToken, refreshToken } = data

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
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.response?.data?.errorCode ||
          'Đăng nhập thất bại. Vui lòng thử lại.',
      }
    }
  }

  const handleGoogleCallback = async (accessToken, refreshToken) => {
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

  const value = {
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

