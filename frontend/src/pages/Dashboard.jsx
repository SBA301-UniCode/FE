import { useAuth } from '../contexts/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!isAuthenticated) {
    return null
  }

  const roleLabel = user?.roles?.[0]?.roleName || user?.roles?.[0]?.roleCode || 'User'
  const roleCode = user?.roles?.[0]?.roleCode
  const isInstructor = roleCode === 'INSTRUCTOR'

  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard-main">
        <div className="dashboard-card">
          <h1 className="dashboard-title">UniCode</h1>
          <p className="dashboard-welcome">Chào mừng bạn đến với UniCode!</p>
          <p className="dashboard-sub">
            Bạn đã đăng nhập với vai trò <strong>{roleLabel}</strong>.
          </p>
          {user?.name && (
            <p className="dashboard-user">Xin chào, {user.name}!</p>
          )}
          {isInstructor && (
            <div className="dashboard-links">
              <Link to="/my-courses" className="dashboard-link-btn">
                Xem My Courses
              </Link>
            </div>
          )}
          <button onClick={handleLogout} className="dashboard-logout">
            Đăng xuất
          </button>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
