import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { chapterApi, lessonApi, videoApi, contentApi, enrollmentApi, processApi, certificateApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './CourseLearning.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const getContentId = (content) => content?.contentId || content?.id || ''
const isTrackableContentId = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('doc-') && !value.startsWith('quiz-')
const getVideoContentId = (video) => String(video?.contentId ?? video?.content?.contentId ?? video?.id ?? '')
const normalizeId = (value) => String(value || '').trim().toLowerCase()
const getVideoUrl = (v) => {
  if (!v) return ''
  const raw = v.url ?? v.videoUrl ?? v.videoURL ?? v.video_url ?? v.secureUrl ?? v.secure_url ?? ''
  const url = String(raw || '').trim()
  if (!url) return ''
  // Normalize common Cloudinary URL variants.
  if (url.startsWith('http://res.cloudinary.com/')) return `https://${url.slice('http://'.length)}`
  return url
}
const DOC_STORAGE_KEY = 'unicode_document_content_map_v1'
const readDocMap = () => {
  try {
    const raw = localStorage.getItem(DOC_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
const normalizeContent = (content) => ({
  ...content,
  contentId: getContentId(content),
})

const CONTENT_ICONS = { VIDEO: '▶', DOCUMENT: '📄', QUIZ: '✏️' }
const STATUS_ICONS = { COMPLETED: '✅', IN_PROCESS: '🔵', NOT_STARTED: '○' }

function MiniBar({ percent, color }) {
  const p = Math.min(100, Math.max(0, percent || 0))
  return (
    <div className="cl-mini-bar">
      <div className="cl-mini-bar-fill" style={{ width: `${p}%`, background: color || 'linear-gradient(90deg,#22c55e,#a3e635)' }} />
    </div>
  )
}

const CourseLearning = () => {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const initialEnrollmentId = searchParams.get('enrollmentId') || ''
  const { user } = useAuth()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [enrollmentId, setEnrollmentId] = useState(initialEnrollmentId)
  const [chapters, setChapters] = useState([])
  const [lessonsByChapter, setLessonsByChapter] = useState({})
  const [contentsByLesson, setContentsByLesson] = useState({})
  const [videosByLesson, setVideosByLesson] = useState({})
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [selectedContent, setSelectedContent] = useState(null)
  const [currentVideo, setCurrentVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshingContent, setRefreshingContent] = useState(false)
  const [contentReloadTick, setContentReloadTick] = useState(0)
  const [certLoading, setCertLoading] = useState(false)
  const [certDone, setCertDone] = useState(false)
  const [docRead, setDocRead] = useState(false)
  const [docMap, setDocMap] = useState(() => readDocMap())

  const [courseProgress, setCourseProgress] = useState({ percent: 0, chapters: [] })
  const [chapterProgressMap, setChapterProgressMap] = useState({})
  const [lessonProgressMap, setLessonProgressMap] = useState({})
  const [contentStatusMap, setContentStatusMap] = useState({})

  const refreshAllProgress = useCallback(() => {
    if (!courseId || !enrollmentId) return
    processApi.getCourseProgress({ courseId, enrollmentId })
      .then((res) => {
        const p = res.data?.data ?? res.data
        setCourseProgress({
          percent: p?.percentComplete ?? 0,
          chapters: (p?.processResponseList || []).map((r) => ({ id: r.id, status: r.statusContent })),
        })
      })
      .catch(() => {})
  }, [courseId, enrollmentId])

  const refreshChapterProgress = useCallback((chapterId) => {
    if (!enrollmentId || !chapterId) return
    processApi.getChapterProgress({ chapterId, enrollmentId })
      .then((res) => {
        const p = res.data?.data ?? res.data
        setChapterProgressMap((prev) => ({
          ...prev,
          [chapterId]: {
            percent: p?.percentComplete ?? 0,
            lessons: (p?.processResponseList || []).map((r) => ({ id: r.id, status: r.statusContent })),
          },
        }))
      })
      .catch(() => {})
  }, [enrollmentId])

  const refreshLessonProgress = useCallback((lessonId) => {
    if (!enrollmentId || !lessonId) return
    processApi.getLessonProgress({ lessonId, enrollmentId })
      .then((res) => {
        const p = res.data?.data ?? res.data
        setLessonProgressMap((prev) => ({
          ...prev,
          [lessonId]: { percent: p?.percentComplete ?? 0 },
        }))
        const list = p?.processResponseList || []
        const map = {}
        list.forEach((r) => { if (r.id) map[r.id] = r.statusContent })
        setContentStatusMap((prev) => ({ ...prev, ...map }))
      })
      .catch(() => {})
  }, [enrollmentId])

  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      if (enrollmentId || !courseId) return
      for (const status of ['IN_PROGRESS', 'NOT_STARTED', 'COMPLETED']) {
        try {
          const res = await enrollmentApi.getMyLearning(status, 0, 50)
          const page = unwrap(res)
          const list = Array.isArray(page?.content) ? page.content : Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : []
          const found = list.find((e) => e?.courseResponse?.courseId && String(e.courseResponse.courseId) === String(courseId))
          if (!cancelled && found?.enrollmentId) { setEnrollmentId(found.enrollmentId); return }
        } catch { /* next */ }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [courseId, enrollmentId])

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true); setError('')
    chapterApi.getByCourseId(courseId)
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
        setChapters(arr)
        if (arr.length > 0) setSelectedChapterId(arr[0].chapterId || arr[0].id || '')
      })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.message || e.message || 'Không tải được chương.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId])

  useEffect(() => { refreshAllProgress() }, [refreshAllProgress])

  useEffect(() => {
    if (!enrollmentId || chapters.length === 0) return
    chapters.forEach((ch) => refreshChapterProgress(ch.chapterId || ch.id))
  }, [enrollmentId, chapters, refreshChapterProgress])

  useEffect(() => {
    if (!selectedChapterId) { setSelectedLessonId(''); return }
    let cancelled = false
    lessonApi.getByChapterId(selectedChapterId)
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(unwrap(res)) ? unwrap(res) : []
        setLessonsByChapter((prev) => ({ ...prev, [selectedChapterId]: arr }))
        if (arr.length > 0) setSelectedLessonId(arr[0].lessonId || arr[0].id || '')
      })
      .catch(() => { if (!cancelled) setLessonsByChapter((prev) => ({ ...prev, [selectedChapterId]: [] })) })
    return () => { cancelled = true }
  }, [selectedChapterId])

  useEffect(() => {
    if (!enrollmentId || !selectedChapterId) return
    const lessons = lessonsByChapter[selectedChapterId] || []
    lessons.forEach((l) => refreshLessonProgress(l.lessonId || l.id))
  }, [enrollmentId, selectedChapterId, lessonsByChapter, refreshLessonProgress])

  useEffect(() => {
    if (!selectedLessonId) { setSelectedContent(null); setCurrentVideo(null); return }
    let cancelled = false
    const load = async () => {
      setRefreshingContent(true)
      try {
        const cRes = await contentApi.getByLessonId(selectedLessonId).catch(() => null)
        if (cancelled) return
        const contents = cRes ? (Array.isArray(unwrap(cRes)) ? unwrap(cRes).map(normalizeContent) : []) : []

        const videoContents = contents.filter((c) => c.contentType === 'VIDEO')
        const videoMapByContentId = new Map()
        await Promise.all(videoContents.map(async (c) => {
          const cId = getContentId(c)
          if (!isTrackableContentId(cId)) return
          try {
            const vRes = await videoApi.getVideoDetail(cId)
            const v = unwrap(vRes)
            if (v && getVideoUrl(v)) videoMapByContentId.set(normalizeId(getVideoContentId(v)), v)
          } catch { /* video not uploaded yet */ }
        }))
        const missingVideoContentIds = videoContents
          .map((c) => getContentId(c))
          .filter((id) => isTrackableContentId(id) && !videoMapByContentId.has(normalizeId(id)))

        if (missingVideoContentIds.length > 0) {
          // Fallback: detail endpoint may fail while list endpoint still works.
          try {
            const allRes = await videoApi.getAllActiveVideos()
            const allVideos = Array.isArray(unwrap(allRes)) ? unwrap(allRes) : []
            const validIds = new Set(missingVideoContentIds.map((id) => normalizeId(id)))
            allVideos.forEach((v) => {
              const normalizedVideoContentId = normalizeId(getVideoContentId(v))
              if (validIds.has(normalizedVideoContentId) && getVideoUrl(v)) {
                videoMapByContentId.set(normalizedVideoContentId, v)
              }
            })
          } catch { /* keep empty */ }
        }
        const videos = [...videoMapByContentId.values()]

        if (cancelled) return
        const enriched = [...contents]
        if (!enriched.some((c) => c.contentType === 'DOCUMENT'))
          enriched.push(normalizeContent({ contentId: `doc-${selectedLessonId}`, contentType: 'DOCUMENT', lessonId: selectedLessonId, _virtual: true }))
        if (!enriched.some((c) => c.contentType === 'QUIZ'))
          enriched.push(normalizeContent({ contentId: `quiz-${selectedLessonId}`, contentType: 'QUIZ', lessonId: selectedLessonId, _virtual: true }))
        setContentsByLesson((prev) => ({ ...prev, [selectedLessonId]: enriched }))
        setVideosByLesson((prev) => ({ ...prev, [selectedLessonId]: videos }))
        if (enriched.length > 0) {
          const first = enriched[0]
          setSelectedContent(first)
          const firstId = normalizeId(getContentId(first))
          setCurrentVideo(first.contentType === 'VIDEO' ? (videoMapByContentId.get(firstId) || null) : null)
        } else { setSelectedContent(null); setCurrentVideo(null) }
        setDocRead(false)
      } catch { /* ignore */ }
      finally {
        if (!cancelled) setRefreshingContent(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedLessonId, contentReloadTick])

  useEffect(() => {
    if (!selectedLessonId) return
    const triggerReload = () => setContentReloadTick((v) => v + 1)
    const onVisible = () => {
      if (!document.hidden) triggerReload()
    }
    const timerId = window.setInterval(() => {
      if (!document.hidden) triggerReload()
    }, 12000)
    window.addEventListener('focus', triggerReload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timerId)
      window.removeEventListener('focus', triggerReload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selectedLessonId])

  useEffect(() => {
    const reloadDocs = () => setDocMap(readDocMap())
    window.addEventListener('focus', reloadDocs)
    window.addEventListener('storage', reloadDocs)
    return () => {
      window.removeEventListener('focus', reloadDocs)
      window.removeEventListener('storage', reloadDocs)
    }
  }, [])

  useEffect(() => {
    if (!enrollmentId || !selectedLessonId) return
    refreshLessonProgress(selectedLessonId)
  }, [enrollmentId, selectedLessonId, refreshLessonProgress])

  const currentContents = useMemo(() => contentsByLesson[selectedLessonId] || [], [contentsByLesson, selectedLessonId])
  const currentVideos = useMemo(() => videosByLesson[selectedLessonId] || [], [videosByLesson, selectedLessonId])

  const handleSelectContent = (content) => {
    setSelectedContent(content)
    setDocRead(false)
    const contentId = normalizeId(getContentId(content))
    setCurrentVideo(content.contentType === 'VIDEO' ? (currentVideos.find((v) => normalizeId(getVideoContentId(v)) === contentId) || null) : null)
  }

  const trackContent = (contentId, status) => {
    if (!enrollmentId || !isTrackableContentId(contentId)) return
    processApi.trackContent({ contentId, enrollmentId, status })
      .then(() => {
        setContentStatusMap((prev) => ({ ...prev, [contentId]: status }))
        if (selectedLessonId) refreshLessonProgress(selectedLessonId)
        if (selectedChapterId) refreshChapterProgress(selectedChapterId)
        refreshAllProgress()
      })
      .catch(() => {})
  }

  const handleVideoPlay = () => {
    const contentId = getVideoContentId(currentVideo)
    if (isTrackableContentId(contentId)) trackContent(contentId, 'IN_PROCESS')
  }
  const handleVideoEnded = () => {
    const contentId = getVideoContentId(currentVideo)
    if (isTrackableContentId(contentId)) trackContent(contentId, 'COMPLETED')
  }
  const handleMarkDocRead = () => {
    const contentId = getContentId(selectedContent)
    if (isTrackableContentId(contentId)) { setDocRead(true); trackContent(contentId, 'COMPLETED') }
  }

  const handleGoToQuiz = () => {
    if (!selectedContent) return
    const selectedContentId = getContentId(selectedContent)
    const qId = selectedContent._virtual ? selectedContent.lessonId : selectedContentId
    const params = new URLSearchParams()
    if (enrollmentId) params.set('enrollmentId', enrollmentId)
    if (courseId) params.set('courseId', courseId)
    const lid = selectedContent.lessonId || selectedLessonId
    if (lid) params.set('lessonId', lid)
    navigate(`/quiz/${qId}?${params.toString()}`)
  }

  const handleGetCertificate = async () => {
    if (!user?.userId || !courseId) return
    setCertLoading(true)
    try {
      await certificateApi.create({ learnerId: user.userId, courseId })
      setCertDone(true)
      alert('Chúc mừng! Chứng chỉ đã được tạo.')
    } catch (e) { alert(e.response?.data?.message || e.message || 'Không thể tạo chứng chỉ') }
    setCertLoading(false)
  }

  const getChapterTitle = (c) => c?.title ?? c?.chapterTitle ?? 'Chương'
  const getLessonTitle = (l) => l?.title ?? l?.lessonTitle ?? 'Bài giảng'
  const getStatusIcon = (cId) => STATUS_ICONS[contentStatusMap[cId]] || STATUS_ICONS.NOT_STARTED
  const getChapterStatus = (chId) => {
    const found = courseProgress.chapters.find((c) => String(c.id) === String(chId))
    return found?.status || 'NOT_STARTED'
  }

  const cpct = Math.round(courseProgress.percent || 0)
  const selectedDoc = selectedContent?.contentType === 'DOCUMENT' ? docMap[getContentId(selectedContent)] : null

  return (
    <div className="course-learning">
      <Header />
      <main className="course-learning-main">
        <div className={`cl-wrapper ${sidebarOpen ? '' : 'cl-wrapper--collapsed'}`}>

          {/* ── Sidebar overlay (mobile) ── */}
          {sidebarOpen && <div className="cl-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

          {/* ── Toggle button ── */}
          <button
            type="button"
            className={`cl-sidebar-toggle ${sidebarOpen ? 'cl-sidebar-toggle--open' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          {/* ══════ Sidebar ══════ */}
          <aside className={`cl-sidebar ${sidebarOpen ? 'cl-sidebar--open' : 'cl-sidebar--closed'}`}>
            <div className="cl-sidebar-head">
              <h2>Nội dung khóa học</h2>
              <button type="button" className="cl-sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>

            {/* Course progress inside sidebar */}
            <div className="cl-sidebar-course-progress">
              <div className="cl-sidebar-course-row">
                <span>Tiến trình tổng</span>
                <span className="cl-sidebar-course-pct">{cpct}%</span>
              </div>
              <MiniBar percent={cpct} />
            </div>

            {loading && <div className="cl-sidebar-msg">Đang tải...</div>}
            {error && <div className="cl-sidebar-msg cl-sidebar-msg--err">{error}</div>}

            {!loading && !error && (
              <div className="cl-sidebar-scroll">
                {chapters.map((ch) => {
                  const chId = ch.chapterId || ch.id
                  const isActive = chId === selectedChapterId
                  const cp = chapterProgressMap[chId]
                  const cpPct = Math.round(cp?.percent || 0)
                  const chStatus = getChapterStatus(chId)
                  return (
                    <div key={chId} className="cl-sb-chapter">
                      <button
                        type="button"
                        className={`cl-sb-chapter-btn ${isActive ? 'cl-sb-chapter-btn--active' : ''}`}
                        onClick={() => setSelectedChapterId(chId)}
                      >
                        <span className="cl-sb-chapter-title">{getChapterTitle(ch)}</span>
                        <span className={`cl-sb-chapter-pct ${chStatus === 'COMPLETED' ? 'cl-sb-chapter-pct--done' : ''}`}>
                          {chStatus === 'COMPLETED' ? '✅' : `${cpPct}%`}
                        </span>
                      </button>

                      {isActive && (lessonsByChapter[chId] || []).map((lesson) => {
                        const lId = lesson.lessonId || lesson.id
                        const isLessonActive = lId === selectedLessonId
                        const lessonContents = contentsByLesson[lId] || []
                        return (
                          <div key={lId} className="cl-sb-lesson">
                            <button
                              type="button"
                              className={`cl-sb-lesson-btn ${isLessonActive ? 'cl-sb-lesson-btn--active' : ''}`}
                              onClick={() => setSelectedLessonId(lId)}
                            >
                              {getLessonTitle(lesson)}
                            </button>

                            {isLessonActive && lessonContents.length > 0 && (
                              <ul className="cl-sb-content-list">
                                {lessonContents.map((ct, idx) => (
                                  <li key={getContentId(ct) || `${ct.contentType}-${idx}`}>
                                    <button
                                      type="button"
                                      className={`cl-sb-content-btn ${getContentId(selectedContent) === getContentId(ct) ? 'cl-sb-content-btn--active' : ''}`}
                                      onClick={() => handleSelectContent(ct)}
                                    >
                                      <span className="cl-sb-content-icon">{CONTENT_ICONS[ct.contentType] || '•'}</span>
                                      <span className="cl-sb-content-label">
                                        {ct.contentType === 'VIDEO' ? 'Video' : ct.contentType === 'DOCUMENT' ? 'Tài liệu' : 'Bài kiểm tra'}
                                      </span>
                                      <span className="cl-sb-content-status">{getStatusIcon(getContentId(ct))}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </aside>

          {/* ══════ Main content ══════ */}
          <section className="cl-content">
            {/* Progress header */}
            <div className="cl-content-progress">
              <div className="cl-content-progress-row">
                <div className="cl-content-progress-left">
                  <span className="cl-content-progress-label">Tiến trình bài giảng</span>
                  {selectedLessonId && (
                    <span className="cl-content-progress-lesson-name">
                      {getLessonTitle((lessonsByChapter[selectedChapterId] || []).find((l) => (l.lessonId || l.id) === selectedLessonId) || {})}
                    </span>
                  )}
                </div>
                <div className="cl-content-progress-right">
                  <span className="cl-content-progress-val">{Math.round(lessonProgressMap[selectedLessonId]?.percent || 0)}%</span>
                  <button
                    type="button"
                    className="cl-refresh-btn"
                    onClick={() => setContentReloadTick((v) => v + 1)}
                    disabled={!selectedLessonId || refreshingContent}
                  >
                    {refreshingContent ? 'Đang cập nhật...' : 'Tải lại nội dung'}
                  </button>
                </div>
              </div>
              <MiniBar percent={lessonProgressMap[selectedLessonId]?.percent || 0} color="linear-gradient(90deg,#f59e0b,#fbbf24)" />
            </div>

            {/* Chapter progress cards */}
            {chapters.length > 0 && (
              <div className="cl-chapter-cards">
                {chapters.map((ch) => {
                  const chId = ch.chapterId || ch.id
                  const cp = chapterProgressMap[chId]
                  const pct = Math.round(cp?.percent || 0)
                  const status = getChapterStatus(chId)
                  return (
                    <button
                      key={chId}
                      type="button"
                      className={`cl-ch-card ${chId === selectedChapterId ? 'cl-ch-card--active' : ''} ${status === 'COMPLETED' ? 'cl-ch-card--done' : ''}`}
                      onClick={() => setSelectedChapterId(chId)}
                    >
                      <span className="cl-ch-card-title">{getChapterTitle(ch)}</span>
                      <span className={`cl-ch-card-pct ${pct >= 100 ? 'cl-ch-card-pct--done' : ''}`}>{pct}%</span>
                      <MiniBar percent={pct} color={pct >= 100 ? 'linear-gradient(90deg,#22c55e,#86efac)' : 'linear-gradient(90deg,#6366f1,#a5b4fc)'} />
                    </button>
                  )
                })}
              </div>
            )}

            {cpct >= 100 && !certDone && (
              <div className="cl-cert-banner">
                <span>Bạn đã hoàn thành 100% khóa học!</span>
                <button type="button" className="cl-cert-btn" onClick={handleGetCertificate} disabled={certLoading}>
                  {certLoading ? 'Đang tạo...' : 'Nhận chứng chỉ'}
                </button>
              </div>
            )}
            {certDone && (
              <div className="cl-cert-banner cl-cert-banner--done">
                <span>Chứng chỉ đã được tạo!</span>
                <Link to="/my-certificates" className="cl-cert-btn">Xem chứng chỉ</Link>
              </div>
            )}

            {!selectedLessonId && <div className="cl-placeholder">Chọn một bài giảng để bắt đầu học.</div>}
            {selectedLessonId && !selectedContent && currentContents.length === 0 && (
              <div className="cl-placeholder">Bài giảng này chưa có nội dung nào.</div>
            )}

            {/* VIDEO */}
            {selectedContent?.contentType === 'VIDEO' && (
              <div className="cl-player">
                {currentVideo ? (
                  getVideoUrl(currentVideo) ? (
                    <>
                      <div className="cl-video-wrap">
                        <video
                          key={currentVideo.videoId || currentVideo.contentId}
                          src={getVideoUrl(currentVideo)}
                          controls
                          preload="metadata"
                          playsInline
                          className="cl-video"
                          onPlay={handleVideoPlay}
                          onEnded={handleVideoEnded}
                          onError={(e) => console.warn('Video load error:', e.target?.error)}
                        />
                      </div>
                      <div className="cl-video-title">Video bài giảng {currentVideo.duration ? `(${currentVideo.duration}s)` : ''}</div>
                    </>
                  ) : (
                    <div className="cl-placeholder">Video chưa có URL hợp lệ. Vui lòng upload lại video.</div>
                  )
                ) : (
                  <div className="cl-placeholder">Video chưa được upload cho nội dung này.</div>
                )}
              </div>
            )}

            {/* DOCUMENT */}
            {selectedContent?.contentType === 'DOCUMENT' && (
              <div className="cl-doc">
                <div className="cl-doc-header"><span className="cl-doc-icon">📄</span><h3>{selectedDoc?.title || 'Tài liệu bài giảng'}</h3></div>
                <div className="cl-doc-body">
                  {selectedDoc?.body ? (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{selectedDoc.body}</p>
                  ) : (
                    <>
                      <p>Tài liệu này hiện chưa có nội dung text.</p>
                      <p>Instructor có thể thêm nội dung ở trang Quản lý nội dung khóa học.</p>
                    </>
                  )}
                </div>
                <div className="cl-doc-footer">
                  {contentStatusMap[getContentId(selectedContent)] === 'COMPLETED' || docRead
                    ? <div className="cl-doc-done">✅ Đã đọc xong tài liệu</div>
                    : <button type="button" className="cl-doc-btn" onClick={handleMarkDocRead}>Đánh dấu đã đọc</button>}
                </div>
              </div>
            )}

            {/* QUIZ */}
            {selectedContent?.contentType === 'QUIZ' && (
              <div className="cl-quiz">
                <div className="cl-quiz-header"><span className="cl-quiz-icon">✏️</span><h3>Bài kiểm tra</h3></div>
                <div className="cl-quiz-launch">
                  {contentStatusMap[getContentId(selectedContent)] === 'COMPLETED' ? (
                    <>
                      <div className="cl-quiz-big-icon">✅</div>
                      <h4>Đã hoàn thành bài kiểm tra!</h4>
                      <p>Bạn có thể làm lại bất cứ lúc nào.</p>
                      <button type="button" className="cl-quiz-go" onClick={handleGoToQuiz}>Làm lại bài kiểm tra</button>
                    </>
                  ) : (
                    <>
                      <div className="cl-quiz-big-icon">📝</div>
                      <h4>Sẵn sàng kiểm tra kiến thức?</h4>
                      <div className="cl-quiz-info"><span>10 phút</span><span>•</span><span>Điểm đạt: 60%</span></div>
                      <button type="button" className="cl-quiz-go" onClick={handleGoToQuiz}>Bắt đầu làm bài</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default CourseLearning
