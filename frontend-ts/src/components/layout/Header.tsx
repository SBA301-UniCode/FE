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
  const [hideRoleSidebar, setHideRoleSidebar] = useState(false)
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
  const setLang = (lang: 'vi' | 'en') => i18n.changeLanguage(lang)

  const primaryRole = user?.roles?.[0]
  const roleCode = primaryRole?.roleCode || 'LEARNER'
  const roleLabel = roleCode === 'ADMIN' ? t('header.role.admin') : roleCode === 'INSTRUCTOR' ? t('header.role.instructor') : t('header.role.learner')
  const isLecturer = roleCode === 'INSTRUCTOR'
  const isAdmin = roleCode === 'ADMIN'
  const hasRoleSidebar = isAuthenticated && (isAdmin || isLecturer)
  const showDesktopRoleSidebar = hasRoleSidebar && !hideRoleSidebar

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (showDesktopRoleSidebar) document.body.classList.add('with-role-sidebar')
    else document.body.classList.remove('with-role-sidebar')
    return () => document.body.classList.remove('with-role-sidebar')
  }, [showDesktopRoleSidebar])

  const roleMenuItems: Array<{ to: string; labelKey: string; match?: (pathname: string, search: string) => boolean }> = [
    { to: '/courses', labelKey: 'header.dashboard' },
    ...(isAdmin
      ? [
          { to: '/admin?tab=users', labelKey: 'header.adminUsers', match: (pathname: string, search: string) => pathname === '/admin' && new URLSearchParams(search).get('tab') === 'users' },
          { to: '/admin?tab=roles', labelKey: 'header.adminRoles', match: (pathname: string, search: string) => pathname === '/admin' && new URLSearchParams(search).get('tab') === 'roles' },
          { to: '/admin?tab=privileges', labelKey: 'header.adminPrivileges', match: (pathname: string, search: string) => pathname === '/admin' && new URLSearchParams(search).get('tab') === 'privileges' },
          { to: '/admin?tab=subscriptions', labelKey: 'header.adminPayments', match: (pathname: string, search: string) => pathname === '/admin' && new URLSearchParams(search).get('tab') === 'subscriptions' },
        ]
      : []),
    { to: '/my-courses', labelKey: 'header.management' },
    ...(!isAdmin ? [{ to: '/instructor/learners', labelKey: 'header.learnersManagement' }] : []),
    ...(isLecturer ? [{ to: '/syllabuses', labelKey: 'header.syllabuses' }] : []),
    { to: '/verify-content', labelKey: 'header.verify' },
  ]

  const roleBadgeColors: Record<string, string> = {
    learner: 'bg-blue-50 text-blue-800',
    instructor: 'bg-green-50 text-green-800',
    admin: 'bg-orange-50 text-orange-800',
  }

  const isPathActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`)

  const NavLink = ({ to, children }: { to: string; children: ReactNode }) => (
    <Link
      to={to}
      aria-current={isPathActive(to) ? 'page' : undefined}
      className={`px-3 py-2 rounded-[var(--radius-btn)] text-sm font-semibold no-underline transition-colors ${
        isPathActive(to)
          ? 'text-primary-600 bg-transparent shadow-[inset_0_-2px_0_0_#0056D2]'
          : 'text-text-secondary hover:bg-[rgba(0,86,210,0.06)] hover:text-primary-500'
      }`}
    >
      {children}
    </Link>
  )

  const MobileNavLink = ({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) => (
    <Link
      to={to}
      aria-current={isPathActive(to) ? 'page' : undefined}
      className={`block no-underline px-3 py-2.5 rounded-[var(--radius-btn)] text-[0.95rem] font-semibold transition-colors ${
        isPathActive(to)
          ? 'text-primary-600 bg-transparent shadow-[inset_0_-2px_0_0_#0056D2]'
          : 'text-text-secondary hover:bg-[rgba(0,86,210,0.06)] hover:text-primary-500'
      }`}
      onClick={onClick}
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
    <header className={`sticky top-0 z-100 bg-white border-b border-border-subtle shadow-[0_1px_6px_rgba(15,23,42,0.05)] ${showDesktopRoleSidebar ? 'md:h-0 md:min-h-0 md:border-b-0 md:shadow-none md:bg-transparent' : ''}`}>
      <div className={`max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 ${showDesktopRoleSidebar ? 'md:hidden' : ''}`}>
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
              {/* Role badge */}
              {!hasRoleSidebar && (
                <div className="relative">
                  <button
                    type="button"
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-none cursor-pointer uppercase tracking-wide transition-opacity hover:opacity-85 ${roleBadgeColors[roleCode.toLowerCase()] || ''}`}
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    aria-expanded={showRoleMenu}
                  >
                    {roleLabel}
                  </button>
                  {showRoleMenu && (
                    <div className="absolute top-[calc(100%+6px)] right-0 min-w-[200px] bg-white rounded-[var(--radius-btn-lg)] shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-border-medium p-3 z-[101]">
                      <div className="text-sm font-semibold text-text-main">{t('header.role', { role: roleLabel })}</div>
                      <button
                        type="button"
                        className="mt-2 py-1 text-xs text-text-muted bg-transparent border-none cursor-pointer"
                        onClick={() => setShowRoleMenu(false)}
                      >
                        {t('header.close')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              {isLecturer && (
                <Link
                  to="/my-courses"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-btn)] text-sm font-semibold no-underline border-none cursor-pointer transition-all bg-primary-500 text-white hover:-translate-y-px hover:bg-primary-600"
                >
                  <span className="text-base">+</span> {t('header.createCourse')}
                </Link>
              )}

              {/* User menu */}
              {!hasRoleSidebar && (
                <div className="relative">
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
                      {isAdmin && (
                        <DropdownItem to="/admin" onClick={() => setShowUserMenu(false)}>{t('header.adminPanel')}</DropdownItem>
                      )}
                      {(isAdmin || isLecturer) && (
                        <>
                          <DropdownItem to="/my-courses" onClick={() => setShowUserMenu(false)}>{t('header.management')}</DropdownItem>
                          {isLecturer && <DropdownItem to="/syllabuses" onClick={() => setShowUserMenu(false)}>{t('header.syllabuses')}</DropdownItem>}
                          <DropdownItem to="/verify-content" onClick={() => setShowUserMenu(false)}>{t('header.verifyContent')}</DropdownItem>
                        </>
                      )}
                      {!isLecturer && !isAdmin && (
                        <>
                          <DropdownItem to="/my-learning" onClick={() => setShowUserMenu(false)}>{t('header.myLearning')}</DropdownItem>
                          <DropdownItem to="/my-certificates" onClick={() => setShowUserMenu(false)}>{t('header.myCertificates')}</DropdownItem>
                        </>
                      )}
                      <DropdownItem to="/profile" onClick={() => setShowUserMenu(false)}>{t('header.profileLabel')}</DropdownItem>
                      <DropdownItem onClick={handleLogout} className="text-danger-500 font-semibold">{t('header.logout')}</DropdownItem>
                    </div>
                  )}
                </div>
              )}
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

      {showDesktopRoleSidebar && (
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-[linear-gradient(180deg,#dceaff_0%,#cde2ff_45%,#c3dcff_100%)] border-r border-blue-400/70 z-[90] flex-col shadow-[4px_0_30px_rgba(37,99,235,0.2)]">
          <div className="px-3.5 pt-3 pb-2 border-b border-blue-300/50 bg-transparent">
            <div className="flex justify-end mb-1">
              <button
                type="button"
                className="px-2 py-1 rounded-md border border-blue-300/70 bg-white/90 text-[0.72rem] font-semibold text-slate-700 cursor-pointer hover:bg-white transition-colors"
                onClick={() => setHideRoleSidebar(true)}
              >
                {t('header.close')}
              </button>
            </div>
            <Link to="/courses" className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg no-underline text-blue-600 hover:bg-blue-50/90 transition-colors">
              <span className="text-[1.55rem] font-extrabold text-blue-600 leading-none">&lt;/&gt;</span>
              <span className="text-[1.25rem] font-black tracking-tight text-blue-700 leading-none">UniCode.com</span>
            </Link>
            <div className="flex items-center gap-2 px-1 py-1.5 rounded-lg">
              <span className="w-8 h-8 rounded-full bg-white border border-border-medium flex items-center justify-center text-text-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-[0.78rem] font-bold text-text-main truncate">{user?.name || user?.email || 'User'}</div>
                <div className="text-[0.66rem] text-text-muted uppercase">{isAdmin ? 'Admin' : 'Lecturer'}</div>
              </div>
            </div>
            <div className="mt-1 rounded-xl border border-blue-300/60 bg-white/80 p-1 flex backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setLang('vi')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[0.72rem] font-bold border-none cursor-pointer ${i18n.language === 'vi' ? 'bg-primary-500 text-white' : 'bg-transparent text-text-muted hover:bg-bg-deep'}`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[0.72rem] font-bold border-none cursor-pointer ${i18n.language === 'en' ? 'bg-primary-500 text-white' : 'bg-transparent text-text-muted hover:bg-bg-deep'}`}
              >
                EN
              </button>
            </div>
          </div>
          <nav className="p-2.5 flex flex-col gap-1 overflow-y-auto">
            {roleMenuItems.map((item) => {
              const pathOnly = item.to.split('?')[0]
              const active = item.match ? item.match(location.pathname, location.search) : (location.pathname === pathOnly || location.pathname.startsWith(`${pathOnly}/`))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2.5 rounded-xl no-underline text-[0.84rem] font-semibold transition-all ${
                    active
                    ? 'text-blue-900 bg-[linear-gradient(135deg,#ffffff,#e1efff)] border border-blue-400 shadow-[inset_0_-2px_0_0_#1D4ED8,0_10px_22px_rgba(37,99,235,0.22)]'
                      : 'text-slate-800 hover:bg-[linear-gradient(135deg,#ffffff,#ecf4ff)] hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto p-2.5 border-t border-blue-300/50 bg-transparent">
            <button
              type="button"
              className="w-full px-3 py-2 rounded-lg border border-blue-300/70 bg-white/90 text-[0.8rem] font-semibold text-slate-700 cursor-pointer hover:bg-white transition-colors"
              onClick={handleLogout}
            >
              {t('header.logout')}
            </button>
          </div>
        </aside>
      )}
      {hasRoleSidebar && hideRoleSidebar && (
        <button
          type="button"
          className="hidden md:flex fixed left-3 top-3 z-[95] px-3 py-2 rounded-lg border border-blue-300/70 bg-white text-[0.8rem] font-semibold text-blue-700 cursor-pointer shadow-[0_8px_20px_rgba(37,99,235,0.18)] hover:bg-blue-50 transition-colors"
          onClick={() => setHideRoleSidebar(false)}
        >
          {t('header.openMenu')}
        </button>
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

export default Header
