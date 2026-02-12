import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { courseApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './MyCourses.css'

const getMyCoursesEndpoint = () =>
  import.meta.env.VITE_MY_COURSES_ENDPOINT || import.meta.env.VITE_COURSES_ENDPOINT || '/api/v1/courses'

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const getCourseKey = (c) => c?.courseId || c?.id || c?._id || c?.courseCode || c?.slug || c?.title
const getCourseTitle = (c) => c?.title || c?.name || c?.courseName || 'Untitled course'
const getCourseDesc = (c) => c?.description || c?.summary || ''
const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price)
  if (Number.isNaN(num)) return String(price)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

const MyCourses = () => {
  const { user } = useAuth()
  const roleCode = user?.roles?.[0]?.roleCode
  const canView = roleCode === 'INSTRUCTOR' || roleCode === 'ADMIN'

  const endpoint = useMemo(() => getMyCoursesEndpoint(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!canView) {
        setLoading(false)
        setCourses([])
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await courseApi.getMyCourses()
        const payload = res.data?.data ?? res.data
        const list = extractList(payload)
        if (!cancelled) {
          setCourses(list)
        }
      } catch (e) {
        if (!cancelled) {
          const status = e.response?.status
          // 400/404 = backend chưa có API hoặc endpoint khác → coi như chưa có khóa học, không báo lỗi đỏ
          if (status === 400 || status === 404) {
            setCourses([])
            setError('')
          } else {
            const msg =
              e.response?.data?.message ||
              e.response?.data?.errorCode ||
              e.message ||
              'Không thể tải danh sách khóa học.'
            setError(msg)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [canView])

  return (
    <div className="mycourses">
      <Header />
      <main className="mycourses-main">
        <div className="mycourses-header">
          <div>
            <h1>My Courses</h1>
            <p>Danh sách khóa học bạn đang sở hữu/quản lý.</p>
          </div>
          <div className="mycourses-actions">
            <Link to="/dashboard" className="mycourses-btn mycourses-btn-ghost">
              ← Dashboard
            </Link>
            <button type="button" className="mycourses-btn mycourses-btn-primary" disabled>
              + Create Course
            </button>
          </div>
        </div>

        {!canView && (
          <div className="mycourses-empty">
            Trang này dành cho <strong>Lecturer/Instructor</strong>. (Role hiện tại: {roleCode || 'Unknown'})
          </div>
        )}

        {canView && loading && <div className="mycourses-loading">Đang tải khóa học...</div>}

        {canView && !loading && error && (
          <div className="mycourses-error">
            <strong>Lỗi tải My Courses</strong>
            <div>{error}</div>
            <div className="mycourses-error-hint">
              Endpoint đang gọi: <code>{endpoint}</code>
              <br />
              Nếu backend của bạn dùng endpoint khác, set <code>VITE_MY_COURSES_ENDPOINT</code> trong file <code>frontend/.env</code>.
            </div>
          </div>
        )}

        {canView && !loading && !error && courses.length === 0 && (
          <div className="mycourses-empty">
            Chưa có khóa học nào. Bạn có thể tạo khóa học mới ở backend hoặc bổ sung UI tạo course sau.
          </div>
        )}

        {canView && !loading && !error && courses.length > 0 && (
          <div className="mycourses-grid">
            {courses.map((c) => (
              <article key={getCourseKey(c)} className="mycourses-card">
                <div className="mycourses-card-top">
                  <div className="mycourses-card-title">{getCourseTitle(c)}</div>
                  {c?.status && <span className="mycourses-pill">{String(c.status)}</span>}
                </div>
                {c?.instructorName && (
                  <p className="mycourses-card-instructor">GV: {c.instructorName}</p>
                )}
                {getCourseDesc(c) && <p className="mycourses-card-desc">{getCourseDesc(c)}</p>}
                <div className="mycourses-card-meta">
                  {c?.price !== undefined && c?.price !== null && (
                    <span className="mycourses-price">{formatPrice(c.price)}</span>
                  )}
                  {Number(c?.chapterCount) >= 0 && (
                    <span className="mycourses-chapters">{c.chapterCount} chương</span>
                  )}
                </div>
                <div className="mycourses-card-actions">
                  <Link
                    to={`/courses/${getCourseKey(c)}/curriculum`}
                    className="mycourses-card-link"
                  >
                    Chương trình
                  </Link>
                  <Link
                    to={`/courses/${getCourseKey(c)}/progress`}
                    className="mycourses-card-link"
                  >
                    Tiến độ
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyCourses

