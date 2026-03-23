import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import './LandingPage.css'

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

const PARTNERS = [
  'FPT Software', 'VNG Corporation', 'Shopee', 'Tiki',
  'VinGroup', 'Samsung Vietnam', 'Momo', 'Grab Vietnam'
]

const FEATURES = [
  { icon: '🎯', title: 'Hands-on Projects', desc: 'Build real portfolio projects from day one with guided instructions and code reviews.' },
  { icon: '📜', title: 'Verified Certificates', desc: 'Earn industry-recognized certificates to showcase your skills to employers.' },
  { icon: '👨‍🏫', title: 'Expert Instructors', desc: 'Learn from senior developers with 10+ years of experience in top tech companies.' },
  { icon: '🔄', title: 'Lifetime Access', desc: 'Access all course materials anytime, anywhere. Learn at your own pace with no deadlines.' },
]

const TESTIMONIALS = [
  {
    name: 'Nguyễn Minh Tuấn',
    role: 'Frontend Developer at FPT',
    avatar: '/instructors.png',
    quote: 'Sau khi hoàn thành khóa React, tôi đã tự tin apply vào FPT và được nhận ngay vòng đầu. Kiến thức thực tế giúp tôi rất nhiều!',
    rating: 5,
    course: 'ReactJS Frontend'
  },
  {
    name: 'Trần Thị Hồng',
    role: 'Data Analyst at VNG',
    avatar: '/instructors.png',
    quote: 'Python Data Science course đã thay đổi career path của tôi hoàn toàn. Từ marketing chuyển sang data, lương tăng gấp đôi!',
    rating: 5,
    course: 'Python Data Science'
  },
  {
    name: 'Lê Văn Đức',
    role: 'Backend Developer at Shopee',
    avatar: '/instructors.png',
    quote: 'Java Masterclass cung cấp kiến thức sâu về OOP và Spring Boot. Đúng là khóa học đáng đầu tư nhất mà tôi từng học.',
    rating: 5,
    course: 'Java Masterclass'
  },
]

