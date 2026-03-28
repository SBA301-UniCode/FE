import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import FeedbackModal from '../components/feedback/FeedbackModal'
import { courseApi, feedbackApi, chapterApi, lessonApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './CourseDetail.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const getFeedbackId = (f) => f?.feedBackId || f?.feedbackId || f?.id || ''
const getFeedbackUser = (f) =>
  f?.userResponse?.fullName ||
  f?.userResponse?.name ||
  f?.userResponse?.username ||
  f?.userResponse?.email ||
  'Học viên'
const getFeedbackDate = (f) =>
  f?.createdAt || f?.createdDate || f?.createDate || f?.updatedAt || f?.updateDate || ''
const getCourseImage = (c) =>
  c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || c?.courseImage || ''
const getImageList = (f) =>
  (Array.isArray(f?.imageResponses) ? f.imageResponses : [])
    .map((img) => ({ imageUrl: img?.imageUrl || img?.url || '', imageId: img?.imageId }))
    .filter((img) => img.imageUrl)
const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN')
}
const toFeedbackList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/* ─── Helpers ─── */
const guessLevel = (title = '') => {
  const t = title.toLowerCase()
  if (/advanced|nâng cao|chuyên sâu/.test(t)) return 'Advanced'
  if (/intermediate|trung bình/.test(t)) return 'Intermediate'
  return 'Beginner'
}

const extractSkills = (title = '', desc = '') => {
  const combined = `${title} ${desc}`.toLowerCase()
  const SKILL_MAP = {
    java: 'Java', python: 'Python', javascript: 'JavaScript', react: 'React',
    'node.js': 'Node.js', spring: 'Spring Boot', html: 'HTML', css: 'CSS',
    typescript: 'TypeScript', sql: 'SQL', docker: 'Docker', git: 'Git',
    oop: 'OOP', api: 'REST API', mongodb: 'MongoDB', aws: 'AWS',
  }
  return Object.entries(SKILL_MAP)
    .filter(([key]) => combined.includes(key))
    .map(([, label]) => label)
    .slice(0, 6)
}

const extractLearningPoints = (desc = '') => {
  const sentences = desc.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 120)
  if (sentences.length >= 4) return sentences.slice(0, 6)
  const defaults = [
    'Hiểu các khái niệm cơ bản và nâng cao',
    'Áp dụng kiến thức vào dự án thực tế',
    'Phát triển kỹ năng tư duy lập trình',
    'Sẵn sàng cho các cơ hội nghề nghiệp',
  ]
  return [...sentences, ...defaults].slice(0, 6)
}

