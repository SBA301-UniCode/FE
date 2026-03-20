import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import Hls from 'hls.js'
import Header from '../components/layout/Header'
import { chapterApi, lessonApi, videoApi, contentApi, enrollmentApi, processApi, certificateApi, documentApi, watermarkApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './CourseLearning.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const getContentId = (content) => content?.contentId || content?.id || ''
const isTrackableContentId = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('doc-') && !value.startsWith('quiz-')
const getVideoContentId = (video) => String(video?.contentId ?? video?.content?.contentId ?? video?.id ?? '')
const normalizeId = (value) => String(value || '').trim().toLowerCase()
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const isValidId = (value) => {
  const normalized = normalizeId(value)
  return normalized.length > 0 && normalized !== ZERO_UUID && normalized !== 'null' && normalized !== 'undefined'
}
const extractProcessId = (item) => normalizeId(item?.id ?? item?.contentId ?? item?.lessonId ?? item?.chapterId ?? '')
const extractStatus = (item) => item?.statusContent ?? item?.status ?? 'NOT_STARTED'
const getVideoUrl = (v) => {
  if (!v) return ''
  const raw = v.url ?? v.videoUrl ?? v.videoURL ?? v.video_url ?? v.secureUrl ?? v.secure_url ?? ''
  const url = String(raw || '').trim()
  if (!url) return ''
  // Normalize common Cloudinary URL variants.
  if (url.startsWith('http://res.cloudinary.com/')) return `https://${url.slice('http://'.length)}`
  return url
}
const extractPlaybackUrl = (payload) => {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  return String(payload.url || payload.videoUrl || payload.playbackUrl || payload.signedUrl || '').trim()
}
const isHlsUrl = (url) => String(url || '').toLowerCase().includes('.m3u8')
const normalizeContent = (content) => ({
  ...content,
  contentId: getContentId(content),
})

const CONTENT_ICONS = { VIDEO: '▶', DOCUMENT: '📄', QUIZ: '✏️' }
const STATUS_ICONS = { COMPLETED: '✅', IN_PROCESS: '🔵', NOT_STARTED: '○' }
const LEARNING_STATE_KEY_PREFIX = 'unicode_learning_state_v1'
const COURSE_PROGRESS_CACHE_KEY_PREFIX = 'unicode_course_progress_v1'

function MiniBar({ percent, color }) {
  const p = Math.min(100, Math.max(0, percent || 0))
  return (
    <div className="cl-mini-bar">
      <div className="cl-mini-bar-fill" style={{ width: `${p}%`, background: color || 'linear-gradient(90deg,#22c55e,#a3e635)' }} />
    </div>
  )
}

/** HLS qua hls.js; refresh URL định kỳ bằng cách preload trên video ẩn rồi swap → tránh “load lại” trên màn đang xem. */
function HlsCourseVideoPlayer({ src, playbackVideoId, playbackDuration, className, onPlay, onEnded, onError }) {
  const video0Ref = useRef(null)
  const video1Ref = useRef(null)
  const hlsRefs = useRef([null, null])
  const activeSlotRef = useRef(0)
  const [activeSlot, setActiveSlot] = useState(0)
  const refreshBusyRef = useRef(false)
  const playbackVideoIdRef = useRef(playbackVideoId)
  const playbackDurationRef = useRef(playbackDuration)

  useEffect(() => {
    playbackVideoIdRef.current = playbackVideoId
  }, [playbackVideoId])

  useEffect(() => {
    playbackDurationRef.current = playbackDuration
  }, [playbackDuration])

  const getVideoEl = (slot) => (slot === 0 ? video0Ref.current : video1Ref.current)

  const destroySlot = useCallback((slot) => {
    const hls = hlsRefs.current[slot]
    if (hls) {
      try {
        hls.destroy()
      } catch { /* ignore */ }
      hlsRefs.current[slot] = null
    }
    const v = slot === 0 ? video0Ref.current : video1Ref.current
    if (v) {
      v.removeAttribute('src')
      try {
        v.load()
      } catch { /* ignore */ }
    }
  }, [])

  // Đổi bài / đổi src: luôn load lại từ slot 0
  useEffect(() => {
    activeSlotRef.current = 0
    setActiveSlot(0)
    destroySlot(0)
    destroySlot(1)

    const v0 = video0Ref.current
    if (!v0 || !src) return undefined

    if (isHlsUrl(src)) {
      if (v0.canPlayType('application/vnd.apple.mpegurl')) {
        v0.src = src
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          startLevel: -1,
          maxBufferLength: 90,
          backBufferLength: 30,
        })
        hlsRefs.current[0] = hls
        hls.loadSource(src)
        hls.attachMedia(v0)
      } else {
        v0.src = src
      }
    } else {
      v0.src = src
    }

    return () => {
      destroySlot(0)
      destroySlot(1)
    }
  }, [src, destroySlot])

  const refreshPlaybackUrl = useCallback(async () => {
    if (refreshBusyRef.current) return
    const videoId = playbackVideoIdRef.current
    const a = activeSlotRef.current
    const b = 1 - a
    const vActive = getVideoEl(a)
    const vBack = getVideoEl(b)
    if (!videoId || !vActive || !vBack) return

    refreshBusyRef.current = true
    const t = Number.isFinite(vActive.currentTime) ? vActive.currentTime : 0
    const wasPlaying = !vActive.paused && !vActive.ended

    try {
      const playbackRes = await videoApi.getVideoPlaybackUrl(videoId)
      const playbackPayload = unwrap(playbackRes)
      const newUrl = extractPlaybackUrl(playbackPayload)
      const durationMinutes = Number(playbackPayload?.duration)
      if (!newUrl) {
        refreshBusyRef.current = false
        return
      }

      // duration có thể thay đổi theo payload backend; lưu lại để chu kỳ interval lần sau dùng giá trị mới.
      if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
        playbackDurationRef.current = durationMinutes
      }

      destroySlot(b)

      let finalized = false
      let safetyTimer = null
      const clearSafety = () => {
        if (safetyTimer != null) {
          window.clearTimeout(safetyTimer)
          safetyTimer = null
        }
      }
      const finalizeSwap = () => {
        if (finalized) return
        finalized = true
        clearSafety()
        try {
          // Re-sync tại thời điểm swap để tránh lệch 1-2s do thời gian gọi API + buffer.
          const liveTime = Number.isFinite(vActive.currentTime) ? vActive.currentTime : t
          if (Number.isFinite(liveTime) && liveTime >= 0) vBack.currentTime = liveTime
          vBack.playbackRate = vActive.playbackRate
          vActive.pause()
          vBack.volume = vActive.volume
          if (wasPlaying) {
            vBack.play().catch(() => { })
          } else {
            vBack.pause()
            if (Number.isFinite(t) && t >= 0) vBack.currentTime = t
          }
        } catch { /* ignore */ }
        destroySlot(a)
        activeSlotRef.current = b
        setActiveSlot(b)
        refreshBusyRef.current = false
      }

      safetyTimer = window.setTimeout(() => {
        if (finalized) return
        destroySlot(b)
        refreshBusyRef.current = false
      }, 12000)

      const waitThenSwap = () => {
        if (vBack.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          finalizeSwap()
          return
        }
        const onReady = () => {
          if (!finalized && vBack.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finalizeSwap()
        }
        vBack.addEventListener('canplay', onReady, { once: true })
        vBack.addEventListener('loadeddata', onReady, { once: true })
        window.setTimeout(() => finalizeSwap(), 5000)
      }

      if (isHlsUrl(newUrl) && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          startLevel: -1,
          maxBufferLength: 90,
          backBufferLength: 30,
        })
        hlsRefs.current[b] = hls
        hls.attachMedia(vBack)
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data?.fatal) return
          if (finalized) return
          try {
            hls.destroy()
          } catch { /* ignore */ }
          hlsRefs.current[b] = null
          clearSafety()
          refreshBusyRef.current = false
        })
        const onParsed = () => {
          try {
            if (Number.isFinite(t) && t >= 0) vBack.currentTime = t
          } catch { /* ignore */ }
          hls.off(Hls.Events.MANIFEST_PARSED, onParsed)
          waitThenSwap()
        }
        hls.on(Hls.Events.MANIFEST_PARSED, onParsed)
        hls.loadSource(newUrl)
        hls.startLoad()
      } else if (isHlsUrl(newUrl)) {
        vBack.src = newUrl
        const onMeta = () => {
          try {
            if (Number.isFinite(t) && t >= 0) vBack.currentTime = t
          } catch { /* ignore */ }
          vBack.removeEventListener('loadedmetadata', onMeta)
          waitThenSwap()
        }
        vBack.addEventListener('loadedmetadata', onMeta, { once: true })
      } else {
        vBack.src = newUrl
        const onMeta = () => {
          try {
            if (Number.isFinite(t) && t >= 0) vBack.currentTime = t
          } catch { /* ignore */ }
          vBack.removeEventListener('loadedmetadata', onMeta)
          waitThenSwap()
        }
        vBack.addEventListener('loadedmetadata', onMeta, { once: true })
      }
    } catch {
      refreshBusyRef.current = false
    }
  }, [destroySlot])

  useEffect(() => {
    if (!playbackVideoId || !src) return undefined
    const durationMinutes = Number(playbackDurationRef.current)
    // reload theo (duration - 60s), chạy lặp đều theo chu kỳ đó
    const delayMs = Number.isFinite(durationMinutes) && durationMinutes > 0
      ? Math.max(30_000, (durationMinutes * 60 + 60) * 1000)
      : 60_000
    //  const delayMs = 10 * 1000; 
    const id = window.setInterval(() => {
      refreshPlaybackUrl()
    }, delayMs)
    return () => window.clearInterval(id)
  }, [playbackVideoId, src, playbackDuration, refreshPlaybackUrl])

  const relayIfActive = (slot, handler) => (e) => {
    if (slot !== activeSlotRef.current) return
    handler?.(e)
  }

  const handleError = async (slot, e) => {
    if (slot !== activeSlotRef.current) return
    await refreshPlaybackUrl()
    onError?.(e)
  }

  if (!src) return null

  const layerClass = (slot) =>
    `${className || ''} cl-video-layer ${slot === activeSlot ? 'cl-video-layer--top' : 'cl-video-layer--back'}`.trim()

  return (
    <div className="cl-video-stack">
      <video
        ref={video0Ref}
        controls={activeSlot === 0}
        preload="metadata"
        playsInline
        className={layerClass(0)}
        onPlay={relayIfActive(0, onPlay)}
        onEnded={relayIfActive(0, onEnded)}
        onError={(e) => handleError(0, e)}
      />
      <video
        ref={video1Ref}
        controls={activeSlot === 1}
        preload="metadata"
        playsInline
        className={layerClass(1)}
        onPlay={relayIfActive(1, onPlay)}
        onEnded={relayIfActive(1, onEnded)}
        onError={(e) => handleError(1, e)}
      />
    </div>
  )
}

