import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { courseApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './Courses.css'

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

const Courses = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    courseApi
      .getMyCourses()
      .then((res) => {
        const payload = res.data?.data ?? res.data
        const list = extractList(payload)
        if (!cancelled) setCourses(list)
      })
      .catch((e) => {
        if (!cancelled) {
          if (e.response?.status === 400 || e.response?.status === 404) setCourses([])
          else setError(e.response?.data?.message || e.message || 'Không tải được danh sách khóa học.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleBuy = (course) => {
    const id = course?.courseId || course?.id
    if (!id) return
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/courses', returnTo: `/payment?courseId=${id}` } })
      return
    }
    navigate(`/payment?courseId=${id}`, { state: { course } })
  }

  return (
    <div className="courses-page">
      <Header />
      <main className="courses-main">
        <div className="courses-header">
          <div>
            <h1>Khóa học</h1>
            <p>Chọn khóa học và thanh toán qua MoMo để bắt đầu học.</p>
          </div>
        </div>

        {loading && <div className="courses-loading">Đang tải danh sách khóa học...</div>}
        {!loading && error && <div className="courses-error">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <div className="courses-empty">Chưa có khóa học nào.</div>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="courses-grid">
            {courses.map((c) => (
              <article key={getCourseKey(c)} className="courses-card">
                <div className="courses-card-top">
                  <div className="courses-card-title">{getCourseTitle(c)}</div>
                </div>
                {c?.instructorName && (
                  <p className="courses-card-instructor">GV: {c.instructorName}</p>
                )}
                {getCourseDesc(c) && <p className="courses-card-desc">{getCourseDesc(c)}</p>}
                <div className="courses-card-meta">
                  <span className="courses-price">{formatPrice(c.price)}</span>
                  {Number(c?.chapterCount) >= 0 && (
                    <span className="courses-chapters">{c.chapterCount} chương</span>
                  )}
                </div>
                <div className="courses-card-actions">
                  <Link
                    to={`/courses/${getCourseKey(c)}/curriculum`}
                    className="courses-btn courses-btn-ghost"
                  >
                    Chương trình
                  </Link>
                  {isAuthenticated && (
                    <Link
                      to={`/courses/${getCourseKey(c)}/progress`}
                      className="courses-btn courses-btn-ghost"
                    >
                      Tiến độ
                    </Link>
                  )}
                  <button
                    type="button"
                    className="courses-btn-buy"
                    onClick={() => handleBuy(c)}
                  >
                    Mua ngay
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Courses
