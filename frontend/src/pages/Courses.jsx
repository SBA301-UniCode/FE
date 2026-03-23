import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { courseApi, enrollmentApi, feedbackApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import StarRating from '../components/StarRating'
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
const getFeedbackId = (f) => f?.feedBackId || f?.feedbackId || f?.id || ''
const getFeedbackUser = (f) =>
  f?.userResponse?.fullName ||
  f?.userResponse?.name ||
  f?.userResponse?.username ||
  f?.userResponse?.email ||
  'Học viên'
const getFeedbackImages = (f) =>
  Array.isArray(f?.imageResponses)
    ? f.imageResponses.map((img) => img?.imageUrl || img?.url || '').filter(Boolean)
    : []
const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const getCourseImage = (c) => {
  const image = c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || c?.courseImage
  return typeof image === 'string' ? image.trim() : ''
}
const toFeedbackList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}
const clampRating = (value) => {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(5, n))
}
const buildRatingSummary = (feedbacks = []) => {
  const ratings = feedbacks.map((f) => clampRating(f?.rating)).filter((x) => x > 0)
  if (ratings.length === 0) return { count: 0, avg: 0 }
  const sum = ratings.reduce((acc, cur) => acc + cur, 0)
  return { count: ratings.length, avg: sum / ratings.length }
}
const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price)
  if (Number.isNaN(num)) return String(price)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}
const toAverageText = (summary) => {
  if (!summary?.count) return 'Chưa có đánh giá'
  return `${summary.avg.toFixed(1)}★ (${summary.count})`
}

const guessLevel = (c) => {
  const title = (c?.title || '').toLowerCase()
  const desc = (c?.description || '').toLowerCase()
  if (title.includes('advanced') || title.includes('nâng cao') || desc.includes('advanced')) return 'Advanced'
  if (title.includes('master') || title.includes('chuyên') || desc.includes('master')) return 'Advanced'
  if (title.includes('intermediate') || title.includes('trung cấp')) return 'Intermediate'
  if (title.includes('beginner') || title.includes('cơ bản') || title.includes('nhập môn')) return 'Beginner'
  return 'All Levels'
}

const extractSkills = (c) => {
  const title = c?.title || ''
  const keywords = ['Java', 'Python', 'React', 'Spring', 'Node.js', 'JavaScript', 'TypeScript',
    'OOP', 'SQL', 'MongoDB', 'Docker', 'AWS', 'REST API', 'HTML', 'CSS', 'Git',
    'Machine Learning', 'Data Science', 'Frontend', 'Backend', 'DevOps', 'Pandas',
    'Numpy', 'Matplotlib', 'Hooks', 'Router', 'Redux', 'Collections', 'Streams'
  ]
  const found = keywords.filter(k => title.toLowerCase().includes(k.toLowerCase()))
  if (found.length === 0) {
    const desc = c?.description || ''
    return keywords.filter(k => desc.toLowerCase().includes(k.toLowerCase())).slice(0, 3)
  }
  return found.slice(0, 3)
}

const estimateDuration = (c) => {
  const chapters = Number(c?.chapterCount) || 0
  if (chapters <= 0) return null
  const hours = Math.max(2, chapters * 4)
  return `${hours} hours`
}

const estimateLearners = (id) => {
  let hash = 0
  for (let i = 0; i < String(id).length; i++) { hash = (hash * 31 + String(id).charCodeAt(i)) & 0x7fffffff }
  return 200 + (hash % 3000)
}

const FILTER_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Free']

const SkeletonCard = () => (
  <article className="courses-card courses-card--skeleton">
    <div className="courses-card-media"><div className="skeleton skeleton-image" /></div>
    <div className="courses-card-body">
      <div className="skeleton skeleton-line skeleton-line--title" />
      <div className="skeleton skeleton-line skeleton-line--short" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line skeleton-line--short" />
    </div>
  </article>
)

