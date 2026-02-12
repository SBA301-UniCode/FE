import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import './Header.css'

const ROLE_LABELS = {
  ADMIN: 'Admin',
  INSTRUCTOR: 'Lecturer',
  LEARNER: 'Student',
}

const Header = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const primaryRole = user?.roles?.[0]
  const roleCode = primaryRole?.roleCode || 'LEARNER'
  const roleLabel = ROLE_LABELS[roleCode] ?? roleCode

  const isLecturer = roleCode === 'INSTRUCTOR'
  const isAdmin = roleCode === 'ADMIN'

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="header-logo-icon">&lt;/&gt;</span>
          <span>UniCode.com</span>
        </Link>

        <nav className="header-nav">
          <Link to="/courses" className="header-nav-link">Courses</Link>
          {isAuthenticated ? (
            isLecturer || isAdmin ? (
              <>
                <Link to="/dashboard" className="header-nav-link">Dashboard</Link>
                <Link to="/my-courses" className="header-nav-link">My Courses</Link>
                <Link to="/dashboard" className="header-nav-link">Students</Link>
                <Link to="/dashboard" className="header-nav-link">Analytics</Link>
                <Link to="/dashboard" className="header-nav-link">Earnings</Link>
              </>
            ) : (
              <>
                <Link to="/my-learning" className="header-nav-link">My Learning</Link>
                <Link to="/dashboard" className="header-nav-link">Exercises</Link>
                <Link to="/courses" className="header-nav-link">Progress</Link>
              </>
            )
          ) : (
            <>
              <Link to="/my-learning" className="header-nav-link">My Learning</Link>
              <a href="#exercises" className="header-nav-link">Exercises</a>
              <Link to="/courses" className="header-nav-link">Progress</Link>
            </>
          )}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <div className="header-role-wrapper">
                <button
                  type="button"
                  className={`header-role-badge ${roleCode.toLowerCase()}`}
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  aria-expanded={showRoleMenu}
                >
                  {roleLabel}
                </button>
                {showRoleMenu && (
                  <div className="header-role-dropdown">
                    <div className="header-role-dropdown-title">
                      Current Role {roleLabel}
                    </div>
                    <button type="button" className="header-role-dropdown-close" onClick={() => setShowRoleMenu(false)}>
                      Đóng
                    </button>
                  </div>
                )}
              </div>
              {isLecturer && (
                <Link to="/my-courses" className="header-btn header-btn-primary">
                  <span className="header-btn-icon">+</span> Create Course
                </Link>
              )}
              {!isLecturer && (
                <Link to="/dashboard" className="header-btn header-btn-browse">
                  <span className="header-btn-icon">📖</span> Browse Courses
                </Link>
              )}
              <div className="header-user-wrapper">
                <button
                  type="button"
                  className="header-user-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="Menu người dùng"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="header-user-dropdown">
                    <div className="header-user-info">
                      <strong>{user?.name || user?.email || 'User'}</strong>
                      <span>{user?.email}</span>
                      <span className="header-user-role">Role: {roleLabel}</span>
                    </div>
                    <Link to="/dashboard" className="header-user-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      Dashboard
                    </Link>
                    <button type="button" className="header-user-dropdown-item header-user-logout" onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="header-btn header-btn-student">
                Đăng nhập
              </Link>
              <Link to="/courses" className="header-btn header-btn-browse">
                <span className="header-btn-icon">📖</span> Browse Courses
              </Link>
            </>
          )}
        </div>
      </div>
      {showRoleMenu && <div className="header-overlay" onClick={() => setShowRoleMenu(false)} aria-hidden />}
      {showUserMenu && <div className="header-overlay" onClick={() => setShowUserMenu(false)} aria-hidden />}
    </header>
  )
}

export default Header