const CourseLearning = () => {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const initialEnrollmentId = searchParams.get('enrollmentId') || ''
  const queryChapterId = searchParams.get('chapterId') || ''
  const queryLessonId = searchParams.get('lessonId') || ''
  const queryContentId = searchParams.get('contentId') || ''
  const { user } = useAuth()
  const navigate = useNavigate()
  const initialResumeRef = useRef(null)

  if (!initialResumeRef.current) {
    const queryResume = {
      chapterId: normalizeId(queryChapterId),
      lessonId: normalizeId(queryLessonId),
      contentId: normalizeId(queryContentId),
    }
    let savedResume = null
    try {
      const raw = localStorage.getItem(`${LEARNING_STATE_KEY_PREFIX}:${courseId}`)
      if (raw) savedResume = JSON.parse(raw)
    } catch {
      savedResume = null
    }
    initialResumeRef.current = {
      chapterId: queryResume.chapterId || normalizeId(savedResume?.chapterId),
      lessonId: queryResume.lessonId || normalizeId(savedResume?.lessonId),
      contentId: queryResume.contentId || normalizeId(savedResume?.contentId),
    }
  }

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
  const currentVideoRef = useRef(null)
  useEffect(() => {
    currentVideoRef.current = currentVideo
  }, [currentVideo])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshingContent, setRefreshingContent] = useState(false)
  const [contentReloadTick, setContentReloadTick] = useState(0)
  const [certLoading, setCertLoading] = useState(false)
  const [certDone, setCertDone] = useState(false)
  const [certChecked, setCertChecked] = useState(false)
  const [certLearnerName, setCertLearnerName] = useState('')
  const [docRead, setDocRead] = useState(false)
  const [documentsByLesson, setDocumentsByLesson] = useState({})

  const [courseProgress, setCourseProgress] = useState({ percent: 0, chapters: [] })
  const [chapterProgressMap, setChapterProgressMap] = useState({})
  const [lessonProgressMap, setLessonProgressMap] = useState({})
  const [contentStatusMap, setContentStatusMap] = useState({})

  const refreshAllProgress = useCallback(() => {
    if (!isValidId(courseId) || !isValidId(enrollmentId)) return
    processApi.getCourseProgress({ courseId, enrollmentId })
      .then((res) => {
        const p = res.data?.data ?? res.data
        setCourseProgress({
          percent: p?.percentComplete ?? 0,
          chapters: (p?.processResponseList || []).map((r) => ({ id: extractProcessId(r), status: extractStatus(r) })),
        })
      })
      .catch(() => { })
  }, [courseId, enrollmentId])

  const refreshChapterProgress = useCallback((chapterId) => {
    if (!isValidId(enrollmentId) || !isValidId(chapterId)) return
    processApi.getChapterProgress({ chapterId, enrollmentId })
      .then((res) => {
        const p = res.data?.data ?? res.data
        setChapterProgressMap((prev) => ({
          ...prev,
          [chapterId]: {
            percent: p?.percentComplete ?? 0,
            lessons: (p?.processResponseList || []).map((r) => ({ id: extractProcessId(r), status: extractStatus(r) })),
          },
        }))
      })
      .catch(() => { })
  }, [enrollmentId])

  const refreshLessonProgress = useCallback((lessonId) => {
    if (!isValidId(enrollmentId) || !isValidId(lessonId)) return
    processApi.getLessonProgress({ lessonId, enrollmentId })
      .then((res) => {
        const p = res.data?.data ?? res.data
        setLessonProgressMap((prev) => ({
          ...prev,
          [lessonId]: { percent: p?.percentComplete ?? 0 },
        }))
        const list = p?.processResponseList || []
        const map = {}
        list.forEach((r) => {
          const id = extractProcessId(r)
          if (id) map[id] = extractStatus(r)
        })
        setContentStatusMap((prev) => ({ ...prev, ...map }))
      })
      .catch(() => { })
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
          if (!cancelled && isValidId(found?.enrollmentId)) { setEnrollmentId(found.enrollmentId); return }
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
        if (arr.length > 0) {
          const resumeChapterId = initialResumeRef.current?.chapterId
          const resumedChapter = resumeChapterId
            ? arr.find((ch) => normalizeId(ch.chapterId || ch.id) === resumeChapterId)
            : null
          setSelectedChapterId((resumedChapter?.chapterId || resumedChapter?.id || arr[0].chapterId || arr[0].id || ''))
        }
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
        if (arr.length > 0) {
          const resumeLessonId = initialResumeRef.current?.lessonId
          const resumedLesson = resumeLessonId
            ? arr.find((lesson) => normalizeId(lesson.lessonId || lesson.id) === resumeLessonId)
            : null
          setSelectedLessonId((resumedLesson?.lessonId || resumedLesson?.id || arr[0].lessonId || arr[0].id || ''))
        }
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
        if (videoContents.length > 0) {
          // Backend video detail endpoint expects videoId; use active list and map by contentId.
          try {
            const allRes = await videoApi.getAllActiveVideos()
            const allVideos = Array.isArray(unwrap(allRes)) ? unwrap(allRes) : []
            const validIds = new Set(
              videoContents
                .map((c) => getContentId(c))
                .filter(isTrackableContentId)
                .map(normalizeId)
            )
            allVideos.forEach((v) => {
              const normalizedVideoContentId = normalizeId(getVideoContentId(v))
              if (validIds.has(normalizedVideoContentId)) {
                videoMapByContentId.set(normalizedVideoContentId, v)
              }
            })
            await Promise.all([...videoMapByContentId.entries()].map(async ([contentId, v]) => {
              const videoId = v?.videoId || v?.id
              if (!videoId) return
              try {
                const playbackRes = await videoApi.getVideoPlaybackUrl(videoId)
                const playbackPayload = unwrap(playbackRes)
                const playbackUrl = extractPlaybackUrl(playbackPayload)
                const playbackDuration = Number(playbackPayload?.duration)
                if (playbackUrl) videoMapByContentId.set(contentId, { ...v, url: playbackUrl, playbackDuration })
              } catch {
                // keep existing URL if backend fails
              }
            }))
          } catch { /* keep empty */ }
        }
        const videos = [...videoMapByContentId.values()]

        const dRes = await documentApi.getByLessonId(selectedLessonId).catch(() => null)
        if (cancelled) return
        const enriched = [...contents]
        const docs = dRes ? (Array.isArray(unwrap(dRes)) ? unwrap(dRes) : []) : []
        const docMapForLesson = {}
        docs.forEach((doc) => {
          const contentId = normalizeId(doc?.contentId)
          if (contentId) docMapForLesson[contentId] = doc
        })
        setDocumentsByLesson((prev) => ({ ...prev, [selectedLessonId]: docMapForLesson }))
        if (!enriched.some((c) => c.contentType === 'DOCUMENT'))
          enriched.push(normalizeContent({ contentId: `doc-${selectedLessonId}`, contentType: 'DOCUMENT', lessonId: selectedLessonId, _virtual: true }))
        if (!enriched.some((c) => c.contentType === 'QUIZ'))
          enriched.push(normalizeContent({ contentId: `quiz-${selectedLessonId}`, contentType: 'QUIZ', lessonId: selectedLessonId, _virtual: true }))
        setContentsByLesson((prev) => ({ ...prev, [selectedLessonId]: enriched }))
        setVideosByLesson((prev) => ({ ...prev, [selectedLessonId]: videos }))
        if (enriched.length > 0) {
          const resumeContentId = initialResumeRef.current?.contentId
          const resumedContent = resumeContentId
            ? enriched.find((content) => normalizeId(getContentId(content)) === resumeContentId)
            : null
          const pickedContent = resumedContent || enriched[0]
          setSelectedContent(pickedContent)
          const pickedId = normalizeId(getContentId(pickedContent))
          setCurrentVideo(pickedContent.contentType === 'VIDEO' ? (videoMapByContentId.get(pickedId) || null) : null)
          initialResumeRef.current = { chapterId: '', lessonId: '', contentId: '' }
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
    if (!enrollmentId || !selectedLessonId) return
    refreshLessonProgress(selectedLessonId)
  }, [enrollmentId, selectedLessonId, refreshLessonProgress])

  useEffect(() => {
    if (!courseId) return
    const payload = {
      chapterId: selectedChapterId || '',
      lessonId: selectedLessonId || '',
      contentId: getContentId(selectedContent) || '',
      updatedAt: Date.now(),
    }
    try {
      localStorage.setItem(`${LEARNING_STATE_KEY_PREFIX}:${courseId}`, JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }, [courseId, selectedChapterId, selectedLessonId, selectedContent])

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
    const normalizedContentId = normalizeId(contentId)
    // Optimistic UI to avoid waiting for backend aggregation.
    setContentStatusMap((prev) => ({ ...prev, [normalizedContentId]: status }))
    processApi.trackContent({ contentId, enrollmentId, status })
      .then(() => {
        if (selectedLessonId) refreshLessonProgress(selectedLessonId)
        if (selectedChapterId) refreshChapterProgress(selectedChapterId)
        refreshAllProgress()
        // Some environments update aggregated progress with slight delay.
        window.setTimeout(() => {
          if (selectedLessonId) refreshLessonProgress(selectedLessonId)
          if (selectedChapterId) refreshChapterProgress(selectedChapterId)
          refreshAllProgress()
        }, 400)
      })
      .catch(() => { })
  }

  const handleVideoPlay = () => {
    const contentId = getContentId(selectedContent) || getVideoContentId(currentVideo)
    if (isTrackableContentId(contentId)) trackContent(contentId, 'IN_PROCESS')
  }
  const handleVideoEnded = () => {
    const contentId = getContentId(selectedContent) || getVideoContentId(currentVideo)
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
    if (selectedChapterId) params.set('chapterId', selectedChapterId)
    if (selectedContentId) params.set('contentId', selectedContentId)
    navigate(`/quiz/${qId}?${params.toString()}`)
  }

  const getChapterTitle = (c) => c?.title ?? c?.chapterTitle ?? 'Chương'
  const getLessonTitle = (l) => l?.title ?? l?.lessonTitle ?? 'Bài giảng'
  const getStatusIcon = (cId) => STATUS_ICONS[contentStatusMap[normalizeId(cId)]] || STATUS_ICONS.NOT_STARTED
  const getLocalChapterPercent = (chapterId) => {
    const lessons = lessonsByChapter[chapterId] || []
    if (lessons.length === 0) return null
    const values = lessons
      .map((lesson) => lessonProgressMap[lesson.lessonId || lesson.id]?.percent)
      .filter((value) => typeof value === 'number')
    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }
  const getChapterPercent = (chapterId) => {
    const backendPercent = chapterProgressMap[chapterId]?.percent ?? 0
    const localPercent = getLocalChapterPercent(chapterId)
    return localPercent === null ? backendPercent : Math.max(backendPercent, localPercent)
  }
  const getChapterStatus = (chId) => {
    const chapterPercent = getChapterPercent(chId)
    if (chapterPercent >= 99.99) return 'COMPLETED'
    const found = courseProgress.chapters.find((c) => normalizeId(c.id) === normalizeId(chId))
    return found?.status || 'NOT_STARTED'
  }

  const chapterIds = chapters.map((ch) => ch.chapterId || ch.id).filter(Boolean)
  const chapterPercents = chapterIds
    .map((id) => getChapterPercent(id))
    .filter((v) => typeof v === 'number')
  const chapterAvgPercent = chapterPercents.length > 0
    ? chapterPercents.reduce((sum, v) => sum + v, 0) / chapterPercents.length
    : 0
  const cpct = Math.round(Math.max(courseProgress.percent || 0, chapterAvgPercent))
  const selectedDoc = selectedContent?.contentType === 'DOCUMENT'
    ? documentsByLesson[selectedLessonId]?.[normalizeId(getContentId(selectedContent))]
    : null
  const displayLearnerName = certLearnerName || user?.name || user?.username || user?.email || 'bạn'

  useEffect(() => {
    if (!isValidId(courseId) || !isValidId(enrollmentId)) return
    const payload = {
      courseId,
      enrollmentId,
      percent: cpct,
      updatedAt: Date.now(),
    }
    try {
      localStorage.setItem(`${COURSE_PROGRESS_CACHE_KEY_PREFIX}:${courseId}`, JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }, [courseId, enrollmentId, cpct])

  useEffect(() => {
    let cancelled = false
    const checkExistingCertificate = async () => {
      if (!isValidId(user?.userId) || !isValidId(courseId)) return
      try {
        const res = await certificateApi.getByLearnerId(user.userId)
        if (cancelled) return
        const certs = Array.isArray(unwrap(res)) ? unwrap(res) : []
        const existingCert = certs.find((c) => normalizeId(c?.courseId) === normalizeId(courseId))
        setCertDone(Boolean(existingCert))
        if (existingCert) {
          setCertLearnerName(existingCert.learnerName || '')
        }
      } catch {
        // ignore; auto-create effect will still try when eligible
      } finally {
        if (!cancelled) setCertChecked(true)
      }
    }
    checkExistingCertificate()
    return () => { cancelled = true }
  }, [user?.userId, courseId])

  useEffect(() => {
    if (!certChecked || certDone || certLoading) return
    if (!isValidId(user?.userId) || !isValidId(courseId)) return
    if (cpct < 100) return
    let cancelled = false
    const createCertificate = async () => {
      setCertLoading(true)
      try {
        const res = await certificateApi.create({ learnerId: user.userId, courseId })
        if (cancelled) return
        const cert = unwrap(res)
        setCertDone(true)
        setCertLearnerName(cert?.learnerName || user?.name || '')
      } catch (e) {
        const code = e?.response?.data?.errorCode || ''
        if (String(code).includes('CERTIFICATE_ALREADY_EXISTS')) {
          setCertDone(true)
        }
      } finally {
        if (!cancelled) setCertLoading(false)
      }
    }
    createCertificate()
    return () => { cancelled = true }
  }, [cpct, certChecked, certDone, certLoading, user?.userId, user?.name, courseId])

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

            {loading && <div className="cl-sidebar-msg">Đang tải...</div>}
            {error && <div className="cl-sidebar-msg cl-sidebar-msg--err">{error}</div>}

            {!loading && !error && (
              <div className="cl-sidebar-scroll">
                {chapters.map((ch) => {
                  const chId = ch.chapterId || ch.id
                  const isActive = chId === selectedChapterId
                  const cpPct = Math.round(getChapterPercent(chId))
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
                  const pct = Math.round(getChapterPercent(chId))
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

            {cpct >= 100 && certChecked && !certDone && (
              <div className="cl-cert-banner">
                <span>
                  {certLoading
                    ? 'Bạn đã hoàn thành 100% khóa học. Đang cấp chứng chỉ...'
                    : 'Bạn đã hoàn thành 100% khóa học. Đang chuẩn bị chứng chỉ cho bạn.'}
                </span>
              </div>
            )}
            {cpct >= 100 && certDone && (
              <div className="cl-cert-banner cl-cert-banner--done">
                <span>Chứng chỉ của {displayLearnerName} đã được tạo!</span>
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
                        <HlsCourseVideoPlayer
                          src={getVideoUrl(currentVideo)}
                          playbackVideoId={currentVideo.videoId || currentVideo.id}
                          playbackDuration={currentVideo.playbackDuration}
                          className="cl-video"
                          onPlay={handleVideoPlay}
                          onEnded={handleVideoEnded}
                        />
                      </div>
                      <div className="cl-video-title">
                        Video bài giảng (HLS)
                        {currentVideo.duration ? ` · ${currentVideo.duration} phút` : ''}
                      </div>
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
                  {selectedDoc?.documentUrl ? (
                    <>
                      <a href={selectedDoc.documentUrl} target="_blank" rel="noreferrer">
                        📄 Mở tài liệu
                      </a>
                      <button
                        type="button"
                        className="cl-doc-btn"
                        style={{ marginLeft: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={async () => {
                          try {
                            const res = await watermarkApi.downloadWithWatermark(selectedDoc.documentId)
                            const url = window.URL.createObjectURL(new Blob([res.data]))
                            const a = document.createElement('a')
                            a.href = url

                            // Try to get filename from Content-Disposition header
                            let filename = selectedDoc.title || 'document'
                            const contentDisposition = res.headers['content-disposition']
                            if (contentDisposition) {
                              const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
                              if (filenameMatch && filenameMatch.length === 2) {
                                filename = filenameMatch[1]
                              }
                            } else {
                              // Fallback: try to guess extension from Content-Type if title has no extension
                              if (!filename.includes('.')) {
                                const contentType = res.headers['content-type']
                                if (contentType === 'application/pdf') filename += '.pdf'
                                else if (contentType?.startsWith('image/')) filename += '.png'
                                else filename += '.pdf' // Default fallback
                              }
                            }

                            a.download = filename
                            document.body.appendChild(a)
                            a.click()
                            a.remove()
                            window.URL.revokeObjectURL(url)
                          } catch (e) {
                            alert('Không thể tải tài liệu: ' + (e?.response?.data?.message || e.message))
                          }
                        }}
                      >
                        🔒 Tải có Watermark
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Tài liệu này hiện chưa có URL.</p>
                      <p>Instructor có thể cập nhật URL tài liệu ở trang Quản lý nội dung khóa học.</p>
                    </>
                  )}
                </div>
                <div className="cl-doc-footer">
                  {contentStatusMap[normalizeId(getContentId(selectedContent))] === 'COMPLETED' || docRead
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
                  {contentStatusMap[normalizeId(getContentId(selectedContent))] === 'COMPLETED' ? (
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