const Courses = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])
  const [enrolledMap, setEnrolledMap] = useState({})
  const [brokenImages, setBrokenImages] = useState({})
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [feedbackByCourse, setFeedbackByCourse] = useState({})
  const [feedbackLoadingByCourse, setFeedbackLoadingByCourse] = useState({})
  const [feedbackErrorByCourse, setFeedbackErrorByCourse] = useState({})
  const [canFeedbackByCourse, setCanFeedbackByCourse] = useState({})
  const [canEditByFeedback, setCanEditByFeedback] = useState({})
  const [ratingSummaryByCourse, setRatingSummaryByCourse] = useState({})
  const [draftByCourse, setDraftByCourse] = useState({})
  const [editingByCourse, setEditingByCourse] = useState({})
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [sortBy, setSortBy] = useState('default')
  const [filterLevel, setFilterLevel] = useState('All')
  const [currentPage, setCurrentPage] = useState(0)
  const ITEMS_PER_PAGE = 12

  const filteredCourses = useMemo(() => {
    let result = [...courses]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((c) => {
        const title = getCourseTitle(c).toLowerCase()
        const desc = getCourseDesc(c).toLowerCase()
        return title.includes(q) || desc.includes(q)
      })
    }
    if (filterLevel !== 'All') {
      if (filterLevel === 'Free') {
        result = result.filter((c) => !c.price || Number(c.price) === 0)
      } else {
        result = result.filter((c) => guessLevel(c) === filterLevel)
      }
    }
    if (sortBy === 'name-asc') result.sort((a, b) => getCourseTitle(a).localeCompare(getCourseTitle(b)))
    else if (sortBy === 'name-desc') result.sort((a, b) => getCourseTitle(b).localeCompare(getCourseTitle(a)))
    else if (sortBy === 'price-asc') result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    else if (sortBy === 'price-desc') result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    else if (sortBy === 'rating') {
      result.sort((a, b) => {
        const ra = ratingSummaryByCourse[getCourseKey(a)]?.avg || 0
        const rb = ratingSummaryByCourse[getCourseKey(b)]?.avg || 0
        return rb - ra
      })
    }
    return result
  }, [courses, searchQuery, sortBy, filterLevel, ratingSummaryByCourse])

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE)
  const pagedCourses = filteredCourses.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

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

  useEffect(() => {
    if (courses.length === 0) return
    let cancelled = false
    const run = async () => {
      const summaryMap = {}
      await Promise.all(
        courses.map(async (course) => {
          const id = getCourseKey(course)
          if (!id) return
          try {
            const res = await feedbackApi.getByCourse(id, 1, 50)
            const list = toFeedbackList(unwrap(res))
            summaryMap[id] = buildRatingSummary(list)
          } catch {
            summaryMap[id] = { count: 0, avg: 0 }
          }
        })
      )
      if (!cancelled) setRatingSummaryByCourse(summaryMap)
    }
    run()
    return () => { cancelled = true }
  }, [courses])

  const loadCanEditMap = async (feedbacks) => {
    const map = {}
    await Promise.all(
      feedbacks.map(async (fb) => {
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
    setCanEditByFeedback((prev) => ({ ...prev, ...map }))
  }

  const loadFeedbackDetail = async (courseId) => {
    if (!courseId) return
    setFeedbackLoadingByCourse((prev) => ({ ...prev, [courseId]: true }))
    setFeedbackErrorByCourse((prev) => ({ ...prev, [courseId]: '' }))
    try {
      const res = await feedbackApi.getByCourse(courseId, 1, 20)
      const list = toFeedbackList(unwrap(res))
      setFeedbackByCourse((prev) => ({ ...prev, [courseId]: list }))
      setRatingSummaryByCourse((prev) => ({ ...prev, [courseId]: buildRatingSummary(list) }))
      await loadCanEditMap(list)
    } catch (e) {
      setFeedbackErrorByCourse((prev) => ({
        ...prev,
        [courseId]: e.response?.data?.message || e.message || 'Không tải được bình luận.',
      }))
    } finally {
      setFeedbackLoadingByCourse((prev) => ({ ...prev, [courseId]: false }))
    }
  }

  const loadCanFeedback = async (courseId) => {
    if (!courseId || !isAuthenticated) {
      setCanFeedbackByCourse((prev) => ({ ...prev, [courseId]: false }))
      return
    }
    try {
      const res = await feedbackApi.canFeedback(courseId)
      const data = unwrap(res)
      setCanFeedbackByCourse((prev) => ({ ...prev, [courseId]: data === true || data === 'true' }))
    } catch {
      setCanFeedbackByCourse((prev) => ({ ...prev, [courseId]: false }))
    }
  }

  const handleBuy = (course) => {
    const id = course?.courseId || course?.id
    if (!id) return
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/courses', returnTo: `/payment?courseId=${id}` } })
      return
    }
    navigate(`/payment?courseId=${id}`, { state: { course } })
  }

  const handleOpenDetail = async (courseId) => {
    if (!courseId) return
    navigate(`/courses/${courseId}`)
  }

  const handleCreateFeedback = async (courseId) => {
    const draft = draftByCourse[courseId] || { comment: '', rating: 5 }
    const rating = clampRating(draft.rating)
    if (!draft.comment?.trim()) return
    try {
      await feedbackApi.create(courseId, { comment: draft.comment.trim(), rating })
      setDraftByCourse((prev) => ({ ...prev, [courseId]: { comment: '', rating: 5 } }))
      await Promise.all([loadFeedbackDetail(courseId), loadCanFeedback(courseId)])
    } catch (e) {
      setFeedbackErrorByCourse((prev) => ({
        ...prev,
        [courseId]: e.response?.data?.message || e.message || 'Gửi bình luận thất bại.',
      }))
    }
  }

  const handleSaveEdit = async (courseId) => {
    const edit = editingByCourse[courseId]
    if (!edit?.feedbackId) return
    if (!edit.comment?.trim()) return
    try {
      await feedbackApi.update(edit.feedbackId, {
        comment: edit.comment.trim(),
        rating: clampRating(edit.rating),
      })
      setEditingByCourse((prev) => ({ ...prev, [courseId]: null }))
      await loadFeedbackDetail(courseId)
    } catch (e) {
      setFeedbackErrorByCourse((prev) => ({
        ...prev,
        [courseId]: e.response?.data?.message || e.message || 'Cập nhật bình luận thất bại.',
      }))
    }
  }

  const handleDeleteFeedback = async (courseId, feedbackId) => {
    if (!feedbackId) return
    try {
      await feedbackApi.delete(feedbackId)
      await Promise.all([loadFeedbackDetail(courseId), loadCanFeedback(courseId)])
    } catch (e) {
      setFeedbackErrorByCourse((prev) => ({
        ...prev,
        [courseId]: e.response?.data?.message || e.message || 'Xóa bình luận thất bại.',
      }))
    }
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

        {!loading && !error && courses.length > 0 && (
          <div className="courses-toolbar">
            <div className="courses-search-wrap">
              <svg className="courses-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="courses-search-input"
                placeholder="Tìm kiếm khóa học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="courses-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
            <select
              className="courses-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="name-asc">Tên A → Z</option>
              <option value="name-desc">Tên Z → A</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
            <span className="courses-result-count">{filteredCourses.length} khóa học</span>
          </div>
        )}

        {/* Filter Pills */}
        {!loading && !error && courses.length > 0 && (
          <div className="courses-filter-pills">
            {FILTER_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className={`courses-filter-pill${filterLevel === level ? ' courses-filter-pill--active' : ''}`}
                onClick={() => { setFilterLevel(level); setCurrentPage(0) }}
              >
                {level === 'All' ? 'Tất cả' : level === 'Free' ? 'Miễn phí' : level}
              </button>
            ))}
          </div>
        )}

        {/* Skeleton Loading */}
        {loading && (
          <div className="courses-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        {!loading && error && <div className="courses-error">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <div className="courses-empty-state">
            <span className="courses-empty-icon">🎓</span>
            <h3>Chưa có khóa học nào</h3>
            <p>Hãy quay lại sau để khám phá các khóa học mới nhất!</p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
          <div className="courses-grid">
            {pagedCourses.map((c) => {
              const id = getCourseKey(c)
              const enrolled = enrolledMap[id]
              const imageUrl = getCourseImage(c)
              const showImage = Boolean(imageUrl) && !brokenImages[id]
              const title = getCourseTitle(c)
              const ratingSummary = ratingSummaryByCourse[id] || buildRatingSummary([])
              const feedbacks = feedbackByCourse[id] || []
              const isFeedbackLoading = feedbackLoadingByCourse[id]
              const feedbackError = feedbackErrorByCourse[id]
              const canFeedback = canFeedbackByCourse[id] === true
              const draft = draftByCourse[id] || { comment: '', rating: 5 }
              const editing = editingByCourse[id]
              const showDetail = selectedCourseId === id
              return (
                <article key={id} className="courses-card">
                  <div className="courses-card-media">
                    {showImage ? (
                      <Link to={`/courses/${id}`}>
                        <img
                          src={imageUrl}
                          alt={title}
                          className="courses-card-image"
                          loading="lazy"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [id]: true }))
                          }
                        />
                      </Link>
                    ) : (
                      <div className="courses-card-image-fallback" aria-hidden="true">
                        <span className="courses-card-image-fallback-icon">&lt;/&gt;</span>
                        <span className="courses-card-image-fallback-text">UniCode</span>
                      </div>
                    )}
                    <span className="courses-card-level-badge">{guessLevel(c)}</span>
                  </div>
                  <div className="courses-card-body">
                    <div className="courses-card-provider">
                      <span className="courses-card-provider-logo">&lt;/&gt;</span>
                      <span className="courses-card-provider-name">UniCode</span>
                    </div>
                    <div className="courses-card-top">
                      <div className="courses-card-title-wrap">
                        <Link to={`/courses/${id}`} className="courses-card-title-link">
                          <div className="courses-card-title">{title}</div>
                        </Link>
                      </div>
                      {enrolled && <span className="courses-enrolled-badge">Đã đăng ký</span>}
                    </div>
                    {extractSkills(c).length > 0 && (
                      <div className="courses-card-skills">
                        {extractSkills(c).map((s) => (
                          <span key={s} className="courses-card-skill-tag">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="courses-card-rating">
                      <StarRating rating={ratingSummary.avg || 0} count={ratingSummary.count || 0} size="0.9rem" />
                    </div>
                    <div className="courses-card-detail-row">
                      <span className="courses-card-detail-level">{guessLevel(c)}</span>
                      {estimateDuration(c) && <><span className="courses-card-detail-sep">·</span><span>{estimateDuration(c)}</span></>}
                      <span className="courses-card-detail-sep">·</span>
                      <span>Course</span>
                    </div>
                    <div className="courses-card-social">
                      <span className="courses-card-learners">👥 {estimateLearners(id).toLocaleString()} enrolled</span>
                    </div>
                    <div className="courses-card-meta">
                      <span className="courses-price">{formatPrice(c.price)}</span>
                      {Number(c?.chapterCount) >= 0 && (
                        <span className="courses-chapters">{c.chapterCount} chương</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="courses-btn-detail"
                      onClick={() => handleOpenDetail(id)}
                    >
                      Xem mô tả & bình luận
                    </button>
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

                    {showDetail && (
                      <div className="courses-feedback-panel">
                        <p className="courses-feedback-desc">{getCourseDesc(c) || 'Khóa học chưa có mô tả.'}</p>
                        {isFeedbackLoading && <div className="courses-feedback-loading">Đang tải bình luận...</div>}
                        {!!feedbackError && <div className="courses-feedback-error">{feedbackError}</div>}

                        {canFeedback && (
                          <div className="courses-feedback-form">
                            <h4>Viết bình luận</h4>
                            <textarea
                              className="courses-feedback-input"
                              value={draft.comment}
                              placeholder="Nhập cảm nhận của bạn..."
                              onChange={(e) =>
                                setDraftByCourse((prev) => ({
                                  ...prev,
                                  [id]: { ...draft, comment: e.target.value },
                                }))
                              }
                            />
                            <div className="courses-feedback-form-row">
                              <label htmlFor={`rating-${id}`}>Số sao</label>
                              <select
                                id={`rating-${id}`}
                                value={draft.rating}
                                onChange={(e) =>
                                  setDraftByCourse((prev) => ({
                                    ...prev,
                                    [id]: { ...draft, rating: Number(e.target.value) },
                                  }))
                                }
                              >
                                <option value={5}>5</option>
                                <option value={4}>4</option>
                                <option value={3}>3</option>
                                <option value={2}>2</option>
                                <option value={1}>1</option>
                              </select>
                              <button type="button" className="courses-btn-feedback" onClick={() => handleCreateFeedback(id)}>
                                Gửi bình luận
                              </button>
                            </div>
                          </div>
                        )}

                        {!isFeedbackLoading && feedbacks.length === 0 && (
                          <div className="courses-feedback-empty">Chưa có bình luận nào.</div>
                        )}

                        {feedbacks.map((fb, index) => {
                          const feedbackId = getFeedbackId(fb)
                          const canEdit = canEditByFeedback[feedbackId] === true
                          const isEditing = editing?.feedbackId === feedbackId
                          return (
                            <div key={feedbackId || `${id}-${index}`} className="courses-feedback-item">
                              <div className="courses-feedback-item-top">
                                <strong>{getFeedbackUser(fb)}</strong>
                                <span>{clampRating(isEditing ? editing.rating : fb.rating).toFixed(1)}★</span>
                              </div>
                              {isEditing ? (
                                <>
                                  <textarea
                                    className="courses-feedback-input"
                                    value={editing.comment}
                                    onChange={(e) =>
                                      setEditingByCourse((prev) => ({
                                        ...prev,
                                        [id]: { ...editing, comment: e.target.value },
                                      }))
                                    }
                                  />
                                  <div className="courses-feedback-form-row">
                                    <label htmlFor={`edit-rating-${feedbackId}`}>Số sao</label>
                                    <select
                                      id={`edit-rating-${feedbackId}`}
                                      value={editing.rating}
                                      onChange={(e) =>
                                        setEditingByCourse((prev) => ({
                                          ...prev,
                                          [id]: { ...editing, rating: Number(e.target.value) },
                                        }))
                                      }
                                    >
                                      <option value={5}>5</option>
                                      <option value={4}>4</option>
                                      <option value={3}>3</option>
                                      <option value={2}>2</option>
                                      <option value={1}>1</option>
                                    </select>
                                    <button type="button" className="courses-btn-feedback" onClick={() => handleSaveEdit(id)}>
                                      Lưu
                                    </button>
                                    <button
                                      type="button"
                                      className="courses-btn-feedback courses-btn-feedback-cancel"
                                      onClick={() => setEditingByCourse((prev) => ({ ...prev, [id]: null }))}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p>{fb.comment || ''}</p>
                                  {getFeedbackImages(fb).length > 0 && (
                                    <div className="courses-feedback-images">
                                      {getFeedbackImages(fb).map((imgUrl) => (
                                        <img key={imgUrl} src={imgUrl} alt="feedback" loading="lazy" />
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                              {canEdit && !isEditing && (
                                <div className="courses-feedback-actions">
                                  <button
                                    type="button"
                                    className="courses-btn-feedback"
                                    onClick={() =>
                                      setEditingByCourse((prev) => ({
                                        ...prev,
                                        [id]: {
                                          feedbackId,
                                          comment: fb.comment || '',
                                          rating: clampRating(fb.rating) || 5,
                                        },
                                      }))
                                    }
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="courses-btn-feedback courses-btn-feedback-danger"
                                    onClick={() => handleDeleteFeedback(id, feedbackId)}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* ── Pagination Controls ── */}
          {totalPages > 1 && (
            <div className="courses-pagination">
              <button
                className="courses-pagination-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ← Trước
              </button>
              <div className="courses-pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`courses-pagination-page${currentPage === i ? ' courses-pagination-page--active' : ''}`}
                    onClick={() => setCurrentPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                className="courses-pagination-btn"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Sau →
              </button>
            </div>
          )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Courses
