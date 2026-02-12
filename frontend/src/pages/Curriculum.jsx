import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { lessonApi } from '../api'
import './Curriculum.css'

const CONTENT_TYPE_LABELS = {
  VIDEO: 'Video',
  DOCUMENT: 'Tài liệu',
  QUIZ: 'Quiz',
}

const MOCK_CURRICULUM = {
  courseId: null,
  courseTitle: 'Chương trình mẫu (API chưa sẵn sàng)',
  chapters: [
    {
      chapterId: 'mock-ch1',
      title: 'Giới thiệu',
      orderIndex: 0,
      lessons: [
        { lessonId: 'mock-l1', title: 'Bài 1: Mở đầu', orderIndex: 0, contents: [{ contentId: 'mock-c1', contentType: 'VIDEO', lessonId: 'mock-l1' }, { contentId: 'mock-c2', contentType: 'DOCUMENT', lessonId: 'mock-l1' }] },
        { lessonId: 'mock-l2', title: 'Bài 2: Cài đặt môi trường', orderIndex: 1, contents: [{ contentId: 'mock-c3', contentType: 'VIDEO', lessonId: 'mock-l2' }] },
      ],
    },
    {
      chapterId: 'mock-ch2',
      title: 'Nội dung cơ bản',
      orderIndex: 1,
      lessons: [
        { lessonId: 'mock-l3', title: 'Bài 3: Cú pháp cơ bản', orderIndex: 0, contents: [{ contentId: 'mock-c4', contentType: 'VIDEO', lessonId: 'mock-l3' }, { contentId: 'mock-c5', contentType: 'QUIZ', lessonId: 'mock-l3' }] },
      ],
    },
  ],
}

const Curriculum = () => {
  const { courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [curriculum, setCurriculum] = useState(null)

  useEffect(() => {
    if (!courseId) {
      setLoading(false)
      setError('Thiếu courseId.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    lessonApi
      .getCurriculum(courseId)
      .then((res) => {
        const data = res.data?.data ?? res.data
        if (!cancelled) setCurriculum(data)
      })
      .catch((e) => {
        if (!cancelled) {
          const status = e.response?.status
          const msg =
            e.response?.data?.message ||
            e.response?.data?.errorCode ||
            e.message ||
            'Không tải được chương trình khóa học.'
          setError(status === 404 ? 'Chương trình chưa có hoặc khóa học không tồn tại.' : msg)
          setCurriculum({ ...MOCK_CURRICULUM, courseId })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  const title = curriculum?.courseTitle || 'Chương trình khóa học'

  return (
    <div className="curriculum-page">
      <Header />
      <main className="curriculum-main">
        <div className="curriculum-header">
          <Link to="/courses" className="curriculum-back">← Khóa học</Link>
          <h1>{title}</h1>
          <p className="curriculum-subtitle">Nội dung chi tiết theo chương và bài học</p>
        </div>

        {loading && <div className="curriculum-loading">Đang tải chương trình...</div>}

        {!loading && error && !curriculum && (
          <div className="curriculum-error">
            {error}
            <div className="curriculum-error-hint">
              Backend cần endpoint: <code>GET /api/v1/courses/{courseId}/curriculum</code>
            </div>
          </div>
        )}

        {!loading && error && curriculum && (
          <div className="curriculum-demo-banner" role="status">
            Đang hiển thị dữ liệu mẫu — API chưa sẵn sàng. Khi backend có <code>GET /api/v1/courses/{courseId}/curriculum</code>, trang sẽ hiển thị dữ liệu thật.
          </div>
        )}

        {!loading && curriculum && (
          <div className="curriculum-tree">
            {error && (
              <div className="curriculum-error-inline">
                {error}
              </div>
            )}
            {(curriculum.chapters || []).map((ch, chIndex) => (
              <section key={ch.chapterId || chIndex} className="curriculum-chapter">
                <h2 className="curriculum-chapter-title">
                  <span className="curriculum-chapter-num">Chương {ch.orderIndex + 1}</span>
                  {ch.title}
                </h2>
                <ul className="curriculum-lessons">
                  {(ch.lessons || []).map((lesson, lesIndex) => (
                    <li key={lesson.lessonId || lesIndex} className="curriculum-lesson">
                      <div className="curriculum-lesson-title">
                        {lesson.orderIndex + 1}. {lesson.title}
                      </div>
                      <ul className="curriculum-contents">
                        {(lesson.contents || []).map((content, cIndex) => (
                          <li key={content.contentId || cIndex} className="curriculum-content">
                            <span className="curriculum-content-type">
                              {CONTENT_TYPE_LABELS[content.contentType] || content.contentType || 'Nội dung'}
                            </span>
                            <span className="curriculum-content-id">{content.contentId ? String(content.contentId).slice(0, 8) + '…' : ''}</span>
                          </li>
                        ))}
                        {(!lesson.contents || lesson.contents.length === 0) && (
                          <li className="curriculum-content curriculum-content-empty">Chưa có nội dung</li>
                        )}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {(!curriculum.chapters || curriculum.chapters.length === 0) && (
              <p className="curriculum-empty">Chưa có chương nào trong khóa học.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Curriculum
