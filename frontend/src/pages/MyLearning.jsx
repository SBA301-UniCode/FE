import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { enrollmentApi, processApi, chapterApi, certificateApi, userApi, feedbackApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import FeedbackModal from '../components/feedback/FeedbackModal'
import './MyLearning.css'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const extractList = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.content)) return payload.content
  if (Array.isArray(payload.data)) return payload.data
  return []
}

const getCourseId = (enrollment) =>
  enrollment?.courseId ||
  enrollment?.courseResponse?.courseId ||
  enrollment?.courseResponse?.id ||
  enrollment?.course?.courseId ||
  enrollment?.course?.id ||
  ''
const unwrap = (res) => res?.data?.data ?? res?.data ?? res

const MyLearning = () => {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollments, setEnrollments] = useState([])
  const [progressByEnrollment, setProgressByEnrollment] = useState({})
  const [chapterCountByCourse, setChapterCountByCourse] = useState({})
  const [certifiedCourseIds, setCertifiedCourseIds] = useState(new Set())
  const [issuingCourseId, setIssuingCourseId] = useState('')
  const [issueMessage, setIssueMessage] = useState('')
  const [learnerId, setLearnerId] = useState('')
  const [canFeedbackByCourse, setCanFeedbackByCourse] = useState({})
  const [activeCommentCourseId, setActiveCommentCourseId] = useState('')
  const [feedbackSubmittingByCourse, setFeedbackSubmittingByCourse] = useState({})
  const [activeTab, setActiveTab] = useState('ALL')

  const TABS = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'IN_PROGRESS', label: 'Đang học' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'NOT_STARTED', label: 'Chưa bắt đầu' },
  ]

  const filteredEnrollments = useMemo(() => {
    if (activeTab === 'ALL') return enrollments
    return enrollments.filter(e => e.statusCourse === activeTab)
  }, [enrollments, activeTab])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // Fetch enrollments for all statuses
        const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
        const results = await Promise.all(
          statuses.map((s) =>
            enrollmentApi.getMyLearning(s, 0, 50).catch(() => ({ data: { data: { content: [] } } }))
          )
        )
        const allEnrollments = results.flatMap((res) => {
          const page = res.data?.data ?? res.data
          return extractList(page)
        })

        // Dedup by courseId, keep latest
        const courseMap = new Map()
        for (const e of allEnrollments) {
          const courseId = getCourseId(e)
          if (!courseId) continue
          courseMap.set(courseId, e) // last one wins
        }
        const uniqueEnrollments = Array.from(courseMap.values())

        // Fetch progress & chapters in parallel
        const progressMap = {}
        const chapterCountMap = {}
        const chapterListCache = {}

        await Promise.all(
          uniqueEnrollments.map(async (enrollment) => {
            const courseId = getCourseId(enrollment)
            const enrollmentId = enrollment?.enrollmentId
            if (!courseId || !enrollmentId) return

            // Get chapters
            if (!chapterListCache[courseId]) {
              try {
                const chapterRes = await chapterApi.getByCourseId(courseId)
                const chapterPayload = chapterRes.data?.data ?? chapterRes.data
                chapterListCache[courseId] = Array.isArray(chapterPayload) ? chapterPayload : []
              } catch {
                chapterListCache[courseId] = []
              }
              chapterCountMap[courseId] = chapterListCache[courseId].length
            }

            // Get course progress
            try {
              const progressRes = await processApi.getCourseProgress({ courseId, enrollmentId })
              const payload = progressRes.data?.data ?? progressRes.data
              progressMap[enrollmentId] =
                typeof payload?.percentComplete === 'number' ? payload.percentComplete : 0
            } catch {
              progressMap[enrollmentId] = 0
            }
          })
        )

        if (!cancelled) {
          setEnrollments(uniqueEnrollments)
          setProgressByEnrollment(progressMap)
          setChapterCountByCourse(chapterCountMap)
        }

        // Get current user's learnerId & certificates
        try {
          const meRes = await userApi.getMe()
          const me = meRes.data?.data ?? meRes.data
          const uid = me?.userId || me?.id || ''
          if (!cancelled) setLearnerId(uid)

          // Fetch my certificates
          const certRes = await certificateApi.getMyList()
          const certList = Array.isArray(certRes?.data?.data ?? certRes?.data)
            ? (certRes?.data?.data ?? certRes?.data)
            : []
          if (!cancelled) {
            setCertifiedCourseIds(new Set(certList.map((c) => c?.courseId).filter(Boolean)))
          }
        } catch {
          // Non-critical
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e.response?.data?.message ||
            e.response?.data?.errorCode ||
            e.message ||
            'Không thể tải danh sách khóa học của bạn.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (enrollments.length === 0) return
    let cancelled = false
    const run = async () => {
      const map = {}
      await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseId = getCourseId(enrollment)
          if (!courseId) return
          try {
            const res = await feedbackApi.canFeedback(courseId)
            const can = unwrap(res)
            map[courseId] = can === true || can === 'true'
          } catch {
            map[courseId] = false
          }
        })
      )
      if (!cancelled) setCanFeedbackByCourse(map)
    }
    run()
    return () => { cancelled = true }
  }, [enrollments])

  const handleContinueLearning = (enrollment) => {
    const courseId = getCourseId(enrollment)
    const enrollmentId = enrollment?.enrollmentId
    if (!courseId || !enrollmentId) return
    navigate(`/learning/${courseId}?enrollmentId=${encodeURIComponent(enrollmentId)}`)
  }

  const handleIssueCertificate = async (courseId, enrollment) => {
    if (!learnerId || !courseId) return
    setIssuingCourseId(courseId)
    setIssueMessage('')
    try {
      // Backend validates 100% progress, so just call create
      await certificateApi.create({ learnerId, courseId })
      setIssueMessage('Đã cấp chứng chỉ thành công! Vào My Certificates để xem.')
      setCertifiedCourseIds((prev) => new Set([...prev, courseId]))
    } catch (e) {
      const code = e?.response?.data?.errorCode || ''
      const msg = e?.response?.data?.message || ''
      if (String(code).includes('CERTIFICATE_ALREADY_EXISTS')) {
        setIssueMessage('Chứng chỉ đã tồn tại cho khóa học này.')
        setCertifiedCourseIds((prev) => new Set([...prev, courseId]))
      } else if (String(code).includes('COURSE_NOT_COMPLETED')) {
        setIssueMessage('Bạn chưa hoàn thành 100% khóa học. Hãy hoàn thành tất cả bài học trước.')
      } else {
        setIssueMessage(`Cấp chứng chỉ thất bại: ${msg || code || e.message}`)
      }
    } finally {
      setIssuingCourseId('')
    }
  }

  const formatPercent = (value) => {
    const n = Number(value)
    return Number.isNaN(n) ? '0%' : `${Math.round(n)}%`
  }

  const handleSubmitFeedback = async (courseId, payload) => {
    if (!courseId) return
    if (!payload?.comment?.trim()) return
    setFeedbackSubmittingByCourse((prev) => ({ ...prev, [courseId]: true }))
    try {
      await feedbackApi.create(
        courseId,
        {
          comment: payload.comment.trim(),
          rating: Number(payload.rating) || 5,
        },
        payload.fileList || []
      )
      setActiveCommentCourseId('')
      setCanFeedbackByCourse((prev) => ({ ...prev, [courseId]: false }))
      setIssueMessage('Gửi bình luận thành công!')
    } catch (e) {
      setIssueMessage(`Gửi bình luận thất bại: ${e?.response?.data?.message || e.message}`)
    } finally {
      setFeedbackSubmittingByCourse((prev) => ({ ...prev, [courseId]: false }))
    }
  }

  const inProgressCourses = useMemo(() =>
    enrollments.filter(e => (e.statusCourse === 'IN_PROGRESS') && (progressByEnrollment[e.enrollmentId] ?? 0) < 99.99)
      .sort((a, b) => new Date(b.enrolledAt || 0) - new Date(a.enrolledAt || 0)),
    [enrollments, progressByEnrollment]
  )
  const continueCourse = inProgressCourses[0]
  const displayName = authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'Learner'
  const completedCount = enrollments.filter(e => (progressByEnrollment[e.enrollmentId] ?? 0) >= 99.99).length

  return (
    <div className="mylearning">
      <Header />
      <main className="mylearning-main">
        {/* ═══ WELCOME BANNER ═══ */}
        <div className="ml-welcome">
          <div className="ml-welcome-left">
            <h1 className="ml-welcome-greeting">{getGreeting()}, {displayName}! 👋</h1>
            <p className="ml-welcome-sub">
              {enrollments.length > 0
                ? `Bạn đang theo dõi ${enrollments.length} khóa học${completedCount > 0 ? ` — đã hoàn thành ${completedCount}` : ''}`
                : 'Bắt đầu hành trình học tập của bạn ngay hôm nay.'
              }
            </p>
          </div>
          <div className="ml-welcome-stats">
            <div className="ml-welcome-stat">
              <span className="ml-welcome-stat-value">{enrollments.length}</span>
              <span className="ml-welcome-stat-label">Enrolled</span>
            </div>
            <div className="ml-welcome-stat">
              <span className="ml-welcome-stat-value">{completedCount}</span>
              <span className="ml-welcome-stat-label">Completed</span>
            </div>
            <div className="ml-welcome-stat">
              <span className="ml-welcome-stat-value">{certifiedCourseIds.size}</span>
              <span className="ml-welcome-stat-label">Certificates</span>
            </div>
          </div>
        </div>

        {/* ═══ CONTINUE LEARNING HERO ═══ */}
        {continueCourse && (() => {
          const cc = continueCourse.courseResponse || {}
          const pct = Math.round(progressByEnrollment[continueCourse.enrollmentId] ?? 0)
          return (
            <div className="ml-continue">
              <div className="ml-continue-left">
                {(cc.image || cc.imageUrl || cc.thumbnail) && (
                  <img src={cc.image || cc.imageUrl || cc.thumbnail} alt="" className="ml-continue-thumb" />
                )}
              </div>
              <div className="ml-continue-right">
                <span className="ml-continue-label">Continue Learning</span>
                <h2 className="ml-continue-title">{cc.title || 'Khóa học'}</h2>
                <div className="ml-continue-progress">
                  <div className="ml-continue-bar-bg">
                    <div className="ml-continue-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ml-continue-pct">{pct}% complete</span>
                </div>
                <button
                  type="button"
                  className="ml-continue-btn"
                  onClick={() => handleContinueLearning(continueCourse)}
                >
                  Resume →
                </button>
              </div>
            </div>
          )
        })()}

        <div className="mylearning-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>All Courses</h2>
          </div>
          <div className="mylearning-actions">
            <Link to="/courses" className="mylearning-btn mylearning-btn-ghost">
              ← Explore more
            </Link>
          </div>
        </div>

        {/* ── Coursera-style Tabs ── */}
        <div className="mylearning-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`mylearning-tab${activeTab === tab.key ? ' mylearning-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="mylearning-tab-count">
                {tab.key === 'ALL'
                  ? enrollments.length
                  : enrollments.filter(e => e.statusCourse === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        {!!issueMessage && (
          <div className="mylearning-loading">{issueMessage}</div>
        )}

        {loading && <div className="mylearning-loading">Đang tải khóa học...</div>}

        {!loading && error && (
          <div className="mylearning-error">
            <strong>Lỗi tải My Learning</strong>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && enrollments.length === 0 && (
          <div className="mylearning-empty">
            Bạn chưa có khóa học nào. Hãy chọn một khóa ở trang Courses và thanh toán để bắt đầu học.
          </div>
        )}

        {!loading && !error && enrollments.length > 0 && (
          <div className="mylearning-grid">
            {filteredEnrollments.map((e) => {
              const course = e.courseResponse || {}
              const percent = progressByEnrollment[e.enrollmentId] ?? 0
              const courseId = getCourseId(e)
              const chapterCount = chapterCountByCourse[courseId]
              const displayStatus = percent >= 99.99 ? 'COMPLETED' : (e.statusCourse || 'IN_PROGRESS')
              const statusClass = displayStatus === 'COMPLETED'
                ? 'is-completed'
                : displayStatus === 'IN_PROGRESS'
                  ? 'is-progress'
                  : 'is-not-started'
              return (
                <article key={e.enrollmentId} className={`mylearning-card ${statusClass}`}>
                  <div className="mylearning-card-thumb">
                    {(course.image || course.imageUrl || course.thumbnail) ? (
                      <img
                        src={course.image || course.imageUrl || course.thumbnail}
                        alt={course.title || ''}
                        className="mylearning-card-thumb-img"
                        onError={(ev) => { ev.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="mylearning-card-thumb-placeholder">📚</div>
                    )}
                  </div>
                  <div className="mylearning-card-top">
                    <div className="mylearning-card-title">{course.title || 'Khóa học'}</div>
                    <span className={`mylearning-pill ${statusClass}`}>{displayStatus}</span>
                  </div>
                  {course.instructorName && (
                    <p className="mylearning-card-instructor">GV: {course.instructorName}</p>
                  )}
                  {course.description && (
                    <p className="mylearning-card-desc">{course.description}</p>
                  )}
                  <div className="mylearning-card-meta">
                    {Number(chapterCount) >= 0 && (
                      <span className="mylearning-chapters">{chapterCount} chương</span>
                    )}
                    <span className="mylearning-progress-text">
                      Tiến trình: {formatPercent(percent)}
                    </span>
                  </div>
                  <div className="mylearning-progress-bar-wrap">
                    <div className="mylearning-progress-bar-bg">
                      <div
                        className="mylearning-progress-bar-fill"
                        style={{ width: formatPercent(percent) }}
                      />
                    </div>
                  </div>
                  <div className="mylearning-card-actions">
                    {canFeedbackByCourse[courseId] && (
                      <button
                        type="button"
                        className="mylearning-btn mylearning-btn-ghost mylearning-card-link"
                        onClick={() => setActiveCommentCourseId(courseId)}
                      >
                        Comment
                      </button>
                    )}
                    <button
                      type="button"
                      className="mylearning-btn mylearning-btn-primary mylearning-card-link"
                      onClick={() => handleContinueLearning(e)}
                    >
                      Tiếp tục học
                    </button>
                    <button
                      type="button"
                      className="mylearning-btn mylearning-btn-ghost mylearning-card-link"
                      onClick={() => navigate(`/learning/${courseId}/mindmap`)}
                    >
                      🗺️ Mind Map
                    </button>
                    {percent >= 99.99 && (
                      <button
                        type="button"
                        className="mylearning-btn mylearning-btn-ghost mylearning-card-link"
                        onClick={() => handleIssueCertificate(courseId, e)}
                        disabled={!learnerId || issuingCourseId === courseId || certifiedCourseIds.has(courseId)}
                      >
                        {certifiedCourseIds.has(courseId)
                          ? 'Đã có chứng chỉ'
                          : issuingCourseId === courseId
                            ? 'Đang cấp...'
                            : 'Nhận chứng chỉ'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <FeedbackModal
        open={Boolean(activeCommentCourseId)}
        title="Tạo bình luận khóa học"
        submitText="Gửi comment"
        submitting={Boolean(feedbackSubmittingByCourse[activeCommentCourseId])}
        onClose={() => setActiveCommentCourseId('')}
        onSubmit={(payload) => handleSubmitFeedback(activeCommentCourseId, payload)}
      />
      <Footer />
    </div>
  )
}

export default MyLearning
