import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import type { ReactNode } from 'react'
import type { Role } from '../types'

const normalizeRole = (role: string | Role | undefined): string =>
  String(typeof role === 'object' ? role?.roleCode || role?.roleName : role || '').trim().toUpperCase()

interface Props {
  children: ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/' }: Props) => {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-bg-page">
        <div className="text-text-main text-lg">Đang tải...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const accepted = new Set(allowedRoles.map(normalizeRole))
    const userRoles = Array.isArray(user?.roles)
      ? user!.roles.map((r) => normalizeRole(r))
      : []
    const hasPermission = userRoles.some((role) => accepted.has(role))
    if (!hasPermission) return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