const StarDisplay = ({ rating, size = '1rem' }) => {
  const r = Math.round(rating * 2) / 2
  return (
    <span style={{ fontSize: size, color: '#d97706', letterSpacing: '1px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i}>{i <= Math.floor(r) ? '★' : i - 0.5 === r ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

const CourseDetail = () => {
  const { courseId } = useParams()
  const { isAuthenticated } = useAuth()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState('')
  const [canFeedback, setCanFeedback] = useState(false)
  const [canEditMap, setCanEditMap] = useState({})
  const [lightboxImageUrl, setLightboxImageUrl] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [chapters, setChapters] = useState([])
  const [lessonsByChapter, setLessonsByChapter] = useState({})
  const [openChapters, setOpenChapters] = useState({})
  const [activeSection, setActiveSection] = useState('overview')

  const loadCanEdit = async (list) => {
    const map = {}
    await Promise.all(
      list.map(async (fb) => {
        const feedbackId = getFeedbackId(fb)
        if (!feedbackId) return
        try {
          const res = await feedbackApi.canEdit(feedbackId)
          const data = unwrap(res)
          map[feedbackId] = data === true || data === 'true'
        } catch {
          map[feedbackId] = false
        }
      })
    )
    setCanEditMap(map)
  }

  const loadFeedback = async () => {
    if (!courseId) return
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const res = await feedbackApi.getByCourse(courseId, 1, 50)
      const list = toFeedbackList(unwrap(res))
      setFeedbacks(list)
      await loadCanEdit(list)
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Không tải được bình luận.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const loadCanFeedback = async () => {
    if (!courseId || !isAuthenticated) { setCanFeedback(false); return }
    try {
      const res = await feedbackApi.canFeedback(courseId)
      const data = unwrap(res)
      setCanFeedback(data === true || data === 'true')
    } catch { setCanFeedback(false) }
  }

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true); setError('')
    courseApi.getById(courseId)
      .then((res) => { if (!cancelled) setCourse(unwrap(res)) })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.message || e.message || 'Không tải được chi tiết khóa học.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId])

  useEffect(() => { loadFeedback(); loadCanFeedback() }, [courseId, isAuthenticated])

  // Load chapters for syllabus
  useEffect(() => {
    if (!courseId) return
    chapterApi.getByCourseId(courseId)
      .then((res) => {
        const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
        setChapters(arr)
        // auto-open first chapter
        if (arr.length > 0) setOpenChapters({ [arr[0].chapterId || arr[0].id]: true })
      })
      .catch(() => {})
  }, [courseId])

  const toggleChapter = (chapterId) => {
    setOpenChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }))
    if (!lessonsByChapter[chapterId]) {
      lessonApi.getByChapterId(chapterId)
        .then((res) => {
          const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
          setLessonsByChapter((prev) => ({ ...prev, [chapterId]: arr }))
        })
        .catch(() => setLessonsByChapter((prev) => ({ ...prev, [chapterId]: [] })))
    }
  }

  // Load lessons for auto-opened first chapter
  useEffect(() => {
    if (chapters.length === 0) return
    const firstId = chapters[0].chapterId || chapters[0].id
    if (firstId && !lessonsByChapter[firstId]) {
      lessonApi.getByChapterId(firstId)
        .then((res) => {
          const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
          setLessonsByChapter((prev) => ({ ...prev, [firstId]: arr }))
        })
        .catch(() => {})
    }
  }, [chapters])

  /* ─── Computed ─── */
  const ratings = useMemo(() => feedbacks.map(f => Number(f?.rating) || 0).filter(x => x > 0), [feedbacks])
  const avgRating = useMemo(() => ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, [ratings])
  const ratingDist = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    ratings.forEach(r => { const k = Math.round(r); if (dist[k] !== undefined) dist[k]++ })
    return dist
  }, [ratings])

  const skills = useMemo(() => extractSkills(course?.title, course?.description), [course])
  const learningPoints = useMemo(() => extractLearningPoints(course?.description || ''), [course])
  const level = useMemo(() => guessLevel(course?.title), [course])
  const totalLessons = useMemo(() => Object.values(lessonsByChapter).reduce((s, l) => s + l.length, 0), [lessonsByChapter])

  const handleCreateFeedback = async ({ comment, rating, fileList }) => {
    setSubmitting(true)
    try {
      await feedbackApi.create(courseId, { comment, rating }, fileList)
      setCreateModalOpen(false)
      await Promise.all([loadFeedback(), loadCanFeedback()])
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Tạo bình luận thất bại.')
    } finally { setSubmitting(false) }
  }

  const handleUpdateFeedback = async ({ comment, rating, imageRemoveId, fileList }) => {
    if (!editingFeedback) return
    setSubmitting(true)
    try {
      const updatePayload = {
        comment, rating,
        ...(Array.isArray(imageRemoveId) && imageRemoveId.length > 0 ? { imageRemoveId } : {}),
      }
      await feedbackApi.update(getFeedbackId(editingFeedback), updatePayload, fileList)
      setEditingFeedback(null)
      await loadFeedback()
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Cập nhật bình luận thất bại.')
    } finally { setSubmitting(false) }
  }

  const handleDeleteFeedback = async (feedbackId) => {
    if (!feedbackId || !window.confirm('Bạn có chắc muốn xóa bình luận này?')) return
    try {
      await feedbackApi.delete(feedbackId)
      await Promise.all([loadFeedback(), loadCanFeedback()])
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Xóa bình luận thất bại.')
    }
  }

  const scrollToSection = (id) => {
    setActiveSection(id)
    const el = document.getElementById(`cd-section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="cd-page">
        <Header />
        <main className="cd-main"><div className="cd-skeleton-hero" /><div className="cd-skeleton-body" /></main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cd-page">
        <Header />
        <main className="cd-main"><div className="cd-error-box">⚠️ {error}</div></main>
      </div>
    )
  }

  return (
    <div className="cd-page">
      <Header />

      {/* ═══ HERO BANNER ═══ */}
      <div className="cd-hero">
        <div className="cd-hero-inner">
          <div className="cd-hero-breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/courses">Courses</Link>
            <span>›</span>
            <span>{course?.title || 'Course'}</span>
          </div>
          <h1 className="cd-hero-title">{course?.title || 'Khóa học'}</h1>
          <p className="cd-hero-desc">{course?.description || 'Khóa học chưa có mô tả.'}</p>
          <div className="cd-hero-meta">
            {avgRating > 0 && (
              <span className="cd-hero-rating">
                <StarDisplay rating={avgRating} size="0.95rem" />
                <strong>{avgRating.toFixed(1)}</strong>
                <span>({ratings.length} đánh giá)</span>
              </span>
            )}
            <span className="cd-hero-badge">{level}</span>
            {chapters.length > 0 && <span className="cd-hero-info">📗 {chapters.length} chương</span>}
            {totalLessons > 0 && <span className="cd-hero-info">📄 {totalLessons} bài giảng</span>}
          </div>
          <div className="cd-hero-provider">
            <span className="cd-hero-provider-logo">&lt;/&gt;</span>
            <span>Offered by <strong>UniCode</strong></span>
          </div>
        </div>
        {getCourseImage(course) && (
          <div className="cd-hero-image">
            <img src={getCourseImage(course)} alt={course?.title || ''} />
          </div>
        )}
      </div>

      {/* ═══ STICKY NAV ═══ */}
      <nav className="cd-sticky-nav">
        <div className="cd-sticky-nav-inner">
          {['overview', 'syllabus', 'reviews'].map((s) => (
            <button
              key={s}
              type="button"
              className={`cd-sticky-nav-btn${activeSection === s ? ' cd-sticky-nav-btn--active' : ''}`}
              onClick={() => scrollToSection(s)}
            >
              {s === 'overview' ? 'Overview' : s === 'syllabus' ? 'Syllabus' : 'Reviews'}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="cd-main">
        <div className="cd-layout">
          {/* Left column */}
          <div className="cd-content">

            {/* What you'll learn */}
            <section id="cd-section-overview" className="cd-card">
              <h2 className="cd-card-title">What you&apos;ll learn</h2>
              <div className="cd-learn-grid">
                {learningPoints.map((pt, i) => (
                  <div key={i} className="cd-learn-item">
                    <span className="cd-learn-check">✓</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills */}
            {skills.length > 0 && (
              <section className="cd-card">
                <h2 className="cd-card-title">Skills you&apos;ll gain</h2>
                <div className="cd-skills">
                  {skills.map((s) => (
                    <span key={s} className="cd-skill-tag">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Syllabus */}
            <section id="cd-section-syllabus" className="cd-card">
              <h2 className="cd-card-title">Syllabus — {chapters.length} chương</h2>
              {chapters.length === 0 && <p className="cd-muted">Chưa có nội dung syllabus.</p>}
              <div className="cd-syllabus">
                {chapters.map((ch, ci) => {
                  const chId = ch.chapterId || ch.id
                  const isOpen = openChapters[chId]
                  const lessons = lessonsByChapter[chId] || []
                  return (
                    <div key={chId} className="cd-syllabus-chapter">
                      <button type="button" className="cd-syllabus-header" onClick={() => toggleChapter(chId)}>
                        <div className="cd-syllabus-header-left">
                          <span className="cd-syllabus-chevron">{isOpen ? '▾' : '▸'}</span>
                          <div>
                            <span className="cd-syllabus-week">Chương {ci + 1}</span>
                            <strong className="cd-syllabus-title">{ch.title || ch.chapterTitle || `Chương ${ci + 1}`}</strong>
                          </div>
                        </div>
                        {lessons.length > 0 && (
                          <span className="cd-syllabus-count">{lessons.length} bài</span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="cd-syllabus-lessons">
                          {lessons.length === 0 && <p className="cd-muted cd-syllabus-empty">Đang tải bài giảng...</p>}
                          {lessons.map((l) => (
                            <div key={l.lessonId || l.id} className="cd-syllabus-lesson">
                              <span className="cd-syllabus-lesson-icon">📄</span>
                              <span>{l.title || l.lessonTitle || 'Bài giảng'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Reviews */}
            <section id="cd-section-reviews" className="cd-card">
              <h2 className="cd-card-title">
                Reviews
                {canFeedback && (
                  <button type="button" className="cd-write-review-btn" onClick={() => setCreateModalOpen(true)}>
                    ✏️ Viết đánh giá
                  </button>
                )}
              </h2>

              {/* Rating summary */}
              {ratings.length > 0 && (
                <div className="cd-rating-summary">
                  <div className="cd-rating-big">
                    <span className="cd-rating-big-num">{avgRating.toFixed(1)}</span>
                    <StarDisplay rating={avgRating} size="1.1rem" />
                    <span className="cd-rating-big-count">{ratings.length} đánh giá</span>
                  </div>
                  <div className="cd-rating-bars">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="cd-rating-bar-row">
                        <span className="cd-rating-bar-label">{star}★</span>
                        <div className="cd-rating-bar-track">
                          <div
                            className="cd-rating-bar-fill"
                            style={{ width: `${ratings.length > 0 ? (ratingDist[star] / ratings.length) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="cd-rating-bar-count">{ratingDist[star]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review list */}
              {feedbackLoading && <p className="cd-muted">Đang tải đánh giá...</p>}
              {!feedbackLoading && feedbackError && <p className="cd-error-text">{feedbackError}</p>}
              {!feedbackLoading && !feedbackError && feedbacks.length === 0 && (
                <p className="cd-muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
              )}
              <div className="cd-review-list">
                {feedbacks.map((fb) => {
                  const feedbackId = getFeedbackId(fb)
                  const imageList = getImageList(fb)
                  const canEdit = canEditMap[feedbackId] === true
                  return (
                    <article key={feedbackId || `${fb.comment}-${getFeedbackDate(fb)}`} className="cd-review-item">
                      <div className="cd-review-header">
                        <div className="cd-review-avatar">{getFeedbackUser(fb).charAt(0).toUpperCase()}</div>
                        <div className="cd-review-user">
                          <strong>{getFeedbackUser(fb)}</strong>
                          <span className="cd-review-date">{formatDate(getFeedbackDate(fb))}</span>
                        </div>
                        <StarDisplay rating={Number(fb?.rating || 0)} size="0.85rem" />
                      </div>
                      <p className="cd-review-text">{fb?.comment || ''}</p>
                      {imageList.length > 0 && (
                        <div className="cd-review-images">
                          {imageList.map((img) => (
                            <img key={img.imageId || img.imageUrl} src={img.imageUrl} alt="feedback" loading="lazy" onClick={() => setLightboxImageUrl(img.imageUrl)} />
                          ))}
                        </div>
                      )}
                      {canEdit && (
                        <div className="cd-review-actions">
                          <button type="button" onClick={() => setEditingFeedback(fb)}>Sửa</button>
                          <button type="button" className="danger" onClick={() => handleDeleteFeedback(feedbackId)}>Xóa</button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          </div>

          {/* ═══ STICKY SIDEBAR ═══ */}
          <aside className="cd-sidebar">
            <div className="cd-sidebar-card">
              {getCourseImage(course) && (
                <img src={getCourseImage(course)} alt="" className="cd-sidebar-thumb" />
              )}
              <div className="cd-sidebar-price">
                {Number(course?.price) > 0
                  ? <span className="cd-price">{Number(course.price).toLocaleString('vi-VN')}đ</span>
                  : <span className="cd-price cd-price-free">Miễn phí</span>
                }
              </div>
              <Link to={isAuthenticated ? `/learning/${courseId}` : '/login'} className="cd-sidebar-enroll">
                {isAuthenticated ? 'Bắt đầu học' : 'Đăng nhập để học'}
              </Link>
              <ul className="cd-sidebar-includes">
                <li>📗 {chapters.length} chương học</li>
                <li>📄 {totalLessons || '—'} bài giảng</li>
                <li>🎯 {level}</li>
                <li>📜 Chứng chỉ hoàn thành</li>
                <li>♾️ Truy cập trọn đời</li>
                <li>📱 Học mọi lúc mọi nơi</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxImageUrl && (
        <div className="cd-lightbox" onClick={() => setLightboxImageUrl('')}>
          <img src={lightboxImageUrl} alt="preview" />
        </div>
      )}

      <FeedbackModal
        open={createModalOpen}
        title="Viết đánh giá"
        submitText="Gửi đánh giá"
        submitting={submitting}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFeedback}
      />

      <FeedbackModal
        open={Boolean(editingFeedback)}
        title="Sửa đánh giá"
        submitText="Lưu thay đổi"
        submitting={submitting}
        initialValues={{ comment: editingFeedback?.comment || '', rating: Number(editingFeedback?.rating) || 5 }}
        existingImages={getImageList(editingFeedback)}
        onClose={() => setEditingFeedback(null)}
        onSubmit={handleUpdateFeedback}
      />
      <Footer />
    </div>
  )
}

export default CourseDetail
