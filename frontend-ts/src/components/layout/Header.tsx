import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useTranslation } from 'react-i18next'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/courses?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')
  }

  const primaryRole = user?.roles?.[0]
  const roleCode = primaryRole?.roleCode || 'LEARNER'
  const roleLabel = roleCode === 'ADMIN' ? t('header.role.admin') : roleCode === 'INSTRUCTOR' ? t('header.role.instructor') : t('header.role.learner')
  const isLecturer = roleCode === 'INSTRUCTOR'
  const isAdmin = roleCode === 'ADMIN'
  const hasRoleSidebar = isAuthenticated

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (hasRoleSidebar) document.body.classList.add('with-role-sidebar')
    else document.body.classList.remove('with-role-sidebar')
    return () => document.body.classList.remove('with-role-sidebar')
  }, [hasRoleSidebar])

  const roleMenuItems = isAdmin
    ? [
      { to: '/courses', label: t('header.courses') || 'Overview', icon: '🏠' },
      { to: '/admin', label: t('header.adminPanel') || 'System Management', icon: '🛡️' },
      { to: '/my-courses', label: t('header.management') || 'Course Management', icon: '📚' },
      { to: '/syllabuses', label: t('header.syllabuses') || 'Syllabus', icon: '🧾' },
      { to: '/verify-content', label: t('header.verifyContent') || 'Content Verification', icon: '✅' },
    ]
    : isLecturer
      ? [
        { to: '/courses', label: t('header.courses') || 'Overview', icon: '🏠' },
        { to: '/my-courses', label: t('header.management') || 'Course Management', icon: '📚' },
        { to: '/syllabuses', label: t('header.syllabuses') || 'Syllabus', icon: '🧾' },
        { to: '/verify-content', label: t('header.verifyContent') || 'Content Verification', icon: '✅' },
      ]
      : [
        { to: '/courses', label: t('header.courses') || 'Overview', icon: '🏠' },
        { to: '/my-learning', label: t('header.myLearning') || 'Khóa học của tôi', icon: '📚' },
        { to: '/my-certificates', label: t('header.certificates') || 'Chứng chỉ', icon: '📜' }
      ]

  const roleBadgeColors: Record<string, string> = {
    learner: 'bg-blue-50 text-blue-800',
    instructor: 'bg-green-50 text-green-800',
    admin: 'bg-orange-50 text-orange-800',
  }

  const NavLink = ({ to, children }: { to: string; children: ReactNode }) => (
    <Link
      to={to}
      className="px-3 py-2 rounded-[var(--radius-btn)] text-sm font-semibold text-text-secondary no-underline transition-colors hover:bg-[rgba(0,86,210,0.06)] hover:text-primary-500"
    >
      {children}
    </Link>
  )

  const DropdownItem = ({ to, onClick, children, className = '' }: { to?: string; onClick?: () => void; children: ReactNode; className?: string }) => {
    const base = 'block w-full px-4 py-2.5 text-left text-sm text-text-secondary no-underline bg-transparent border-none cursor-pointer font-[inherit] transition-colors hover:bg-[#F5F7F8]'
    if (to) {
      return <Link to={to} className={`${base} ${className}`} onClick={onClick}>{children}</Link>
    }
    return <button type="button" className={`${base} ${className}`} onClick={onClick}>{children}</button>
  }

  return (
    <header className="sticky top-0 z-100 bg-white border-b border-border-medium shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-primary-500 font-bold text-xl no-underline whitespace-nowrap hover:text-primary-600">
          <span className="text-[1.35rem] text-primary-500">&lt;/&gt;</span>
          <span>UniCode.com</span>
        </Link>

        {/* Search */}
        {!hasRoleSidebar && (
          <div className="flex items-center gap-1.5 bg-[#F5F7F8] border border-border-medium rounded-full px-3 py-1.5 flex-1 max-w-[420px] transition-all focus-within:border-primary-500 focus-within:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]">
            <span className="text-[0.9rem] leading-none shrink-0">🔍</span>
            <input
              type="text"
              className="border-none bg-transparent outline-none text-[0.9rem] font-[inherit] text-text-main w-full py-0.5 placeholder:text-text-muted"
              placeholder={t('header.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            {searchQuery && (
              <button
                className="bg-transparent border-none text-text-muted cursor-pointer text-[0.85rem] p-0.5 leading-none shrink-0 hover:text-text-main"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-wrap max-md:hidden">
          {!hasRoleSidebar && (
            <NavLink to="/courses">{t('header.courses')}</NavLink>
          )}
          {isAuthenticated ? (
            hasRoleSidebar ? null : isAdmin ? (
              <>
                <NavLink to="/admin">{t('header.adminPanel')}</NavLink>
                <NavLink to="/my-courses">{t('header.management')}</NavLink>
                <NavLink to="/syllabuses">{t('header.syllabuses')}</NavLink>
                <NavLink to="/verify-content">{t('header.verify')}</NavLink>
              </>
            ) : isLecturer ? (
              <>
                <NavLink to="/my-courses">{t('header.management')}</NavLink>
                <NavLink to="/syllabuses">{t('header.syllabuses')}</NavLink>
                <NavLink to="/verify-content">{t('header.verify')}</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/my-learning">{t('header.myLearning')}</NavLink>
                <NavLink to="/my-certificates">{t('header.certificates')}</NavLink>
              </>
            )
          ) : (
            <NavLink to="/verify-certificate">{t('header.verifyCert')}</NavLink>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          {!hasRoleSidebar && (
            <button
              type="button"
              onClick={toggleLang}
              className="px-2.5 py-1.5 rounded-full text-xs font-bold border border-border-medium bg-white cursor-pointer transition-all hover:bg-[#F5F7F8] hover:shadow-sm"
              title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              🌐 {i18n.language === 'vi' ? 'EN' : 'VN'}
            </button>
          )}

          {isAuthenticated ? (
            <>
              {/* User menu and actions replaced by Sidebar on desktop */}
              <div className="hidden max-md:flex items-center gap-3">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full border border-border-medium bg-[#F5F7F8] text-text-secondary cursor-pointer flex items-center justify-center transition-colors hover:bg-[#E8E8E8] hover:border-border-strong"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label={t('header.userMenu')}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute top-[calc(100%+8px)] right-0 min-w-[220px] bg-white rounded-[var(--radius-btn-lg)] shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-border-medium py-3 overflow-hidden z-[101]">
                    <div className="px-4 py-3 border-b border-border-subtle flex flex-col gap-1">
                      <strong className="text-text-main text-[0.95rem]">{user?.name || user?.email || 'User'}</strong>
                      <span className="text-xs text-text-muted">{user?.email}</span>
                      <span className="text-[0.75rem] text-text-dim">{t('header.role', { role: roleLabel })}</span>
                    </div>
                    <DropdownItem to="/courses" onClick={() => setShowUserMenu(false)}>{(isAdmin || isLecturer) ? t('header.dashboard') : t('header.courses')}</DropdownItem>
                    <DropdownItem to="/profile" onClick={() => setShowUserMenu(false)}>{t('header.profileLabel')}</DropdownItem>
                    <DropdownItem onClick={handleLogout} className="text-danger-500 font-semibold">{t('header.logout')}</DropdownItem>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-btn)] text-sm font-semibold no-underline cursor-pointer transition-all bg-transparent text-primary-500 border border-primary-500 hover:bg-[rgba(0,86,210,0.06)]"
              >
                {t('header.login')}
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            type="button"
            className="hidden max-md:flex w-10 h-10 rounded-[var(--radius-btn)] border border-border-medium bg-transparent text-text-secondary cursor-pointer items-center justify-center text-xl transition-colors shrink-0 hover:bg-[#F5F7F8]"
            onClick={() => setShowMobileMenu(true)}
            aria-label={t('header.openMenu')}
          >
            ☰
          </button>
        </div>
      </div>

      {hasRoleSidebar && (
        <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-[248px] bg-[linear-gradient(180deg,#ffffff_0%,#f9fafb_100%)] border-r border-border-medium shadow-[3px_0_14px_rgba(0,0,0,0.03)] z-[90] flex-col">
          <div className="px-4 pt-5 pb-4 border-b border-border-subtle bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full border border-border-medium bg-white flex items-center justify-center text-primary-500 font-bold shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[0.9rem] font-bold text-text-main leading-tight line-clamp-1">{user?.name || user?.email || 'User'}</span>
                <span className="text-[0.68rem] font-extrabold text-text-muted uppercase tracking-wider mt-0.5">{roleLabel}</span>
              </div>
            </div>

            <div className="mt-4 flex bg-[#F5F7F8] p-1 rounded-lg border border-border-medium shadow-inner">
              <button
                type="button"
                onClick={() => i18n.changeLanguage('vi')}
                className={`flex-1 py-1.5 rounded-[6px] text-[0.75rem] font-bold transition-all border-none cursor-pointer ${i18n.language === 'vi' ? 'bg-[#0052CC] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-text-muted hover:text-text-main'}`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => i18n.changeLanguage('en')}
                className={`flex-1 py-1.5 rounded-[6px] text-[0.75rem] font-bold transition-all border-none cursor-pointer ${i18n.language === 'en' ? 'bg-[#0052CC] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-text-muted hover:text-text-main'}`}
              >
                EN
              </button>
            </div>
          </div>
          <nav className="p-3 flex flex-col gap-1.5 overflow-y-auto">
            {roleMenuItems.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group px-3 py-2.5 rounded-xl no-underline text-[0.9rem] font-semibold transition-all flex items-center gap-2.5 ${active
                    ? 'bg-[rgba(0,86,210,0.06)] text-[#0052CC] border border-[rgba(0,86,210,0.15)] shadow-sm'
                    : 'text-text-secondary hover:bg-[#F5F7F8] hover:text-text-main border border-transparent'
                    }`}
                >
                  {/* Replaced item.icon with empty gap to match Image 1's no-icon minimalist list, OR just keep text alignment */}
                  <span className="opacity-90">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto p-4 border-t border-border-subtle bg-white">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-[8px] border border-border-medium bg-white text-text-secondary text-[0.85rem] font-semibold cursor-pointer transition-colors hover:bg-gray-50 hover:text-red-500 flex justify-center items-center gap-2"
            >
              Log out
            </button>
          </div>
        </aside>
      )}

      {/* Overlays */}
      {showRoleMenu && <div className="fixed inset-0 z-[99]" onClick={() => setShowRoleMenu(false)} aria-hidden />}
      {showUserMenu && <div className="fixed inset-0 z-[99]" onClick={() => setShowUserMenu(false)} aria-hidden />}

      {/* Mobile nav */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[199]" onClick={() => setShowMobileMenu(false)} />
          <nav className={`fixed top-0 right-0 w-[280px] h-screen bg-white border-l border-border-medium shadow-[-4px_0_30px_rgba(0,0,0,0.1)] z-[200] p-5 flex flex-col gap-1 overflow-y-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showMobileMenu ? 'translate-x-0' : 'translate-x-full'}`}>
            <button
              type="button"
              className="self-end w-9 h-9 rounded-[var(--radius-btn)] border border-border-medium bg-transparent text-text-secondary cursor-pointer flex items-center justify-center text-lg mb-3"
              onClick={() => setShowMobileMenu(false)}
            >
              ✕
            </button>

            <MobileNavLink to="/courses" onClick={() => setShowMobileMenu(false)}>{(isAdmin || isLecturer) ? t('header.dashboard') : t('header.courses')}</MobileNavLink>
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <MobileNavLink to="/admin" onClick={() => setShowMobileMenu(false)}>{t('header.adminPanel')}</MobileNavLink>
                    <MobileNavLink to="/my-courses" onClick={() => setShowMobileMenu(false)}>{t('header.management')}</MobileNavLink>
                    <MobileNavLink to="/syllabuses" onClick={() => setShowMobileMenu(false)}>{t('header.syllabuses')}</MobileNavLink>
                    <MobileNavLink to="/verify-content" onClick={() => setShowMobileMenu(false)}>{t('header.verify')}</MobileNavLink>
                  </>
                )}
                {isLecturer && !isAdmin && (
                  <>
                    <MobileNavLink to="/my-courses" onClick={() => setShowMobileMenu(false)}>{t('header.management')}</MobileNavLink>
                    <MobileNavLink to="/syllabuses" onClick={() => setShowMobileMenu(false)}>{t('header.syllabuses')}</MobileNavLink>
                    <MobileNavLink to="/verify-content" onClick={() => setShowMobileMenu(false)}>{t('header.verify')}</MobileNavLink>
                  </>
                )}
                {!isLecturer && !isAdmin && (
                  <>
                    <MobileNavLink to="/my-learning" onClick={() => setShowMobileMenu(false)}>{t('header.myLearning')}</MobileNavLink>
                    <MobileNavLink to="/my-certificates" onClick={() => setShowMobileMenu(false)}>{t('header.certificates')}</MobileNavLink>
                  </>
                )}
                <div className="h-px bg-border-subtle my-2" />
                <button
                  type="button"
                  className="block text-red-300 border-none bg-transparent text-left cursor-pointer font-[inherit] px-3 py-2.5 rounded-[var(--radius-btn)] text-[0.95rem] font-semibold transition-colors hover:bg-[rgba(0,86,210,0.06)] hover:text-primary-500"
                  onClick={handleLogout}
                >
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <MobileNavLink to="/login" onClick={() => setShowMobileMenu(false)}>{t('header.login')}</MobileNavLink>
            )}
          </nav>
        </>
      )}
    </header>
  )
}

const MobileNavLink = ({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) => (
  <Link
    to={to}
    className="block text-text-secondary no-underline px-3 py-2.5 rounded-[var(--radius-btn)] text-[0.95rem] font-semibold transition-colors hover:bg-[rgba(0,86,210,0.06)] hover:text-primary-500"
    onClick={onClick}
  >
    {children}
  </Link>
)

export default Header
