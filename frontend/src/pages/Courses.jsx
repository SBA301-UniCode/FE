import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { courseApi, enrollmentApi } from '../api'
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
const getCourseImage = (c) => {
  const image = c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || c?.courseImage
  return typeof image === 'string' ? image.trim() : ''
}
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
  const [enrolledMap, setEnrolledMap] = useState({})
  const [brokenImages, setBrokenImages] = useState({})

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

  useEffect(() => {
    if (!isAuthenticated || courses.length === 0) return
    let cancelled = false

    const checkEnrollments = async () => {
      const map = {}
      await Promise.all(
        courses.map(async (c) => {
          const id = getCourseKey(c)
          if (!id) return
          try {
            const res = await enrollmentApi.isEnrolled(id)
            const data = res.data?.data ?? res.data
            map[id] = data === true || data === 'true'
          } catch {
            map[id] = false
          }
        })
      )
      if (!cancelled) setEnrolledMap(map)
    }
    checkEnrollments()
    return () => { cancelled = true }
  }, [isAuthenticated, courses])

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
            {courses.map((c) => {
              const id = getCourseKey(c)
              const enrolled = enrolledMap[id]
              const imageUrl = getCourseImage(c)
              const showImage = Boolean(imageUrl) && !brokenImages[id]
              const title = getCourseTitle(c)
              return (
                <article key={id} className="courses-card">
                  <div className="courses-card-media">
                    {showImage ? (
                      <img
                        src={imageUrl}
                        alt={title}
                        className="courses-card-image"
                        loading="lazy"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [id]: true }))
                        }
                      />
                    ) : (
                      <div className="courses-card-image-fallback" aria-hidden="true">
                        <span className="courses-card-image-fallback-icon">&lt;/&gt;</span>
                        <span className="courses-card-image-fallback-text">UniCode</span>
                      </div>
                    )}
                  </div>
                  <div className="courses-card-body">
                    <div className="courses-card-top">
                      <div className="courses-card-title">{title}</div>
                      {enrolled && <span className="courses-enrolled-badge">Đã đăng ký</span>}
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
                    {enrolled ? (
                      <Link
                        to={`/learning/${id}`}
                        className="courses-btn-learn"
                      >
                        Vào học
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="courses-btn-buy"
                        onClick={() => handleBuy(c)}
                      >
                        Mua ngay
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

export default Courses
