import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

const normalizeRole = (role) => String(role || '').trim().toUpperCase()

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/' }) => {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--bg-page)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Đang tải...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const accepted = new Set(allowedRoles.map(normalizeRole))
    const userRoles = Array.isArray(user?.roles)
      ? user.roles.map((r) => normalizeRole(r?.roleCode || r?.roleName || r))
      : []
    const hasPermission = userRoles.some((role) => accepted.has(role))
    if (!hasPermission) {
      return <Navigate to={redirectTo} replace />
    }
  }

  return children
}

export default ProtectedRoute
