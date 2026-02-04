import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import './LandingPage.css'

const LANGUAGES = [
  { name: 'JavaScript', courses: 156, progress: 60, icon: '🟧' },
  { name: 'Python', courses: 142, progress: 55, icon: '🐍' },
  { name: 'Java', courses: 98, progress: 40, icon: '☕' },
  { name: 'C++', courses: 87, progress: 35, icon: '⚡' },
  { name: 'React', courses: 124, progress: 50, icon: '⚛️' },
  { name: 'Node.js', courses: 93, progress: 38, icon: '🟢' },
  { name: 'TypeScript', courses: 76, progress: 30, icon: '🔷' },
  { name: 'Go', courses: 68, progress: 28, icon: '🔵' },
]

const LandingPage = () => {
  return (
    <div className="landing">
      <Header />
      <main className="landing-main">
        <div className="landing-hero">
          <section className="landing-hero-content">
            <div className="landing-badge">
              <span className="landing-badge-icon">💡</span>
              New: 50+ courses added this month
            </div>
            <h1 className="landing-title">
              Learn to Code. Build Your Future.
            </h1>
            <p className="landing-desc">
              Master programming with interactive courses, real-world projects, and guidance from industry experts.
            </p>
            <Link to="/courses" className="landing-cta">
              Explore Courses
              <span className="landing-cta-arrow">→</span>
            </Link>
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
            <div className="landing-video-wrap">
              <button type="button" className="landing-video-play" aria-label="Play video">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
            <div className="landing-instructor">
              <div className="landing-instructor-avatar" />
              <div className="landing-instructor-info">
                <strong>Sarah Johnson</strong>
                <span>Senior Instructor</span>
              </div>
              <p className="landing-instructor-quote">
                &ldquo;Join thousands of students mastering coding skills&rdquo;
              </p>
            </div>
          </section>
        </div>

        {/* Popular Programming Languages */}
        <section className="landing-languages">
          <h2 className="landing-languages-title">Popular Programming Languages</h2>
          <p className="landing-languages-subtitle">Choose your path and start learning today.</p>
          <div className="landing-languages-grid">
            {LANGUAGES.map((lang) => (
              <Link to="/courses" key={lang.name} className="landing-lang-card">
                <span className="landing-lang-icon">{lang.icon}</span>
                <span className="landing-lang-name">{lang.name}</span>
                <span className="landing-lang-courses">{lang.courses} courses</span>
                <div className="landing-lang-progress-wrap">
                  <div className="landing-lang-progress" style={{ width: `${lang.progress}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Start Learning Today CTA */}
        <section className="landing-cta-section">
          <h2 className="landing-cta-title">Start Learning Today</h2>
          <p className="landing-cta-subtitle">
            Join millions of learners and transform your career with UniCode.com
          </p>
          <div className="landing-cta-buttons">
            <Link to="/courses" className="landing-cta-btn landing-cta-btn-primary">
              Browse Courses
            </Link>
            <Link to="/courses" className="landing-cta-btn landing-cta-btn-secondary">
              View Learning Paths
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo">&lt;/&gt;</span>
            <span className="landing-footer-name">UniCode.com</span>
            <p className="landing-footer-tagline">
              Learn to code with interactive courses and real-world projects.
            </p>
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
              <a href="/">Terms of Service</a>
              <a href="/">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
