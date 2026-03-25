import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { resolveToId, isUuid, setSlugMap } from '../utils/slug'
import Hls from 'hls.js'
import Header from '../components/layout/Header'
import AIHintsPanel from '../components/AIHintsPanel'
import MonacoEditor from '@monaco-editor/react'
import { chapterApi, lessonApi, videoApi, contentApi, enrollmentApi, processApi, certificateApi, documentApi, watermarkApi, practiceApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const getContentId = (c: AnyObj | null | undefined) => ((c?.contentId || c?.id || '') as string)
const isTrackableContentId = (v: string) => v.length > 0 && !v.startsWith('doc-') && !v.startsWith('quiz-')
const getVideoContentId = (v: AnyObj | null | undefined) => String(v?.contentId ?? (v?.content as AnyObj)?.contentId ?? v?.id ?? '')
const normalizeId = (v: unknown) => String(v || '').trim().toLowerCase()
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const isValidId = (v: unknown) => { const n = normalizeId(v); return n.length > 0 && n !== ZERO_UUID && n !== 'null' && n !== 'undefined' }
const extractProcessId = (item: AnyObj) => normalizeId(item?.id ?? item?.contentId ?? item?.lessonId ?? item?.chapterId ?? '')
const extractStatus = (item: AnyObj) => (item?.statusContent ?? item?.status ?? 'NOT_STARTED') as string
const getVideoUrl = (v: AnyObj | null) => { if (!v) return ''; const raw = (v.url ?? v.videoUrl ?? v.videoURL ?? v.video_url ?? v.secureUrl ?? v.secure_url ?? '') as string; const url = raw.trim(); if (!url) return ''; return url.startsWith('http://res.cloudinary.com/') ? `https://${url.slice(7)}` : url }
const extractPlaybackUrl = (p: unknown) => { if (!p) return ''; if (typeof p === 'string') return p; const o = p as AnyObj; return String(o.url || o.videoUrl || o.playbackUrl || o.signedUrl || '').trim() }
const isHlsUrl = (url: string) => url.toLowerCase().includes('.m3u8')
const extractPracticeStarterCode = (p: unknown) => { if (!p) return ''; const o = p as AnyObj; return String(o?.starterCode ?? o?.startCode ?? o?.starter_code ?? (o?.practice as AnyObj)?.starterCode ?? (o?.practiceExam as AnyObj)?.starterCode ?? '') }
const normalizeContent = (c: AnyObj) => ({ ...c, contentId: getContentId(c) })

const CONTENT_ICONS: Record<string, string> = { VIDEO: '▶', DOCUMENT: '📄', QUIZ: '✏️', PRACTICE: '💻' }
const STATUS_ICONS: Record<string, string> = { COMPLETED: '✅', IN_PROCESS: '🔵', NOT_STARTED: '○' }
const LEARNING_STATE_KEY_PREFIX = 'unicode_learning_state_v1'
const COURSE_PROGRESS_CACHE_KEY_PREFIX = 'unicode_course_progress_v1'

function MiniBar({ percent, color }: { percent: number; color?: string }) {
  const p = Math.min(100, Math.max(0, percent || 0))
  return <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden mt-0.5"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: color || 'linear-gradient(90deg,#22c55e,#a3e635)' }} /></div>
}

/* ─── HLS Video Player with seamless URL refresh ─── */
function HlsCourseVideoPlayer({ src, playbackVideoId, playbackDuration, className, onPlay, onEnded, onError }: { src: string; playbackVideoId?: string; playbackDuration?: number; className?: string; onPlay?: () => void; onEnded?: () => void; onError?: (e: unknown) => void }) {
  const v0Ref = useRef<HTMLVideoElement>(null)
  const v1Ref = useRef<HTMLVideoElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRefs = useRef<(any | null)[]>([null, null])
  const activeSlotRef = useRef(0)
  const [activeSlot, setActiveSlot] = useState(0)
  const refreshBusyRef = useRef(false)
  const pvIdRef = useRef(playbackVideoId)
  const pvDurRef = useRef(playbackDuration)
  useEffect(() => { pvIdRef.current = playbackVideoId }, [playbackVideoId])
  useEffect(() => { pvDurRef.current = playbackDuration }, [playbackDuration])
  const getVEl = (s: number) => (s === 0 ? v0Ref.current : v1Ref.current)
  const destroySlot = useCallback((s: number) => { const h = hlsRefs.current[s]; if (h) { try { h.destroy() } catch {} hlsRefs.current[s] = null }; const v = s === 0 ? v0Ref.current : v1Ref.current; if (v) { v.removeAttribute('src'); try { v.load() } catch {} } }, [])

  useEffect(() => {
    activeSlotRef.current = 0; setActiveSlot(0); destroySlot(0); destroySlot(1)
    const v0 = v0Ref.current; if (!v0 || !src) return
    if (isHlsUrl(src)) { if (v0.canPlayType('application/vnd.apple.mpegurl')) v0.src = src; else if (Hls.isSupported()) { const h = new Hls({ enableWorker: true, startLevel: -1, maxBufferLength: 90, backBufferLength: 30 }); hlsRefs.current[0] = h; h.loadSource(src); h.attachMedia(v0) } else v0.src = src } else v0.src = src
    return () => { destroySlot(0); destroySlot(1) }
  }, [src, destroySlot])

  const refreshUrl = useCallback(async () => {
    if (refreshBusyRef.current) return; const vid = pvIdRef.current; const a = activeSlotRef.current; const b = 1 - a; const vA = getVEl(a); const vB = getVEl(b); if (!vid || !vA || !vB) return
    refreshBusyRef.current = true; const t = Number.isFinite(vA.currentTime) ? vA.currentTime : 0; const wasPlaying = !vA.paused && !vA.ended
    try {
      const pr = await videoApi.getVideoPlaybackUrl(vid); const pp = unwrap(pr) as AnyObj; const newUrl = extractPlaybackUrl(pp); const dur = Number(pp?.duration); if (!newUrl) { refreshBusyRef.current = false; return }
      if (Number.isFinite(dur) && dur > 0) pvDurRef.current = dur; destroySlot(b)
      let fin = false; let st: ReturnType<typeof setTimeout> | null = null
      const clr = () => { if (st) { clearTimeout(st); st = null } }
      const swap = () => { if (fin) return; fin = true; clr(); try { const lt = Number.isFinite(vA.currentTime) ? vA.currentTime : t; if (Number.isFinite(lt) && lt >= 0) vB.currentTime = lt; vB.playbackRate = vA.playbackRate; vA.pause(); vB.volume = vA.volume; if (wasPlaying) vB.play().catch(() => {}); else { vB.pause(); if (Number.isFinite(t) && t >= 0) vB.currentTime = t } } catch {}; destroySlot(a); activeSlotRef.current = b; setActiveSlot(b); refreshBusyRef.current = false }
      st = setTimeout(() => { if (fin) return; destroySlot(b); refreshBusyRef.current = false }, 12000)
      const waitSwap = () => { if (vB.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) { swap(); return }; const onR = () => { if (!fin && vB.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) swap() }; vB.addEventListener('canplay', onR, { once: true }); vB.addEventListener('loadeddata', onR, { once: true }); setTimeout(() => swap(), 5000) }
      if (isHlsUrl(newUrl) && Hls.isSupported()) { const h = new Hls({ enableWorker: true, startLevel: -1, maxBufferLength: 90, backBufferLength: 30 }); hlsRefs.current[b] = h; h.attachMedia(vB); h.on(Hls.Events.ERROR, (_: unknown, d: { fatal?: boolean }) => { if (!d?.fatal || fin) return; try { h.destroy() } catch {}; hlsRefs.current[b] = null; clr(); refreshBusyRef.current = false }); const onP = () => { try { if (Number.isFinite(t) && t >= 0) vB.currentTime = t } catch {}; h.off(Hls.Events.MANIFEST_PARSED, onP); waitSwap() }; h.on(Hls.Events.MANIFEST_PARSED, onP); h.loadSource(newUrl); h.startLoad() } else { vB.src = newUrl; const onM = () => { try { if (Number.isFinite(t) && t >= 0) vB.currentTime = t } catch {}; vB.removeEventListener('loadedmetadata', onM); waitSwap() }; vB.addEventListener('loadedmetadata', onM, { once: true }) }
    } catch { refreshBusyRef.current = false }
  }, [destroySlot])

  useEffect(() => { if (!playbackVideoId || !src) return; const dur = Number(pvDurRef.current); const ms = Number.isFinite(dur) && dur > 0 ? Math.max(30000, (dur * 60 + 60) * 1000) : 60000; const id = setInterval(() => refreshUrl(), ms); return () => clearInterval(id) }, [playbackVideoId, src, playbackDuration, refreshUrl])

  const relay = (slot: number, handler?: () => void) => () => { if (slot !== activeSlotRef.current) return; handler?.() }
  const handleErr = async (slot: number, e: unknown) => { if (slot !== activeSlotRef.current) return; await refreshUrl(); onError?.(e) }
  if (!src) return null

  const layerCls = (slot: number) => `${className || ''} w-full max-h-[520px] block bg-black ${slot === activeSlot ? 'relative z-[1]' : 'absolute left-0 top-0 w-full max-h-[520px] opacity-0 pointer-events-none z-0'}`.trim()
  return (
    <div className="relative w-full min-h-[120px]">
      <video ref={v0Ref} controls={activeSlot === 0} preload="metadata" playsInline className={layerCls(0)} onPlay={relay(0, onPlay)} onEnded={relay(0, onEnded)} onError={() => handleErr(0, null)} />
      <video ref={v1Ref} controls={activeSlot === 1} preload="metadata" playsInline className={layerCls(1)} onPlay={relay(1, onPlay)} onEnded={relay(1, onEnded)} onError={() => handleErr(1, null)} />
    </div>
  )
}

/* ═══════════════════ MAIN ═══════════════════ */
const CourseLearning = () => {
  const { courseSlug } = useParams()
  const [courseId, setCourseId] = useState(resolveToId(courseSlug || ''))
  const [searchParams] = useSearchParams()
  const initialEnrollmentId = searchParams.get('enrollmentId') || ''
  const queryChapterId = searchParams.get('chapterId') || ''
  const queryLessonId = searchParams.get('lessonId') || ''
  const queryContentId = searchParams.get('contentId') || ''
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const initialResumeRef = useRef<{ chapterId: string; lessonId: string; contentId: string } | null>(null)

  if (!initialResumeRef.current) {
    const qr = { chapterId: normalizeId(queryChapterId), lessonId: normalizeId(queryLessonId), contentId: normalizeId(queryContentId) }
    let saved: AnyObj | null = null; try { const raw = localStorage.getItem(`${LEARNING_STATE_KEY_PREFIX}:${courseId}`); if (raw) saved = JSON.parse(raw) } catch { saved = null }
    initialResumeRef.current = { chapterId: qr.chapterId || normalizeId(saved?.chapterId), lessonId: qr.lessonId || normalizeId(saved?.lessonId), contentId: qr.contentId || normalizeId(saved?.contentId) }
  }

  /* ── Resolve slug→UUID if needed ── */
  useEffect(() => {
    if (!courseSlug || isUuid(courseSlug)) return
    const resolved = resolveToId(courseSlug)
    if (isUuid(resolved)) { setCourseId(resolved); return }
    import('../api').then(({ courseApi }) => {
      courseApi.getAll(0, 200).then((res: unknown) => {
        type AO = Record<string, unknown>
        const unwrapLocal = (r: unknown) => { const rr = r as { data?: { data?: unknown } }; return rr?.data?.data ?? rr?.data ?? r }
        const list = Array.isArray(unwrapLocal(res)) ? unwrapLocal(res) as AO[] : ((unwrapLocal(res) as AO)?.content as AO[]) || []
        setSlugMap(list.map((x) => ({ id: String(x.courseId || x.id), title: String(x.title || '') })))
        const realId = resolveToId(courseSlug)
        if (isUuid(realId)) setCourseId(realId)
      }).catch(() => {})
    })
  }, [courseSlug])

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [enrollmentId, setEnrollmentId] = useState(initialEnrollmentId)
  const [chapters, setChapters] = useState<AnyObj[]>([])
  const [lessonsByChapter, setLessonsByChapter] = useState<Record<string, AnyObj[]>>({})
  const [contentsByLesson, setContentsByLesson] = useState<Record<string, AnyObj[]>>({})
  const [videosByLesson, setVideosByLesson] = useState<Record<string, AnyObj[]>>({})
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [selectedContent, setSelectedContent] = useState<AnyObj | null>(null)
  const [currentVideo, setCurrentVideo] = useState<AnyObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshingContent, setRefreshingContent] = useState(false)
  const [contentReloadTick, setContentReloadTick] = useState(0)
  const [certLoading, setCertLoading] = useState(false)
  const [certDone, setCertDone] = useState(false)
  const [certChecked, setCertChecked] = useState(false)
  const [certLearnerName, setCertLearnerName] = useState('')
  const [docRead, setDocRead] = useState(false)
  const [documentsByLesson, setDocumentsByLesson] = useState<Record<string, Record<string, AnyObj>>>({})
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [practiceError, setPracticeError] = useState('')
  const [practiceSession, setPracticeSession] = useState<AnyObj | null>(null)
  const [practiceCode, setPracticeCode] = useState('')
  const [submittingPractice, setSubmittingPractice] = useState(false)
  const [practiceResult, setPracticeResult] = useState<AnyObj | null>(null)
  const [practiceSubmitError, setPracticeSubmitError] = useState('')
  const [courseProgress, setCourseProgress] = useState<{ percent: number; chapters: { id: string; status: string }[] }>({ percent: 0, chapters: [] })
  const [chapterProgressMap, setChapterProgressMap] = useState<Record<string, { percent: number; lessons: { id: string; status: string }[] }>>({})
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, { percent: number }>>({})
  const [contentStatusMap, setContentStatusMap] = useState<Record<string, string>>({})

  const refreshAllProgress = useCallback(() => { if (!isValidId(courseId) || !isValidId(enrollmentId)) return; processApi.getCourseProgress({ courseId: courseId!, enrollmentId }).then((res) => { const p = (res as { data?: { data?: AnyObj } }).data?.data ?? (res as { data?: unknown }).data as AnyObj; setCourseProgress({ percent: (p?.percentComplete as number) ?? 0, chapters: ((p?.processResponseList as AnyObj[]) || []).map((r) => ({ id: extractProcessId(r), status: extractStatus(r) })) }) }).catch(() => {}) }, [courseId, enrollmentId])

  const refreshChapterProgress = useCallback((chId: string) => { if (!isValidId(enrollmentId) || !isValidId(chId)) return; processApi.getChapterProgress({ chapterId: chId, enrollmentId }).then((res) => { const p = (res as { data?: { data?: AnyObj } }).data?.data ?? (res as { data?: unknown }).data as AnyObj; setChapterProgressMap((prev) => ({ ...prev, [chId]: { percent: (p?.percentComplete as number) ?? 0, lessons: ((p?.processResponseList as AnyObj[]) || []).map((r) => ({ id: extractProcessId(r), status: extractStatus(r) })) } })) }).catch(() => {}) }, [enrollmentId])

  const refreshLessonProgress = useCallback((lId: string) => { if (!isValidId(enrollmentId) || !isValidId(lId)) return; processApi.getLessonProgress({ lessonId: lId, enrollmentId }).then((res) => { const p = (res as { data?: { data?: AnyObj } }).data?.data ?? (res as { data?: unknown }).data as AnyObj; setLessonProgressMap((prev) => ({ ...prev, [lId]: { percent: (p?.percentComplete as number) ?? 0 } })); const list = (p?.processResponseList as AnyObj[]) || []; const map: Record<string, string> = {}; list.forEach((r) => { const id = extractProcessId(r); if (id) map[id] = extractStatus(r) }); setContentStatusMap((prev) => ({ ...prev, ...map })) }).catch(() => {}) }, [enrollmentId])

  useEffect(() => { let c = false; const resolve = async () => { if (enrollmentId || !courseId) return; for (const s of ['IN_PROGRESS', 'NOT_STARTED', 'COMPLETED'] as const) { try { const res = await enrollmentApi.getMyLearning(s, 0, 50); const page = unwrap(res) as AnyObj; const list = (Array.isArray(page?.content) ? page.content : Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : []) as AnyObj[]; const found = list.find((e) => (e?.courseResponse as AnyObj)?.courseId && String((e.courseResponse as AnyObj).courseId) === String(courseId)); if (!c && isValidId(found?.enrollmentId)) { setEnrollmentId(found!.enrollmentId as string); return } } catch {} } }; resolve(); return () => { c = true } }, [courseId, enrollmentId])

  useEffect(() => { if (!courseId) return; let c = false; setLoading(true); setError(''); chapterApi.getByCourseId(courseId).then((res) => { if (c) return; const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setChapters(arr); if (arr.length > 0) { const rid = initialResumeRef.current?.chapterId; const rch = rid ? arr.find((ch) => normalizeId(ch.chapterId || ch.id) === rid) : null; setSelectedChapterId(((rch?.chapterId || rch?.id || arr[0].chapterId || arr[0].id || '') as string)) } }).catch((e: { response?: { data?: { message?: string } }; message?: string }) => { if (!c) setError(e.response?.data?.message || e.message || t('learning.loadChaptersFailed')) }).finally(() => { if (!c) setLoading(false) }); return () => { c = true } }, [courseId])

  useEffect(() => { refreshAllProgress() }, [refreshAllProgress])
  useEffect(() => { if (!enrollmentId || chapters.length === 0) return; chapters.forEach((ch) => refreshChapterProgress((ch.chapterId || ch.id) as string)) }, [enrollmentId, chapters, refreshChapterProgress])

  useEffect(() => { if (!selectedChapterId) { setSelectedLessonId(''); return }; let c = false; lessonApi.getByChapterId(selectedChapterId).then((res) => { if (c) return; const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setLessonsByChapter((p) => ({ ...p, [selectedChapterId]: arr })); if (arr.length > 0) { const rid = initialResumeRef.current?.lessonId; const rl = rid ? arr.find((l) => normalizeId(l.lessonId || l.id) === rid) : null; setSelectedLessonId(((rl?.lessonId || rl?.id || arr[0].lessonId || arr[0].id || '') as string)) } }).catch(() => { if (!c) setLessonsByChapter((p) => ({ ...p, [selectedChapterId]: [] })) }); return () => { c = true } }, [selectedChapterId])

  useEffect(() => { if (!enrollmentId || !selectedChapterId) return; const ls = lessonsByChapter[selectedChapterId] || []; ls.forEach((l) => refreshLessonProgress((l.lessonId || l.id) as string)) }, [enrollmentId, selectedChapterId, lessonsByChapter, refreshLessonProgress])

  useEffect(() => {
    if (!selectedLessonId) { setSelectedContent(null); setCurrentVideo(null); return }; let c = false
    const load = async () => {
      setRefreshingContent(true)
      try {
        const cRes = await contentApi.getByLessonId(selectedLessonId).catch(() => null); if (c) return
        const contents = cRes ? (Array.isArray(unwrap(cRes)) ? (unwrap(cRes) as AnyObj[]).map(normalizeContent) : []) : []
        const vcList = contents.filter((ct) => (ct as AnyObj).contentType === 'VIDEO'); const vMap = new Map<string, AnyObj>()
        if (vcList.length > 0) { try { const allRes = await videoApi.getAllActiveVideos(); const allV = Array.isArray(unwrap(allRes)) ? unwrap(allRes) as AnyObj[] : []; const validIds = new Set(vcList.map((ct) => getContentId(ct)).filter(isTrackableContentId).map(normalizeId)); allV.forEach((v) => { const nId = normalizeId(getVideoContentId(v)); if (validIds.has(nId)) vMap.set(nId, v) }); await Promise.all([...vMap.entries()].map(async ([cid, v]) => { const vid = (v?.videoId || v?.id) as string; if (!vid) return; try { const pr = await videoApi.getVideoPlaybackUrl(vid); const pp = unwrap(pr) as AnyObj; const pu = extractPlaybackUrl(pp); const pd = Number(pp?.duration); if (pu) vMap.set(cid, { ...v, url: pu, playbackDuration: pd }) } catch {} })) } catch {} }
        const dRes = await documentApi.getByLessonId(selectedLessonId).catch(() => null); if (c) return
        const enriched = [...contents]; const docs = dRes ? (Array.isArray(unwrap(dRes)) ? unwrap(dRes) as AnyObj[] : []) : []; const docMap: Record<string, AnyObj> = {}; docs.forEach((d) => { const cid = normalizeId(d?.contentId); if (cid) docMap[cid] = d }); setDocumentsByLesson((p) => ({ ...p, [selectedLessonId]: docMap }))
        setContentsByLesson((p) => ({ ...p, [selectedLessonId]: enriched })); setVideosByLesson((p) => ({ ...p, [selectedLessonId]: [...vMap.values()] }))
        if (enriched.length > 0) { const rid = initialResumeRef.current?.contentId; const rc = rid ? enriched.find((ct) => normalizeId(getContentId(ct)) === rid) : null; const picked = rc || enriched[0]; setSelectedContent(picked); const pid = normalizeId(getContentId(picked)); setCurrentVideo((picked as AnyObj).contentType === 'VIDEO' ? vMap.get(pid) || null : null); initialResumeRef.current = { chapterId: '', lessonId: '', contentId: '' } } else { setSelectedContent(null); setCurrentVideo(null) }
        setDocRead(false)
      } catch {} finally { if (!c) setRefreshingContent(false) }
    }; load(); return () => { c = true }
  }, [selectedLessonId, contentReloadTick])

  useEffect(() => { if (!enrollmentId || !selectedLessonId) return; refreshLessonProgress(selectedLessonId) }, [enrollmentId, selectedLessonId, refreshLessonProgress])
  useEffect(() => { if (!courseId) return; try { localStorage.setItem(`${LEARNING_STATE_KEY_PREFIX}:${courseId}`, JSON.stringify({ chapterId: selectedChapterId || '', lessonId: selectedLessonId || '', contentId: getContentId(selectedContent) || '', updatedAt: Date.now() })) } catch {} }, [courseId, selectedChapterId, selectedLessonId, selectedContent])

  const currentContents = useMemo(() => contentsByLesson[selectedLessonId] || [], [contentsByLesson, selectedLessonId])
  const currentVideos = useMemo(() => videosByLesson[selectedLessonId] || [], [videosByLesson, selectedLessonId])

  const handleSelectContent = (ct: AnyObj) => { setSelectedContent(ct); setDocRead(false); const cid = normalizeId(getContentId(ct)); setCurrentVideo(ct.contentType === 'VIDEO' ? currentVideos.find((v) => normalizeId(getVideoContentId(v)) === cid) || null : null) }

  const trackContent = (contentId: string, status: string) => { if (!enrollmentId || !isTrackableContentId(contentId)) return; const nId = normalizeId(contentId); const cur = contentStatusMap[nId]; if (cur === status) return; if (cur === 'COMPLETED' && status === 'IN_PROCESS') return; setContentStatusMap((p) => ({ ...p, [nId]: status })); processApi.trackContent({ contentId, enrollmentId, status: status as 'NOT_STARTED' | 'IN_PROCESS' | 'COMPLETED' }).then(() => { if (selectedLessonId) refreshLessonProgress(selectedLessonId); if (selectedChapterId) refreshChapterProgress(selectedChapterId); refreshAllProgress(); setTimeout(() => { if (selectedLessonId) refreshLessonProgress(selectedLessonId); if (selectedChapterId) refreshChapterProgress(selectedChapterId); refreshAllProgress() }, 400) }).catch(() => {}) }

  const handleVideoPlay = () => { const cid = getContentId(selectedContent) || getVideoContentId(currentVideo); if (isTrackableContentId(cid)) trackContent(cid, 'IN_PROCESS') }
  const handleVideoEnded = () => { const cid = getContentId(selectedContent) || getVideoContentId(currentVideo); if (isTrackableContentId(cid)) trackContent(cid, 'COMPLETED') }
  const findRealContentId = (ct: AnyObj | null) => { if (!ct) return ''; const cid = getContentId(ct); if (isTrackableContentId(cid)) return cid; if (ct._virtual && ct.contentType === 'DOCUMENT') { const docs = documentsByLesson[selectedLessonId]; if (docs) { const realDoc = Object.entries(docs).find(([, d]) => d); if (realDoc) return realDoc[0] } } const contents = contentsByLesson[selectedLessonId] || []; const real = contents.find((c) => (c as AnyObj).contentType === ct.contentType && isTrackableContentId(getContentId(c))); return real ? getContentId(real) : '' }
  const handleMarkDocRead = () => { const cid = findRealContentId(selectedContent); if (cid) { setDocRead(true); trackContent(cid, 'COMPLETED') } else { setDocRead(true) } }
  const handleGoToQuiz = () => { if (!selectedContent) return; const scid = getContentId(selectedContent); const qId = selectedContent._virtual ? selectedContent.lessonId as string : scid; const p = new URLSearchParams(); if (enrollmentId) p.set('enrollmentId', enrollmentId); if (courseId) p.set('courseId', courseId); const lid = (selectedContent.lessonId || selectedLessonId) as string; if (lid) p.set('lessonId', lid); if (selectedChapterId) p.set('chapterId', selectedChapterId); if (scid) p.set('contentId', scid); navigate(`/quiz/${qId}?${p.toString()}`) }

  useEffect(() => { let c = false; const load = async () => { if (selectedContent?.contentType !== 'PRACTICE') { setPracticeError(''); setPracticeSession(null); setPracticeCode(''); setPracticeResult(null); setPracticeSubmitError(''); return }; const cid = getContentId(selectedContent); if (!isTrackableContentId(cid)) { setPracticeError(t('learning.invalidContentId')); return }; setPracticeLoading(true); setPracticeError(''); try { const res = await practiceApi.startPractice(cid); if (c) return; const pp = unwrap(res) as AnyObj; setPracticeSession(pp || null); setPracticeCode(extractPracticeStarterCode(pp)); setPracticeResult(null); setPracticeSubmitError(''); trackContent(cid, 'IN_PROCESS') } catch (err: unknown) { if (c) return; setPracticeSession(null); setPracticeCode(''); const e = err as { response?: { data?: { message?: string } }; message?: string }; setPracticeError(e.response?.data?.message || e.message || t('learning.loadPracticeFailed')) } finally { if (!c) setPracticeLoading(false) } }; load(); return () => { c = true } }, [selectedContent])

  const handleSubmitPractice = async () => { if (!practiceSession?.submissionId) { setPracticeSubmitError(t('learning.missingSubmissionId')); return }; setSubmittingPractice(true); setPracticeSubmitError(''); try { const res = await practiceApi.submitPractice({ submissionId: practiceSession.submissionId as string, learnerCode: practiceCode }); const pp = unwrap(res) as AnyObj; setPracticeResult(pp || null); const scid = getContentId(selectedContent); if (isTrackableContentId(scid) && Number(pp?.failed || 0) === 0) trackContent(scid, 'COMPLETED') } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; message?: string }; setPracticeSubmitError(e.response?.data?.message || e.message || t('learning.submitPracticeFailed')); setPracticeResult(null) } finally { setSubmittingPractice(false) } }

  const getChapterTitle = (c: AnyObj) => (c?.title ?? c?.chapterTitle ?? t('learning.chapter')) as string
  const getLessonTitle = (l: AnyObj) => (l?.title ?? l?.lessonTitle ?? t('learning.lesson')) as string
  const getStatusIcon = (cId: string) => STATUS_ICONS[contentStatusMap[normalizeId(cId)]] || STATUS_ICONS.NOT_STARTED
  const getLocalChapterPercent = (chId: string) => { const ls = lessonsByChapter[chId] || []; if (!ls.length) return null; const vals = ls.map((l) => lessonProgressMap[(l.lessonId || l.id) as string]?.percent).filter((v) => typeof v === 'number') as number[]; if (!vals.length) return null; return vals.reduce((s, v) => s + v, 0) / vals.length }
  const getChapterPercent = (chId: string) => { const bp = chapterProgressMap[chId]?.percent ?? 0; const lp = getLocalChapterPercent(chId); return lp === null ? bp : Math.max(bp, lp) }
  const getChapterStatus = (chId: string) => { if (getChapterPercent(chId) >= 99.99) return 'COMPLETED'; const found = courseProgress.chapters.find((c) => normalizeId(c.id) === normalizeId(chId)); return found?.status || 'NOT_STARTED' }

  const chapterIds = chapters.map((ch) => (ch.chapterId || ch.id) as string).filter(Boolean)
  const chapterPercents = chapterIds.map((id) => getChapterPercent(id)).filter((v) => typeof v === 'number')
  const chapterAvg = chapterPercents.length > 0 ? chapterPercents.reduce((s, v) => s + v, 0) / chapterPercents.length : 0
  const cpct = Math.round(Math.max(courseProgress.percent || 0, chapterAvg))
  const selectedDoc = selectedContent?.contentType === 'DOCUMENT' ? documentsByLesson[selectedLessonId]?.[normalizeId(getContentId(selectedContent))] : null
  const displayLearnerName = certLearnerName || user?.name || user?.username || user?.email || t('learning.you')

  useEffect(() => { if (!isValidId(courseId) || !isValidId(enrollmentId)) return; try { localStorage.setItem(`${COURSE_PROGRESS_CACHE_KEY_PREFIX}:${courseId!}`, JSON.stringify({ courseId, enrollmentId, percent: cpct, updatedAt: Date.now() })) } catch {} }, [courseId, enrollmentId, cpct])

  useEffect(() => { let c = false; const check = async () => { if (!isValidId(user?.userId) || !isValidId(courseId)) return; try { const res = await certificateApi.getByLearnerId(user!.userId!); if (c) return; const certs = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; const ex = certs.find((ct) => normalizeId(ct?.courseId) === normalizeId(courseId)); setCertDone(Boolean(ex)); if (ex) setCertLearnerName((ex.learnerName || '') as string) } catch {} finally { if (!c) setCertChecked(true) } }; check(); return () => { c = true } }, [user?.userId, courseId])

  useEffect(() => { if (!certChecked || certDone || certLoading) return; if (!isValidId(user?.userId) || !isValidId(courseId)) return; if (cpct < 100) return; let c = false; const create = async () => { setCertLoading(true); try { const res = await certificateApi.create({ learnerId: user!.userId!, courseId: courseId! }); if (c) return; const cert = unwrap(res) as AnyObj; setCertDone(true); setCertLearnerName((cert?.learnerName || user?.name || '') as string) } catch (e: unknown) { const err = e as { response?: { data?: { errorCode?: string } } }; if (String(err.response?.data?.errorCode || '').includes('CERTIFICATE_ALREADY_EXISTS')) setCertDone(true) } finally { if (!c) setCertLoading(false) } }; create(); return () => { c = true } }, [cpct, certChecked, certDone, certLoading, user?.userId, user?.name, courseId])

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="max-w-[1400px] mx-auto pb-12">
        <div className={`grid ${sidebarOpen ? 'grid-cols-[340px_minmax(0,1fr)]' : 'grid-cols-[0px_minmax(0,1fr)]'} relative transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]`}>
          {sidebarOpen && <div className="hidden max-[768px]:block fixed inset-0 bg-black/30 z-[1050]" onClick={() => setSidebarOpen(false)} />}
          {/* Toggle – only visible when sidebar closed */}
          {!sidebarOpen && <button type="button" className="fixed top-20 z-[1100] w-10 h-10 rounded-xl border border-border-medium bg-white text-text-secondary text-lg cursor-pointer flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[rgba(0,86,210,0.06)] hover:border-primary-500 hover:text-primary-500 left-4" onClick={() => setSidebarOpen(true)} title={t('learning.openMenu')}>☰</button>}

          {/* Sidebar */}
          <aside className={`bg-white border-r border-border-medium h-[calc(100vh-64px)] sticky top-16 overflow-hidden transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${sidebarOpen ? 'w-[340px] min-w-[340px]' : 'w-0 min-w-0 border-r-0 p-0'}`}>
            <div className="flex justify-between items-center px-5 pt-4 pb-2 shrink-0"><h2 className="m-0 text-base font-bold whitespace-nowrap">{t('learning.courseContent')}</h2><button type="button" className="bg-transparent border-none text-text-muted text-lg cursor-pointer p-0.5 rounded-md hover:text-text-main hover:bg-bg-deep" onClick={() => setSidebarOpen(false)}>✕</button></div>
            {loading && <div className="px-5 py-4 text-[0.88rem] text-text-muted whitespace-nowrap">{t('learning.loading')}</div>}
            {error && <div className="px-5 py-4 text-[0.88rem] text-red-600">{error}</div>}
            {!loading && !error && (
              <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2 scrollbar-thin scrollbar-thumb-gray-300">
                {chapters.map((ch) => { const chId = (ch.chapterId || ch.id) as string; const isActive = chId === selectedChapterId; const cpP = Math.round(getChapterPercent(chId)); const chSt = getChapterStatus(chId); return (
                  <div key={chId} className="mb-1">
                    <button type="button" className={`w-full flex justify-between items-center gap-1.5 text-left px-2.5 py-2 rounded-[10px] border-none bg-transparent text-text-main text-[0.88rem] font-semibold cursor-pointer transition-all whitespace-nowrap hover:bg-bg-deep ${isActive ? 'bg-[rgba(0,86,210,0.06)] text-primary-500' : ''}`} onClick={() => setSelectedChapterId(chId)}>
                      <span className="flex-1 overflow-hidden text-ellipsis">{getChapterTitle(ch)}</span>
                      <span className={`text-[0.78rem] font-bold shrink-0 ${chSt === 'COMPLETED' ? 'text-green-600' : 'text-primary-500'}`}>{chSt === 'COMPLETED' ? '✅' : `${cpP}%`}</span>
                    </button>
                    {isActive && (lessonsByChapter[chId] || []).map((lesson) => { const lId = (lesson.lessonId || lesson.id) as string; const isLActive = lId === selectedLessonId; const lContents = contentsByLesson[lId] || []; return (
                      <div key={lId} className="ml-2 mt-0.5">
                        <button type="button" className={`w-full text-left border-none bg-transparent text-text-secondary text-[0.84rem] px-2 py-1.5 rounded-lg cursor-pointer font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all hover:bg-bg-deep ${isLActive ? 'bg-[rgba(0,86,210,0.08)] text-primary-500 font-semibold' : ''}`} onClick={() => setSelectedLessonId(lId)}>{getLessonTitle(lesson)}</button>
                        {isLActive && lContents.length > 0 && <ul className="list-none p-0 mt-0.5 mb-1 ml-4">{lContents.map((ct, idx) => <li key={getContentId(ct) || `${ct.contentType}-${idx}`}><button type="button" className={`w-full text-left border-none bg-transparent text-text-muted text-[0.78rem] px-1.5 py-0.5 rounded-md cursor-pointer flex items-center gap-1 transition-all whitespace-nowrap hover:bg-bg-deep ${getContentId(selectedContent) === getContentId(ct) ? 'bg-[rgba(0,86,210,0.08)] text-primary-500' : ''}`} onClick={() => handleSelectContent(ct)}><span className="text-[0.72rem] shrink-0">{CONTENT_ICONS[ct.contentType as string] || '•'}</span><span className="flex-1">{ct.contentType === 'VIDEO' ? 'Video' : ct.contentType === 'DOCUMENT' ? t('learning.document') : ct.contentType === 'PRACTICE' ? t('learning.practice') : t('learning.quiz')}</span><span className="text-[0.65rem] shrink-0">{getStatusIcon(getContentId(ct))}</span></button></li>)}</ul>}
                      </div>
                    ) })}
                  </div>
                ) })}
              </div>
            )}
          </aside>

          {/* Main Content */}
          <section className="px-6 py-5 flex flex-col gap-4 min-h-[calc(100vh-64px)]">
            {/* Progress header */}
            <div className="bg-white border border-border-medium rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-baseline gap-2.5 flex-wrap"><span className="text-sm font-semibold text-text-main">{t('learning.lessonProgress')}</span>{selectedLessonId && <span className="text-[0.8rem] text-text-muted">{getLessonTitle((lessonsByChapter[selectedChapterId] || []).find((l) => (l.lessonId || l.id) === selectedLessonId) || {})}</span>}</div>
                <div className="flex items-center gap-2.5"><span className="text-lg font-extrabold text-amber-600">{Math.round(lessonProgressMap[selectedLessonId]?.percent || 0)}%</span><button type="button" className="border border-border-medium bg-white text-text-secondary rounded-[9px] px-2.5 py-1 text-[0.76rem] font-semibold cursor-pointer transition-all hover:bg-[rgba(0,86,210,0.06)] hover:border-primary-500 hover:text-primary-500 disabled:opacity-60 disabled:cursor-not-allowed" onClick={() => setContentReloadTick((v) => v + 1)} disabled={!selectedLessonId || refreshingContent}>{refreshingContent ? t('learning.refreshing') : t('learning.reloadContent')}</button></div>
              </div>
              <MiniBar percent={lessonProgressMap[selectedLessonId]?.percent || 0} color="linear-gradient(90deg,#f59e0b,#fbbf24)" />
            </div>

            {/* Chapter cards */}
            {chapters.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">{chapters.map((ch) => { const chId = (ch.chapterId || ch.id) as string; const pct = Math.round(getChapterPercent(chId)); const st = getChapterStatus(chId); return <button key={chId} type="button" className={`shrink-0 min-w-[150px] max-w-[200px] text-left bg-bg-deep border rounded-xl px-2.5 py-2 cursor-pointer transition-all text-text-secondary flex flex-col gap-0.5 hover:border-primary-500 hover:bg-white ${chId === selectedChapterId ? 'border-primary-500 bg-[rgba(0,86,210,0.04)]' : 'border-border-medium'} ${st === 'COMPLETED' ? '!border-green-600' : ''}`} onClick={() => setSelectedChapterId(chId)}><span className="text-[0.78rem] font-semibold overflow-hidden text-ellipsis whitespace-nowrap text-text-main">{getChapterTitle(ch)}</span><span className={`text-[0.72rem] font-bold ${pct >= 100 ? 'text-green-600' : 'text-primary-500'}`}>{pct}%</span><MiniBar percent={pct} color={pct >= 100 ? 'linear-gradient(90deg,#22c55e,#86efac)' : 'linear-gradient(90deg,#6366f1,#a5b4fc)'} /></button> })}</div>}

            {/* Certificate banners */}
            {cpct >= 100 && certChecked && !certDone && <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 font-semibold flex-wrap"><span>{certLoading ? t('learning.certGenerating') : t('learning.certPreparing')}</span></div>}
            {cpct >= 100 && certDone && <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 font-semibold flex-wrap"><span>{t('learning.certCreated', { name: displayLearnerName })}</span><Link to="/my-certificates" className="px-4 py-2 rounded-xl font-bold border-none cursor-pointer bg-green-600 text-white no-underline text-[0.88rem] transition-colors hover:bg-green-700">{t('learning.viewCerts')}</Link></div>}

            {!selectedLessonId && <div className="text-sm text-text-muted py-4">{t('learning.selectLesson')}</div>}
            {selectedLessonId && !selectedContent && currentContents.length === 0 && <div className="text-sm text-text-muted py-4">{t('learning.noContent')}</div>}

            {/* VIDEO */}
            {selectedContent?.contentType === 'VIDEO' && <div className="flex flex-col gap-2">{currentVideo ? (getVideoUrl(currentVideo) ? <><div className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-border-medium"><HlsCourseVideoPlayer src={getVideoUrl(currentVideo)} playbackVideoId={(currentVideo.videoId || currentVideo.id) as string} playbackDuration={currentVideo.playbackDuration as number} className="" onPlay={handleVideoPlay} onEnded={handleVideoEnded} /></div><div className="font-semibold text-base">{t('learning.videoLesson')}{currentVideo.duration ? ` · ${currentVideo.duration} ${t('learning.minutes')}` : ''}</div></> : <div className="text-sm text-text-muted py-4">{t('learning.noVideoUrl')}</div>) : <div className="text-sm text-text-muted py-4">{t('learning.noVideoUploaded')}</div>}</div>}

            {/* DOCUMENT */}
            {selectedContent?.contentType === 'DOCUMENT' && <div className="bg-white border border-border-medium rounded-[18px] overflow-hidden"><div className="flex items-center gap-2.5 px-4 py-3 bg-bg-deep border-b border-border-subtle"><span className="text-xl">📄</span><h3 className="m-0 text-lg font-bold">{(selectedDoc?.title as string) || t('learning.documentTitle')}</h3></div><div className="px-4 py-5 text-text-secondary leading-relaxed text-sm">{(selectedDoc?.documentUrl) ? <><a href={selectedDoc.documentUrl as string} target="_blank" rel="noreferrer">📄 {t('learning.openDocument')}</a><button type="button" className="ml-3 bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] border-none text-white px-4 py-2 rounded-lg cursor-pointer text-[0.85rem]" onClick={async () => { try { const res = await watermarkApi.downloadWithWatermark((selectedDoc as AnyObj).documentId as string); const blob = new Blob([(res as { data: BlobPart }).data]); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; let fn = (selectedDoc?.title || 'document') as string; const cd = ((res as { headers?: Record<string, string> }).headers || {})['content-disposition']; if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m?.[1]) fn = m[1] } else if (!fn.includes('.')) fn += '.pdf'; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; alert(t('learning.downloadFailed') + ': ' + (err.response?.data?.message || err.message)) } }}>🔒 {t('learning.downloadWatermark')}</button></> : <><p>{t('learning.noDocUrl')}</p><p>{t('learning.noDocUrlHint')}</p></>}</div><div className="px-4 py-3 border-t border-border-subtle flex justify-center">{contentStatusMap[normalizeId(getContentId(selectedContent))] === 'COMPLETED' || docRead ? <div className="font-bold text-green-600 text-sm">✅ {t('learning.docRead')}</div> : <button type="button" className="px-5 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer bg-primary-500 text-white transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)]" onClick={handleMarkDocRead}>{t('learning.markDocRead')}</button>}</div></div>}

            {/* QUIZ */}
            {selectedContent?.contentType === 'QUIZ' && <div className="bg-white border border-border-medium rounded-[18px] overflow-hidden"><div className="flex items-center gap-2.5 px-4 py-3 bg-purple-50 border-b border-border-subtle"><span className="text-xl">✏️</span><h3 className="m-0 text-lg font-bold">{t('learning.quiz')}</h3></div><div className="px-6 py-10 text-center flex flex-col items-center gap-1.5">{contentStatusMap[normalizeId(getContentId(selectedContent))] === 'COMPLETED' ? <><div className="text-[2.8rem] mb-0.5">✅</div><h4 className="m-0 text-lg font-bold">{t('learning.quizCompleted')}</h4><p className="m-0 text-text-muted text-[0.88rem]">{t('learning.quizRetryHint')}</p><button type="button" className="mt-1.5 px-7 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer bg-primary-500 text-white transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)]" onClick={handleGoToQuiz}>{t('learning.retakeQuiz')}</button></> : <><div className="text-[2.8rem] mb-0.5">📝</div><h4 className="m-0 text-lg font-bold">{t('learning.quizReady')}</h4><div className="flex gap-1.5 items-center text-text-muted text-[0.82rem] mb-1"><span>{t('learning.quizTime')}</span><span>•</span><span>{t('learning.quizPassScore')}</span></div><button type="button" className="mt-1.5 px-7 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer bg-primary-500 text-white transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)]" onClick={handleGoToQuiz}>{t('learning.startQuiz')}</button></>}</div></div>}

            {/* PRACTICE */}
            {selectedContent?.contentType === 'PRACTICE' && <div className="bg-white border border-border-medium rounded-[18px] p-4"><div className="flex items-center gap-3 mb-4"><span className="text-2xl">💻</span><div><h3 className="m-0 text-lg font-bold">{(practiceSession?.title as string) || t('learning.practice')}</h3><p className="m-0 text-text-muted text-sm">{(practiceSession?.language as string) || 'N/A'} • {(practiceSession?.difficulty as string) || 'N/A'}</p></div></div>{practiceLoading && <div className="text-sm text-text-muted py-4">{t('learning.loadingPractice')}</div>}{!practiceLoading && practiceError && <div className="text-sm text-text-muted py-4">{practiceError}</div>}{!practiceLoading && !practiceError && practiceSession && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div><h4 className="m-0 mb-2 text-base font-bold">{t('learning.problemDesc')}</h4><p className="text-text-secondary text-sm leading-relaxed">{(practiceSession.description as string) || t('learning.noProblemDesc')}</p><h4 className="mt-4 mb-2 text-base font-bold">{t('learning.visibleTestCases')}</h4><div className="flex flex-col gap-2">{((practiceSession.visibleTestCases as AnyObj[]) || []).length === 0 && <p className="text-text-muted text-sm">{t('learning.noTestCases')}</p>}{((practiceSession.visibleTestCases as AnyObj[]) || []).map((tc, idx) => <div key={(tc.testcaseId as string) || idx} className="bg-bg-deep border border-border-subtle rounded-xl px-3 py-2 text-sm"><div className="font-semibold text-text-main mb-1">Case {idx + 1} · {String(tc.outputType)}</div><div><strong>Input:</strong> <code className="bg-gray-100 px-1 rounded">{String(tc.inputData || t('learning.empty'))}</code></div><div><strong>Expected:</strong> <code className="bg-gray-100 px-1 rounded">{String(tc.expectedOutput || t('learning.empty'))}</code></div>{!!tc.description && <div><strong>{t('learning.description')}:</strong> {String(tc.description)}</div>}</div>)}</div></div><div><div className="bg-slate-800 text-slate-300 rounded-t-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><span className="text-lg">⚡</span> Code Editor ({String(practiceSession.language)}) <span className="text-[0.72rem] bg-white/15 px-2 py-0.5 rounded-full">Monaco</span></div><div className="border border-slate-700 rounded-b-xl overflow-hidden" style={{ height: '350px' }}><MonacoEditor height="350px" language={String(practiceSession.language).toLowerCase() === 'python' ? 'python' : 'java'} theme="vs-dark" value={practiceCode} onChange={(v) => setPracticeCode(v || '')} options={{ fontSize: 14, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true, tabSize: 4, padding: { top: 8 } }} /></div>{!practiceCode && <p className="text-text-muted text-[0.82rem] mt-1">{t('learning.noStarterCode')}</p>}<div className="flex gap-2 mt-2"><button type="button" className="px-5 py-2 rounded-xl font-bold text-sm border-none cursor-pointer bg-primary-500 text-white transition-all hover:-translate-y-px" onClick={() => setPracticeCode(extractPracticeStarterCode(practiceSession))}>{t('learning.resetCode')}</button><button type="button" className="px-5 py-2 rounded-xl font-bold text-sm border-none cursor-pointer bg-primary-500 text-white transition-all hover:-translate-y-px disabled:opacity-60" onClick={handleSubmitPractice} disabled={submittingPractice}>{submittingPractice ? t('learning.grading') : '▶ Run / Submit'}</button></div>{practiceSubmitError && <p className="text-red-500 text-sm mt-2">{practiceSubmitError}</p>}{practiceResult && <div className="mt-3 border border-border-medium rounded-xl p-3"><div className="font-bold text-sm mb-2"><strong>{t('learning.result')}:</strong> Pass {(practiceResult.passed as number) ?? 0} • Fail {(practiceResult.failed as number) ?? 0}</div><div className="flex flex-col gap-2">{((practiceResult.results as AnyObj[]) || []).map((r, idx) => <div key={String(r.testcaseId || idx)} className="bg-bg-deep border border-border-subtle rounded-xl px-3 py-2 text-sm"><div className="font-semibold mb-1">Case {idx + 1} · {r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} {r.hidden ? '(hidden)' : ''}</div><div><strong>Input:</strong> <code className="bg-gray-100 px-1 rounded">{String(r.inputData || t('learning.empty'))}</code></div><div><strong>Expected:</strong> <code className="bg-gray-100 px-1 rounded">{String(r.expectedOutput || t('learning.empty'))}</code></div><div><strong>Actual:</strong> <code className="bg-gray-100 px-1 rounded">{String(r.actualOutput || t('learning.empty'))}</code></div></div>)}</div></div>}<AIHintsPanel code={practiceCode} language={String(practiceSession.language)} description={String(practiceSession.description || '')} testResults={practiceResult} visible={true} /></div></div>}
            </div>}
          </section>
        </div>
      </main>
    </div>
  )
}

export default CourseLearning
