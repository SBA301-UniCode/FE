import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { enrollmentApi, processApi, chapterApi, certificateApi, userApi } from '../api'
import './MyLearning.css'

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

const MyLearning = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollments, setEnrollments] = useState([])
  const [progressByEnrollment, setProgressByEnrollment] = useState({})
  const [chapterCountByCourse, setChapterCountByCourse] = useState({})
  const [certifiedCourseIds, setCertifiedCourseIds] = useState(new Set())
  const [issuingCourseId, setIssuingCourseId] = useState('')
  const [issueMessage, setIssueMessage] = useState('')
  const [learnerId, setLearnerId] = useState('')

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

  return (
    <div className="mylearning">
      <Header />
      <main className="mylearning-main">
        <div className="mylearning-header">
          <div>
            <h1>My Learning</h1>
            <p>Các khóa học bạn đã ghi danh và đang học.</p>
          </div>
          <div className="mylearning-actions">
            <Link to="/courses" className="mylearning-btn mylearning-btn-ghost">
              ← Khám phá thêm khóa học
            </Link>
          </div>
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
            {enrollments.map((e) => {
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
                    <button
                      type="button"
                      className="mylearning-btn mylearning-btn-primary mylearning-card-link"
                      onClick={() => handleContinueLearning(e)}
                    >
                      Tiếp tục học
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
    </div>
  )
}

export default MyLearning
