import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/useAuth'

const prevent = (e: MouseEvent) => e.preventDefault()

const Footer = () => {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const roleCode = (user?.roles as Array<{ roleCode?: string }> | undefined)?.[0]?.roleCode || ''
  const isDashboardRole = roleCode === 'ADMIN' || roleCode === 'INSTRUCTOR'
  const dashboardRoutes = ['/courses', '/admin', '/my-courses', '/syllabuses', '/verify-content']
  const isDashboardMenuPage = dashboardRoutes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
  if (isAuthenticated && isDashboardRole && isDashboardMenuPage) return null

  return (
    <footer className="bg-primary-800 text-white/85 pt-12 px-6 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-8">
        {/* Brand */}
        <div className="flex flex-col gap-3">
          <Link to="/" className="text-xl font-bold text-white no-underline">
            <span className="text-white/70">&lt;/&gt;</span> UniCode.com
          </Link>
          <p className="text-[0.85rem] text-white/60 leading-relaxed max-w-[280px]">
            {t('footer.desc')}
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="text-[0.85rem] font-bold uppercase tracking-wider text-white/50 mb-3">{t('footer.explore')}</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            <li><Link to="/courses" className="text-sm text-white/75 no-underline transition-colors hover:text-white">{t('footer.allCourses')}</Link></li>
            <li><Link to="/verify-certificate" className="text-sm text-white/75 no-underline transition-colors hover:text-white">{t('footer.verifyCert')}</Link></li>
          </ul>
        </div>

        {/* Community */}
        <div>
          <h4 className="text-[0.85rem] font-bold uppercase tracking-wider text-white/50 mb-3">{t('footer.community')}</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>{t('footer.blog')}</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>{t('footer.forum')}</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>{t('footer.support')}</a></li>
          </ul>
        </div>

        {/* Info */}
        <div>
          <h4 className="text-[0.85rem] font-bold uppercase tracking-wider text-white/50 mb-3">{t('footer.info')}</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>{t('footer.about')}</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>{t('footer.terms')}</a></li>
            <li><a href="#" className="text-sm text-white/75 no-underline transition-colors hover:text-white" onClick={prevent}>{t('footer.privacy')}</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
        <span className="text-xs text-white/45">{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        <div className="flex gap-3">
          {(['f', '▶', 'in'] as const).map((icon, i) => (
            <a
              key={i}
              href="#"
              className="w-9 h-9 rounded-full bg-white/8 text-white/65 flex items-center justify-center no-underline text-[0.95rem] transition-colors hover:bg-white/15 hover:text-white"
              aria-label={['Facebook', 'YouTube', 'LinkedIn'][i]}
              onClick={prevent}
            >
              {icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
