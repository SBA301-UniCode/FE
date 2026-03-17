import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import FeedbackModal from '../components/feedback/FeedbackModal'
import { courseApi, feedbackApi } from '../api'
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
    if (!courseId || !isAuthenticated) {
      setCanFeedback(false)
      return
    }
    try {
      const res = await feedbackApi.canFeedback(courseId)
      const data = unwrap(res)
      setCanFeedback(data === true || data === 'true')
    } catch {
      setCanFeedback(false)
    }
  }

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    setError('')
    courseApi.getById(courseId)
      .then((res) => {
        if (cancelled) return
        setCourse(unwrap(res))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.response?.data?.message || e.message || 'Không tải được chi tiết khóa học.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  useEffect(() => {
    loadFeedback()
    loadCanFeedback()
  }, [courseId, isAuthenticated])

  const averageRatingText = useMemo(() => {
    const ratings = feedbacks.map((f) => Number(f?.rating) || 0).filter((x) => x > 0)
    if (ratings.length === 0) return 'Chưa có đánh giá'
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    return `${avg.toFixed(1)}★ (${ratings.length} đánh giá)`
  }, [feedbacks])

  const handleCreateFeedback = async ({ comment, rating, fileList }) => {
    setSubmitting(true)
    try {
      await feedbackApi.create(courseId, { comment, rating }, fileList)
      setCreateModalOpen(false)
      await Promise.all([loadFeedback(), loadCanFeedback()])
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Tạo bình luận thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateFeedback = async ({ comment, rating, imageRemoveId, fileList }) => {
    if (!editingFeedback) return
    setSubmitting(true)
    try {
      const updatePayload = {
        comment,
        rating,
        ...(Array.isArray(imageRemoveId) && imageRemoveId.length > 0 ? { imageRemoveId } : {}),
      }
      await feedbackApi.update(
        getFeedbackId(editingFeedback),
        updatePayload,
        fileList
      )
      setEditingFeedback(null)
      await loadFeedback()
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Cập nhật bình luận thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFeedback = async (feedbackId) => {
    if (!feedbackId) return
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return
    try {
      await feedbackApi.delete(feedbackId)
      await Promise.all([loadFeedback(), loadCanFeedback()])
    } catch (e) {
      setFeedbackError(e?.response?.data?.message || e.message || 'Xóa bình luận thất bại.')
    }
  }

  return (
    <div className="course-detail-page">
      <Header />
      <main className="course-detail-main">
        <div className="course-detail-top">
          <Link to="/courses" className="course-detail-back">← Quay lại Courses</Link>
        </div>

        {loading && <div className="course-detail-box">Đang tải chi tiết khóa học...</div>}
        {!loading && error && <div className="course-detail-box course-detail-box-error">{error}</div>}

        {!loading && !error && course && (
          <section className="course-detail-hero">
            <div className="course-detail-hero-left">
              {getCourseImage(course) ? (
                <img src={getCourseImage(course)} alt={course?.title || 'course'} />
              ) : (
                <div className="course-detail-no-image">UniCode</div>
              )}
            </div>
            <div className="course-detail-hero-right">
              <h1>{course?.title || 'Khóa học'}</h1>
              <p>{course?.description || 'Khóa học chưa có mô tả.'}</p>
              <div className="course-detail-rating">{averageRatingText}</div>
              {canFeedback && (
                <button
                  type="button"
                  className="course-detail-btn"
                  onClick={() => setCreateModalOpen(true)}
                >
                  Viết bình luận
                </button>
              )}
            </div>
          </section>
        )}

        <section className="course-detail-feedback">
          <h2>Bình luận</h2>
          {feedbackLoading && <div className="course-detail-box">Đang tải bình luận...</div>}
          {!feedbackLoading && feedbackError && (
            <div className="course-detail-box course-detail-box-error">{feedbackError}</div>
          )}
          {!feedbackLoading && !feedbackError && feedbacks.length === 0 && (
            <div className="course-detail-box">Chưa có bình luận nào.</div>
          )}

          {!feedbackLoading && feedbacks.length > 0 && (
            <div className="course-detail-feedback-list">
              {feedbacks.map((fb) => {
                const feedbackId = getFeedbackId(fb)
                const imageList = getImageList(fb)
                const canEdit = canEditMap[feedbackId] === true
                return (
                  <article key={feedbackId || `${fb.comment}-${getFeedbackDate(fb)}`} className="course-detail-feedback-item">
                    <div className="course-detail-feedback-head">
                      <div>
                        <strong>{getFeedbackUser(fb)}</strong>
                        <div className="course-detail-feedback-time">{formatDate(getFeedbackDate(fb))}</div>
                      </div>
                      <span>{Number(fb?.rating || 0).toFixed(1)}★</span>
                    </div>
                    <p>{fb?.comment || ''}</p>
                    {imageList.length > 0 && (
                      <div className="course-detail-feedback-images">
                        {imageList.map((img) => (
                          <img
                            key={img.imageId || img.imageUrl}
                            src={img.imageUrl}
                            alt="feedback"
                            loading="lazy"
                            onClick={() => setLightboxImageUrl(img.imageUrl)}
                          />
                        ))}
                      </div>
                    )}
                    {canEdit && (
                      <div className="course-detail-feedback-actions">
                        <button type="button" onClick={() => setEditingFeedback(fb)}>Sửa</button>
                        <button type="button" className="danger" onClick={() => handleDeleteFeedback(feedbackId)}>Xóa</button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {lightboxImageUrl && (
        <div className="course-detail-lightbox" onClick={() => setLightboxImageUrl('')}>
          <img src={lightboxImageUrl} alt="preview" />
        </div>
      )}

      <FeedbackModal
        open={createModalOpen}
        title="Viết bình luận"
        submitText="Gửi bình luận"
        submitting={submitting}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFeedback}
      />

      <FeedbackModal
        open={Boolean(editingFeedback)}
        title="Sửa bình luận"
        submitText="Lưu thay đổi"
        submitting={submitting}
        initialValues={{ comment: editingFeedback?.comment || '', rating: Number(editingFeedback?.rating) || 5 }}
        existingImages={getImageList(editingFeedback)}
        onClose={() => setEditingFeedback(null)}
        onSubmit={handleUpdateFeedback}
      />
    </div>
  )
}

export default CourseDetail
