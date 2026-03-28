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
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/courses?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

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

        {/* ── Coursera-style Search Bar ── */}
        <div className="header-search">
          <span className="header-search-icon">🔍</span>
          <input
            type="text"
            className="header-search-input"
            placeholder="Tìm khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
          {searchQuery && (
            <button
              className="header-search-clear"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="header-nav">
          <Link to="/courses" className="header-nav-link">Courses</Link>
          {isAuthenticated ? (
            isAdmin ? (
              <>
                <Link to="/admin" className="header-nav-link">Admin Panel</Link>
                <Link to="/my-courses" className="header-nav-link">My Courses</Link>
                <Link to="/syllabuses" className="header-nav-link">Syllabuses</Link>
                <Link to="/verify-content" className="header-nav-link">🛡️ Verify</Link>
              </>
            ) : isLecturer ? (
              <>
                <Link to="/my-courses" className="header-nav-link">My Courses</Link>
                <Link to="/syllabuses" className="header-nav-link">Syllabuses</Link>
                <Link to="/verify-content" className="header-nav-link">🛡️ Verify</Link>
              </>
            ) : (
              <>
                <Link to="/my-learning" className="header-nav-link">My Learning</Link>
                <Link to="/my-certificates" className="header-nav-link">Certificates</Link>
              </>
            )
          ) : (
            <>
              <Link to="/verify-certificate" className="header-nav-link">Verify Certificate</Link>
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
                <Link to="/courses" className="header-btn header-btn-browse">
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
                    <Link to="/courses" className="header-user-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      Courses
                    </Link>
                    {!isLecturer && !isAdmin && (
                      <Link
                        to="/my-certificates"
                        className="header-user-dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Certificates
                      </Link>
                    )}
                    {(isAdmin || isLecturer) && (
                      <Link
                        to="/verify-content"
                        className="header-user-dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        🛡️ Verify Content
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className="header-user-dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      👤 Hồ sơ
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
          <button
            type="button"
            className="header-hamburger"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </div>
      {showRoleMenu && <div className="header-overlay" onClick={() => setShowRoleMenu(false)} aria-hidden />}
      {showUserMenu && <div className="header-overlay" onClick={() => setShowUserMenu(false)} aria-hidden />}

      {/* Mobile nav panel */}
      {showMobileMenu && (
        <>
          <div className="header-mobile-overlay" onClick={() => setShowMobileMenu(false)} />
          <nav className={`header-mobile-nav ${showMobileMenu ? 'header-mobile-nav--open' : ''}`}>
            <button
              type="button"
              className="header-mobile-nav-close"
              onClick={() => setShowMobileMenu(false)}
            >
              ✕
            </button>
            <Link to="/courses" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>Courses</Link>
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/admin" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>Admin Panel</Link>
                    <Link to="/my-courses" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>My Courses</Link>
                    <Link to="/syllabuses" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>Syllabuses</Link>
                    <Link to="/verify-content" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>🛡️ Verify</Link>
                  </>
                )}
                {isLecturer && !isAdmin && (
                  <>
                    <Link to="/my-courses" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>My Courses</Link>
                    <Link to="/syllabuses" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>Syllabuses</Link>
                    <Link to="/verify-content" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>🛡️ Verify</Link>
                  </>
                )}
                {!isLecturer && !isAdmin && (
                  <>
                    <Link to="/my-learning" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>My Learning</Link>
                    <Link to="/my-certificates" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>Certificates</Link>
                  </>
                )}
                <div className="header-mobile-divider" />
                <button type="button" className="header-mobile-nav-link" style={{ color: '#fca5a5', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }} onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="header-mobile-nav-link" onClick={() => setShowMobileMenu(false)}>Đăng nhập</Link>
              </>
            )}
          </nav>
        </>
      )}
    </header>
  )
}

export default Header
