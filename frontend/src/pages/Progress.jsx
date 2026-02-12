import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { progressApi } from '../api'
import './Progress.css'

const STATUS_LABELS = {
  NOT_STARTED: 'Chưa học',
  COMPLETED: 'Đã hoàn thành',
  IN_PROGRESS: 'Đang học',
}

const getMockProgress = (courseId) => ({
  enrollmentId: 'mock-enrollment',
  courseId,
  courseTitle: 'Khóa học (dữ liệu mẫu)',
  statusCourse: 'IN_PROGRESS',
  percentComplete: 35,
  enrollmentDate: new Date().toISOString(),
  lastUpdate: new Date().toISOString(),
  processes: [
    { processId: 'p1', contentId: 'c1', statusContent: 'COMPLETED', percentComplete: 100, updateDate: new Date().toISOString() },
    { processId: 'p2', contentId: 'c2', statusContent: 'COMPLETED', percentComplete: 100, updateDate: new Date().toISOString() },
    { processId: 'p3', contentId: 'c3', statusContent: 'NOT_STARTED', percentComplete: 50, updateDate: new Date().toISOString() },
  ],
})

const Progress = () => {
  const { courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!courseId) {
      setLoading(false)
      setError('Thiếu courseId.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    progressApi
      .getProgressByCourse(courseId)
      .then((res) => {
        const data = res.data?.data ?? res.data
        if (!cancelled) setProgress(data)
      })
      .catch((e) => {
        if (!cancelled) {
          const status = e.response?.status
          const msg =
            e.response?.data?.message ||
            e.response?.data?.errorCode ||
            e.message ||
            'Không tải được tiến độ.'
          if (status === 404) {
            setError('Bạn chưa đăng ký khóa học này hoặc API tiến độ chưa sẵn sàng.')
          } else {
            setError(msg)
          }
          setProgress(getMockProgress(courseId))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  const percent = progress?.percentComplete ?? 0
  const lastUpdate = progress?.lastUpdate
    ? new Date(progress.lastUpdate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className="progress-page">
      <Header />
      <main className="progress-main">
        <div className="progress-header">
          <Link to="/courses" className="progress-back">← Khóa học</Link>
          <h1>Tiến độ khóa học</h1>
          {progress?.courseTitle && (
            <p className="progress-course-title">{progress.courseTitle}</p>
          )}
        </div>

        {loading && <div className="progress-loading">Đang tải tiến độ...</div>}

        {!loading && error && (
          <div className="progress-error">
            {error}
            <div className="progress-error-hint">
              Backend cần endpoint: <code>GET /api/v1/courses/{courseId}/progress</code> (user đã đăng ký khóa học).
            </div>
            <Link to="/courses" className="progress-btn-link">Xem khóa học</Link>
          </div>
        )}

        {!loading && !error && progress && (
          <div className="progress-content">
            {error && (
              <div className="progress-error-inline">{error}</div>
            )}
            <div className="progress-summary">
              <div className="progress-bar-wrap">
                <div className="progress-bar-label">
                  <span>Tiến độ tổng</span>
                  <span>{Math.round(percent)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>
              {lastUpdate && (
                <p className="progress-last-update">Cập nhật lần cuối: {lastUpdate}</p>
              )}
              {progress.statusCourse && (
                <p className="progress-status">
                  Trạng thái: <strong>{STATUS_LABELS[progress.statusCourse] ?? progress.statusCourse}</strong>
                </p>
              )}
            </div>

            {progress.processes && progress.processes.length > 0 && (
              <section className="progress-list-section">
                <h2>Chi tiết theo nội dung</h2>
                <ul className="progress-list">
                  {progress.processes.map((p) => (
                    <li key={p.processId} className="progress-item">
                      <span className="progress-item-status">
                        {STATUS_LABELS[p.statusContent] ?? p.statusContent}
                      </span>
                      <span className="progress-item-content">Content {String(p.contentId).slice(0, 8)}…</span>
                      <span className="progress-item-percent">{Math.round(p.percentComplete)}%</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(!progress.processes || progress.processes.length === 0) && (
              <p className="progress-empty-detail">Chưa có bản ghi tiến độ chi tiết. Hoàn thành nội dung trong khóa học để cập nhật.</p>
            )}

            <div className="progress-actions">
              <Link to={`/courses/${courseId}/curriculum`} className="progress-btn-link">
                Xem chương trình khóa học
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Progress
