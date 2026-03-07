import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { enrollmentApi, processApi } from '../api'
import './MyLearning.css'

const extractList = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.content)) return payload.content
  if (Array.isArray(payload.data)) return payload.data
  return []
}

const getStatusRank = (status) => {
  if (status === 'IN_PROGRESS') return 3
  if (status === 'NOT_STARTED') return 2
  if (status === 'COMPLETED') return 1
  return 0
}

const getEnrollmentTimestamp = (enrollment) => {
  const raw =
    enrollment?.updatedAt ||
    enrollment?.enrollmentDate ||
    enrollment?.createdAt ||
    ''
  const ts = Date.parse(raw)
  return Number.isNaN(ts) ? 0 : ts
}

const dedupeByCourseId = (list) => {
  const map = new Map()
  for (const enrollment of list) {
    const courseId =
      enrollment?.courseResponse?.courseId ||
      enrollment?.courseId ||
      enrollment?.course?.courseId
    if (!courseId) continue

    const current = map.get(courseId)
    if (!current) {
      map.set(courseId, enrollment)
      continue
    }

    const currentStatusRank = getStatusRank(current?.statusCourse)
    const nextStatusRank = getStatusRank(enrollment?.statusCourse)
    if (nextStatusRank > currentStatusRank) {
      map.set(courseId, enrollment)
      continue
    }
    if (nextStatusRank === currentStatusRank) {
      const currentTs = getEnrollmentTimestamp(current)
      const nextTs = getEnrollmentTimestamp(enrollment)
      if (nextTs >= currentTs) {
        map.set(courseId, enrollment)
      }
    }
  }
  return Array.from(map.values())
}

const MyLearning = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollments, setEnrollments] = useState([])
  const [progressByEnrollment, setProgressByEnrollment] = useState({})

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
        const results = await Promise.all(
          statuses.map((s) =>
            enrollmentApi.getMyLearning(s, 0, 50).catch(() => ({ data: { data: { content: [] } } }))
          )
        )
        if (!cancelled) {
          const allEnrollments = results.flatMap((res) => {
            const page = res.data?.data ?? res.data
            return extractList(page)
          })
          const unique = dedupeByCourseId(allEnrollments)
          setEnrollments(unique)
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e.response?.data?.message ||
            e.response?.data?.errorCode ||
            e.message ||
            'Không thể tải danh sách khóa học của bạn.'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  // Lấy % tiến trình cho từng enrollment
  useEffect(() => {
    let cancelled = false
    const fetchProgress = async () => {
      if (!enrollments.length) return
      const next = {}
      await Promise.all(
        enrollments.map(async (e) => {
          const courseId = e?.courseResponse?.courseId
          const enrollmentId = e?.enrollmentId
          if (!courseId || !enrollmentId) return
          try {
            const res = await processApi.getCourseProgress({ courseId, enrollmentId })
            const payload = res.data?.data ?? res.data
            const percent = typeof payload?.percentComplete === 'number' ? payload.percentComplete : 0
            next[enrollmentId] = percent
          } catch {
            next[enrollmentId] = 0
          }
        }),
      )
      if (!cancelled) {
        setProgressByEnrollment(next)
      }
    }
    fetchProgress()
    return () => {
      cancelled = true
    }
  }, [enrollments])

  const handleContinueLearning = (enrollment) => {
    const courseId = enrollment?.courseResponse?.courseId
    const enrollmentId = enrollment?.enrollmentId
    if (!courseId || !enrollmentId) return
    navigate(`/learning/${courseId}?enrollmentId=${encodeURIComponent(enrollmentId)}`)
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '0%'
    const n = Number(value)
    if (Number.isNaN(n)) return '0%'
    return `${Math.round(n)}%`
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
              return (
                <article key={e.enrollmentId} className="mylearning-card">
                  <div className="mylearning-card-top">
                    <div className="mylearning-card-title">{course.title || 'Khóa học'}</div>
                    <span className="mylearning-pill">{e.statusCourse || 'IN_PROGRESS'}</span>
                  </div>
                  {course.instructorName && (
                    <p className="mylearning-card-instructor">GV: {course.instructorName}</p>
                  )}
                  {course.description && (
                    <p className="mylearning-card-desc">{course.description}</p>
                  )}
                  <div className="mylearning-card-meta">
                    {Number(course.chapterCount) >= 0 && (
                      <span className="mylearning-chapters">{course.chapterCount} chương</span>
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
                  <button
                    type="button"
                    className="mylearning-btn mylearning-btn-primary mylearning-card-link"
                    onClick={() => handleContinueLearning(e)}
                  >
                    Tiếp tục học
                  </button>
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