const FAQS = [
  {
    q: 'How do certificates work?',
    a: 'After completing all chapters, quizzes, and assignments in a course, you can request a certificate. Each certificate has a unique verification code that employers can verify on our platform.'
  },
  {
    q: 'Can I access courses on mobile?',
    a: 'Yes! Our platform is fully responsive and works on all devices — desktop, tablet, and mobile. You can learn anywhere, anytime.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept MoMo e-wallet for quick and secure payments. After payment, you get instant access to all course materials and lifetime updates.'
  },
  {
    q: 'Do courses have deadlines?',
    a: 'No! All courses are self-paced. Once enrolled, you have lifetime access and can learn at your own schedule. Take your time to master each concept.'
  },
  {
    q: 'Can I get a refund?',
    a: 'We offer a full refund within 7 days of purchase if you are not satisfied with the course quality. No questions asked.'
  },
]

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="landing">
      <Header />
      <main className="landing-main">
        {/* ═══════ HERO ═══════ */}
        <div className="landing-hero">
          <section className="landing-hero-content">
            <div className="landing-badge">
              <span className="landing-badge-icon">💡</span>
              New: 50+ courses added this month
            </div>
            <h1 className="landing-title">
              Learn to Code.<br />Build Your Future.
            </h1>
            <p className="landing-desc">
              Master programming with interactive courses, real-world projects, and guidance from industry experts.
            </p>
            <div className="landing-hero-actions">
              <Link to="/courses" className="landing-cta">
                Explore Courses
                <span className="landing-cta-arrow">→</span>
              </Link>
              <Link to="/register" className="landing-cta-secondary">
                Join for Free
              </Link>
            </div>
            <div className="landing-stats">
              <div className="landing-stat">
                <span className="landing-stat-value">500K+</span>
                <span className="landing-stat-label">Active Learners</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-value">850+</span>
                <span className="landing-stat-label">Courses</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-value">98%</span>
                <span className="landing-stat-label">Success Rate</span>
              </div>
            </div>
          </section>
          <section className="landing-hero-media">
            <img
              src="/hero-illustration.png"
              alt="Students learning to code"
              className="landing-hero-image"
            />
          </section>
        </div>

        {/* ═══════ PARTNER BAR ═══════ */}
        <section className="landing-partners">
          <p className="landing-partners-label">Trusted by leading companies in Vietnam</p>
          <div className="landing-partners-row">
            {PARTNERS.map((name) => (
              <span key={name} className="landing-partner-logo">{name}</span>
            ))}
          </div>
        </section>

        {/* ═══════ POPULAR LANGUAGES ═══════ */}
        <section className="landing-languages">
          <h2 className="landing-section-title">Popular Programming Languages</h2>
          <p className="landing-section-subtitle">Choose your path and start learning today.</p>
          <div className="landing-languages-grid">
            {LANGUAGES.map((lang) => (
              <Link to="/courses" key={lang.name} className="landing-lang-card">
                <span className="landing-lang-icon">{lang.icon}</span>
                <span className="landing-lang-name">{lang.name}</span>
                <span className="landing-lang-courses">{lang.courses} courses</span>
                <div className="landing-lang-bar-wrap">
                  <div className="landing-lang-bar" style={{ width: `${Math.round(lang.courses / 1.56)}%`, background: lang.color }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════ WHY UNICODE ═══════ */}
        <section className="landing-features">
          <h2 className="landing-section-title">Why UniCode?</h2>
          <p className="landing-section-subtitle">Everything you need to launch your tech career.</p>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <span className="landing-feature-icon">{f.icon}</span>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section className="landing-testimonials">
          <h2 className="landing-section-title">Student Success Stories</h2>
          <p className="landing-section-subtitle">See what our learners have achieved.</p>
          <div className="landing-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="landing-testimonial-card">
                <div className="landing-testimonial-stars">
                  {'★'.repeat(t.rating)}
                </div>
                <p className="landing-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="landing-testimonial-author">
                  <div className="landing-testimonial-avatar" />
                  <div className="landing-testimonial-info">
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
                <span className="landing-testimonial-course">📚 {t.course}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section className="landing-faq">
          <h2 className="landing-section-title">Frequently Asked Questions</h2>
          <p className="landing-section-subtitle">Everything you need to know about UniCode.</p>
          <div className="landing-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`landing-faq-item${openFaq === i ? ' landing-faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.q}</span>
                  <span className="landing-faq-chevron">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="landing-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ CTA BANNER ═══════ */}
        <section className="landing-cta-section">
          <div className="landing-cta-banner">
            <h2 className="landing-cta-title">Ready to Start Learning?</h2>
            <p className="landing-cta-subtitle">
              Join 500,000+ learners and transform your career with UniCode.
            </p>
            <div className="landing-cta-buttons">
              <Link to="/courses" className="landing-cta-btn landing-cta-btn-primary">
                Browse Courses
              </Link>
              <Link to="/register" className="landing-cta-btn landing-cta-btn-secondary">
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-footer-logo-wrap">
              <span className="landing-footer-logo">&lt;/&gt;</span>
              <span className="landing-footer-name">UniCode.com</span>
            </div>
            <p className="landing-footer-tagline">
              Learn to code with interactive courses and real-world projects. Build the skills you need for a career in tech.
            </p>
            <div className="landing-footer-social">
              <a href="/" className="landing-social-icon" aria-label="Facebook">f</a>
              <a href="/" className="landing-social-icon" aria-label="YouTube">▶</a>
              <a href="/" className="landing-social-icon" aria-label="LinkedIn">in</a>
              <a href="/" className="landing-social-icon" aria-label="GitHub">⌂</a>
            </div>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>Courses</h4>
              <Link to="/courses">Browse All</Link>
              <a href="/courses">JavaScript</a>
              <a href="/courses">Python</a>
              <a href="/courses">React</a>
              <a href="/courses">Node.js</a>
            </div>
            <div className="landing-footer-col">
              <h4>Resources</h4>
              <a href="/">Learning Paths</a>
              <a href="/">Documentation</a>
              <a href="/">Blog</a>
              <a href="/">FAQs</a>
              <a href="/">Support</a>
            </div>
            <div className="landing-footer-col">
              <h4>Company</h4>
              <a href="/">About Us</a>
              <a href="/">Careers</a>
              <a href="/verify-certificate">Verify Certificate</a>
              <a href="/">Terms of Service</a>
              <a href="/">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>© 2024 UniCode.com — All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
