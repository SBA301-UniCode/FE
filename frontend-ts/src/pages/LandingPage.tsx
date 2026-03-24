import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { name: 'JavaScript', courses: 156, icon: '🟧', color: '#F7DF1E' },
  { name: 'Python', courses: 142, icon: '🐍', color: '#3776AB' },
  { name: 'Java', courses: 98, icon: '☕', color: '#ED8B00' },
  { name: 'C++', courses: 87, icon: '⚡', color: '#00599C' },
  { name: 'React', courses: 124, icon: '⚛️', color: '#61DAFB' },
  { name: 'Node.js', courses: 93, icon: '🟢', color: '#339933' },
  { name: 'TypeScript', courses: 76, icon: '🔷', color: '#3178C6' },
  { name: 'Go', courses: 68, icon: '🔵', color: '#00ADD8' },
]

const PARTNERS = ['FPT Software', 'VNG Corporation', 'Shopee', 'Tiki', 'VinGroup', 'Samsung Vietnam', 'Momo', 'Grab Vietnam']

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { t } = useTranslation()

  const FEATURES = [
    { icon: '🎯', title: t('landing.feat1Title'), desc: t('landing.feat1Desc') },
    { icon: '📜', title: t('landing.feat2Title'), desc: t('landing.feat2Desc') },
    { icon: '👨‍🏫', title: t('landing.feat3Title'), desc: t('landing.feat3Desc') },
    { icon: '🔄', title: t('landing.feat4Title'), desc: t('landing.feat4Desc') },
  ]

  const TESTIMONIALS = [
    { name: 'Nguyễn Minh Tuấn', role: 'Frontend Developer at FPT', quote: 'Sau khi hoàn thành khóa React, tôi đã tự tin apply vào FPT và được nhận ngay vòng đầu.', rating: 5, course: 'ReactJS Frontend' },
    { name: 'Trần Thị Hồng', role: 'Data Analyst at VNG', quote: 'Python Data Science course đã thay đổi career path của tôi hoàn toàn. Từ marketing chuyển sang data!', rating: 5, course: 'Python Data Science' },
    { name: 'Lê Văn Đức', role: 'Backend Developer at Shopee', quote: 'Java Masterclass cung cấp kiến thức sâu về OOP và Spring Boot. Đúng là khóa học đáng đầu tư nhất.', rating: 5, course: 'Java Masterclass' },
  ]

  const FAQS = [
    { q: t('landing.faq1Q'), a: t('landing.faq1A') },
    { q: t('landing.faq2Q'), a: t('landing.faq2A') },
    { q: t('landing.faq3Q'), a: t('landing.faq3A') },
    { q: t('landing.faq4Q'), a: t('landing.faq4A') },
    { q: t('landing.faq5Q'), a: t('landing.faq5A') },
  ]

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* ═══ HERO ═══ */}
        <div className="grid grid-cols-2 gap-12 items-center min-h-[calc(100vh-140px)] pb-8 max-[900px]:grid-cols-1 max-[900px]:text-center max-[900px]:min-h-0 max-[900px]:pt-4">
          <section className="flex flex-col gap-5 max-[900px]:items-center">
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 bg-blue-50 text-primary-500 rounded-full text-[0.85rem] font-semibold max-[900px]:self-center">
              {t('landing.badge')}
            </div>
            <h1 className="text-[clamp(2.2rem,4.5vw,3.2rem)] font-extrabold leading-[1.12] tracking-tight m-0">{t('landing.heroTitle1')}<br />{t('landing.heroTitle2')}</h1>
            <p className="text-lg leading-relaxed text-text-secondary max-w-[480px] m-0 max-[900px]:text-center">{t('landing.heroSubtitle')}</p>
            <div className="flex gap-3 items-center flex-wrap max-[900px]:justify-center max-[640px]:flex-col">
              <Link to="/courses" className="inline-flex items-center gap-2 px-6 py-3.5 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white rounded-xl text-base font-bold no-underline shadow-[0_4px_20px_rgba(0,86,210,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,86,210,0.25)]">
                {t('landing.exploreCourses')} <span className="text-xl">→</span>
              </Link>
              <Link to="/register" className="inline-flex items-center px-6 py-3.5 bg-transparent text-primary-500 border-2 border-primary-500 rounded-xl text-base font-bold no-underline transition-colors hover:bg-[rgba(0,86,210,0.06)]">{t('landing.joinFree')}</Link>
            </div>
            <div className="flex gap-10 mt-2 max-[900px]:justify-center max-[640px]:gap-6">
              {[['500K+', t('landing.activeLearners')], ['850+', t('landing.coursesCount')], ['98%', t('landing.successRate')]].map(([v, l]) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <span className="text-[1.75rem] font-extrabold">{v}</span>
                  <span className="text-[0.85rem] text-text-muted">{l}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="flex items-center justify-center max-[900px]:order-[-1] max-[900px]:max-w-[420px] max-[900px]:mx-auto">
            <img src="/hero-illustration.png" alt="Students learning to code" className="w-full max-w-[560px] rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.1)]" />
          </section>
        </div>

        {/* ═══ PARTNERS ═══ */}
        <section className="border-y border-border-subtle py-7 text-center">
          <p className="m-0 mb-4 text-[0.85rem] font-semibold text-text-muted uppercase tracking-wider">{t('landing.partners')}</p>
          <div className="flex flex-wrap gap-x-10 gap-y-6 justify-center items-center">
            {PARTNERS.map((name) => (<span key={name} className="text-[0.95rem] font-bold text-text-muted opacity-55 whitespace-nowrap transition-opacity hover:opacity-90">{name}</span>))}
          </div>
        </section>

        {/* ═══ LANGUAGES ═══ */}
        <section className="py-16">
          <SectionHeader title={t('landing.langTitle')} subtitle={t('landing.langSubtitle')} />
          <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
            {LANGUAGES.map((lang) => (
              <Link to={`/courses?q=${encodeURIComponent(lang.name)}`} key={lang.name} className="bg-white border border-border-medium rounded-[14px] p-4 no-underline text-text-main flex flex-col gap-1 transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-primary-500">
                <span className="text-3xl">{lang.icon}</span>
                <span className="text-base font-bold">{lang.name}</span>
                <span className="text-[0.82rem] text-text-muted">{lang.courses} {t('landing.coursesUnit')}</span>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(lang.courses / 1.56)}%`, background: lang.color }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section className="py-12">
          <SectionHeader title={t('landing.featTitle')} subtitle={t('landing.featSubtitle')} />
          <div className="grid grid-cols-4 gap-5 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-border-medium rounded-2xl py-6 px-5 text-center transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <span className="text-[2.5rem] block mb-3">{f.icon}</span>
                <h3 className="text-base font-bold m-0 mb-2">{f.title}</h3>
                <p className="text-[0.88rem] text-text-secondary leading-relaxed m-0">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ TESTIMONIALS ═══ */}
        <section className="py-12">
          <SectionHeader title={t('landing.testTitle')} subtitle={t('landing.testSubtitle')} />
          <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
            {TESTIMONIALS.map((tm) => (
              <div key={tm.name} className="bg-white border border-border-medium rounded-2xl p-6 flex flex-col gap-3 transition-all hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="text-amber-600 text-base tracking-[2px]">{'★'.repeat(tm.rating)}</div>
                <p className="text-[0.92rem] leading-relaxed text-text-secondary italic m-0 flex-1">&ldquo;{tm.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-primary-700))] shrink-0" />
                  <div className="flex flex-col">
                    <strong className="text-[0.88rem]">{tm.name}</strong>
                    <span className="text-[0.78rem] text-text-muted">{tm.role}</span>
                  </div>
                </div>
                <span className="text-[0.78rem] font-semibold text-primary-500 bg-[rgba(0,86,210,0.06)] px-2.5 py-1 rounded-md self-start">📚 {tm.course}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="py-12 max-w-[760px] mx-auto">
          <SectionHeader title={t('landing.faqTitle')} subtitle={t('landing.faqSubtitle')} />
          <div className="flex flex-col">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-border-medium">
                <button type="button" className="w-full flex justify-between items-center py-4 bg-transparent border-none text-text-main text-base font-semibold cursor-pointer text-left font-[inherit] transition-colors hover:text-primary-500" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="text-xl font-light text-text-muted shrink-0 ml-4">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="pb-4 animate-[faqSlide_0.25s_ease]">
                    <p className="m-0 text-[0.92rem] leading-relaxed text-text-secondary">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CTA BANNER ═══ */}
        <section className="py-8 pb-16">
          <div className="text-center bg-[linear-gradient(135deg,#003E99_0%,#0056D2_50%,#1A73E8_100%)] rounded-[20px] py-14 px-8 text-white">
            <h2 className="m-0 mb-3 text-3xl font-extrabold text-white">{t('landing.ctaTitle')}</h2>
            <p className="m-0 mb-7 text-lg text-white/85">{t('landing.ctaSubtitle')}</p>
            <div className="flex gap-4 justify-center flex-wrap max-[640px]:flex-col max-[640px]:items-center">
              <Link to="/courses" className="px-8 py-3.5 rounded-xl text-base font-bold no-underline transition-all bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]" style={{ color: '#0056D2' }}>{t('landing.ctaBrowse')}</Link>
              <Link to="/register" className="px-8 py-3.5 rounded-xl text-base font-bold no-underline transition-all bg-transparent border-2 border-white/50 hover:border-white hover:bg-white/10" style={{ color: '#fff' }}>{t('landing.ctaCreate')}</Link>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-gray-800 text-gray-50 pt-14 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-[1.2fr_2fr] gap-12 items-start pb-10 border-b border-white/10 max-[900px]:grid-cols-1">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 bg-primary-500 text-white rounded-lg text-[0.9rem] font-extrabold">&lt;/&gt;</span>
              <span className="text-lg font-extrabold">UniCode.com</span>
            </div>
            <p className="m-0 text-[0.88rem] text-white/65 leading-relaxed max-w-[300px]">{t('footer.learnCode')}</p>
            <div className="flex gap-2 mt-1">
              {['f', '▶', 'in', '⌂'].map((icon, i) => (
                <a key={i} href="/" className="w-8 h-8 rounded-lg bg-white/8 text-white/60 flex items-center justify-center no-underline text-xs font-bold transition-colors hover:bg-white/15 hover:text-white">{icon}</a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-8 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
            <FooterCol title={t('footer.coursesCol')} links={[[t('footer.browseAll'), '/courses'], ['JavaScript', '/courses'], ['Python', '/courses'], ['React', '/courses']]} />
            <FooterCol title={t('footer.resources')} links={[[t('footer.learningPaths'), '/'], [t('footer.docs'), '/'], [t('footer.blog'), '/'], [t('footer.faqs'), '/']]} />
            <FooterCol title={t('footer.company')} links={[[t('footer.aboutUs'), '/'], [t('footer.careers'), '/'], [t('footer.verifyCert'), '/verify-certificate'], [t('footer.terms'), '/'], [t('footer.privacy'), '/']]} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto py-5 text-center">
          <p className="m-0 text-[0.82rem] text-white/45">{t('footer.allRights', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  )
}

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <>
    <h2 className="m-0 mb-2 text-3xl font-extrabold text-text-main text-center tracking-tight">{title}</h2>
    <p className="m-0 mb-10 text-[1.05rem] text-text-muted text-center">{subtitle}</p>
  </>
)

const FooterCol = ({ title, links }: { title: string; links: [string, string][] }) => (
  <div>
    <h4 className="m-0 mb-3 text-sm font-bold text-white">{title}</h4>
    {links.map(([text, href]) => (
      <a key={text} href={href} className="block text-white/60 no-underline text-[0.88rem] mb-1.5 transition-colors hover:text-white">{text}</a>
    ))}
  </div>
)

export default LandingPage
