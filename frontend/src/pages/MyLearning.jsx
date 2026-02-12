import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { paymentApi, courseApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './MyLearning.css'

const DEMO_PAID_KEY = 'unicode_demo_paid_courses'

const getDemoPaidCourseIds = () => {
  try {
    const raw = localStorage.getItem(DEMO_PAID_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const extractCoursesFromSubscriptions = (list) => {
  if (!Array.isArray(list)) return []
  return list.map((s) => {
    const course = s?.course ?? s
    const courseId = course?.courseId ?? s?.courseId ?? s?.courseraId ?? course?.id
    return {
      courseId,
      title: course?.title ?? course?.courseName ?? 'Khóa học',
      description: course?.description,
      instructorName: course?.instructorName,
      statusPayment: s?.statusPayment,
      dateStart: s?.dateStart,
      dateEnd: s?.dateEnd,
      subcriptionId: s?.subcriptionId,
    }
  }).filter((c) => c.courseId)
}

const MyLearning = () => {
  const [searchParams] = useSearchParams()
  const purchasedCourseId = searchParams.get('purchased') || searchParams.get('courseId')
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      setCourses([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    paymentApi
      .getMySubscriptions()
      .then((res) => {
        const data = res.data?.data ?? res.data
        const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : data?.items ?? data?.results ?? [])
        const fromApi = extractCoursesFromSubscriptions(Array.isArray(list) ? list : [])
        const demoIds = getDemoPaidCourseIds()
        const apiIds = new Set(fromApi.map((c) => String(c.courseId)))
        const merged = [...fromApi]
        demoIds.forEach((id) => {
          if (id && !apiIds.has(String(id))) {
            apiIds.add(String(id))
            merged.push({ courseId: id, title: 'Khóa học (demo)', isDemo: true })
          }
        })
        if (!cancelled) setCourses(merged)
      })
      .catch((e) => {
        if (!cancelled) {
          const status = e.response?.status
          if (status === 404 || status === 400) {
            const demoIds = getDemoPaidCourseIds()
            const merged = demoIds.map((id) => ({ courseId: id, title: 'Khóa học (demo)', isDemo: true }))
            setCourses(merged)
            setError('')
          } else {
            setError(e.response?.data?.message || e.message || 'Không tải được danh sách khóa học đã mua.')
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="mylearning-page">
        <Header />
        <main className="mylearning-main">
          <p className="mylearning-unauth">Vui lòng đăng nhập để xem khóa học đã mua.</p>
          <Link to="/login" className="mylearning-btn">Đăng nhập</Link>
        </main>
      </div>
    )
  }

  const hasPurchasedHighlight = purchasedCourseId && courses.some((c) => String(c.courseId) === String(purchasedCourseId))
  const displayList = hasPurchasedHighlight
    ? [...courses].sort((a, b) => (String(b.courseId) === String(purchasedCourseId) ? 1 : String(a.courseId) === String(purchasedCourseId) ? -1 : 0))
    : courses

  return (
    <div className="mylearning-page">
      <Header />
      <main className="mylearning-main">
        <div className="mylearning-header">
          <h1>Khóa học đã mua</h1>
          <p className="mylearning-desc">Kích hoạt và bắt đầu học. Chọn khóa để xem chương trình hoặc tiến độ.</p>
        </div>

        {purchasedCourseId && (
          <div className="mylearning-banner" role="status">
            Khóa học vừa được kích hoạt. Bạn có thể vào học ngay bên dưới.
          </div>
        )}

        {loading && <div className="mylearning-loading">Đang tải khóa học đã mua...</div>}
        {!loading && error && <div className="mylearning-error">{error}</div>}

        {!loading && displayList.length === 0 && !error && (
          <div className="mylearning-empty">
            <p>Bạn chưa có khóa học nào. Mua khóa học để bắt đầu.</p>
            <Link to="/courses" className="mylearning-btn mylearning-btn-primary">Xem khóa học</Link>
          </div>
        )}

        {!loading && displayList.length > 0 && (
          <div className="mylearning-grid">
            {displayList.map((c) => {
              const id = c.courseId
              const isHighlight = String(id) === String(purchasedCourseId)
              return (
                <article
                  key={id}
                  className={`mylearning-card ${isHighlight ? 'mylearning-card--highlight' : ''}`}
                >
                  {isHighlight && <span className="mylearning-card-badge">Vừa kích hoạt</span>}
                  <div className="mylearning-card-title">{c.title}</div>
                  {c.description && <p className="mylearning-card-desc">{c.description}</p>}
                  {c.instructorName && <p className="mylearning-card-meta">GV: {c.instructorName}</p>}
                  <div className="mylearning-card-actions">
                    <Link to={`/courses/${id}/curriculum`} className="mylearning-card-btn mylearning-card-btn-primary">
                      Vào học / Xem chương trình
                    </Link>
                    <Link to={`/courses/${id}/progress`} className="mylearning-card-btn mylearning-card-btn-ghost">
                      Tiến độ
                    </Link>
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
