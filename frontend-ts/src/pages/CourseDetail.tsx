import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { resolveToId, setSlugMap, isUuid } from '../utils/slug'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import FeedbackModal from '../components/feedback/FeedbackModal'
import { courseApi, feedbackApi, chapterApi, lessonApi, enrollmentApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const getFeedbackId = (f: AnyObj) => (f?.feedBackId || f?.feedbackId || f?.id || '') as string
const getFeedbackUser = (f: AnyObj) => ((f?.userResponse as AnyObj)?.fullName || (f?.userResponse as AnyObj)?.name || (f?.userResponse as AnyObj)?.username || (f?.userResponse as AnyObj)?.email || 'Learner') as string
const getFeedbackDate = (f: AnyObj) => (f?.createdAt || f?.createdDate || f?.createDate || f?.updatedAt || f?.updateDate || '') as string
const getCourseImage = (c: AnyObj | null) => (c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || c?.courseImage || '') as string
const getImageList = (f: AnyObj | null) => (Array.isArray(f?.imageResponses) ? (f!.imageResponses as AnyObj[]) : []).map((img) => ({ imageUrl: (img?.imageUrl || img?.url || '') as string, imageId: img?.imageId as string })).filter((img) => img.imageUrl)
const formatDate = (v: string, locale = 'vi-VN') => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(locale) }
const toFeedbackList = (p: unknown) => { if (Array.isArray(p)) return p as AnyObj[]; const o = p as AnyObj; for (const k of ['content', 'items', 'results', 'data']) { if (Array.isArray(o?.[k])) return o[k] as AnyObj[] }; return [] }
const guessLevel = (title = '') => { const t = title.toLowerCase(); if (/advanced|nâng cao|chuyên sâu/.test(t)) return 'Advanced'; if (/intermediate|trung bình/.test(t)) return 'Intermediate'; return 'Beginner' }
const extractSkills = (title = '', desc = '') => { const c = `${title} ${desc}`.toLowerCase(); const M: Record<string, string> = { java: 'Java', python: 'Python', javascript: 'JavaScript', react: 'React', 'node.js': 'Node.js', spring: 'Spring Boot', html: 'HTML', css: 'CSS', typescript: 'TypeScript', sql: 'SQL', docker: 'Docker', git: 'Git', oop: 'OOP', api: 'REST API', mongodb: 'MongoDB', aws: 'AWS' }; return Object.entries(M).filter(([k]) => c.includes(k)).map(([, l]) => l).slice(0, 6) }
const isFree = (price: unknown) => price === null || price === undefined || price === '' || Number(price) === 0
const hashText = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const seededShuffle = <T,>(arr: T[], seed: number) => {
  const out = [...arr]
  let x = seed || 123456789
  for (let i = out.length - 1; i > 0; i--) {
    x = (1664525 * x + 1013904223) >>> 0
    const j = x % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
const extractLearningPoints = (courseId = '', title = '', desc = '', t: (k: string) => string) => {
  const source = `${title} ${desc}`.toLowerCase()
  const fromDesc = desc.split(/[.!?\n]/).map((x) => x.trim()).filter((x) => x.length > 12 && x.length < 140)
  const skills = extractSkills(title, desc)
  const skillPoints = skills.map((s) => `Apply ${s} in practical scenarios`)
  const topicPool: string[] = []
  if (source.includes('java')) topicPool.push('Build object-oriented applications with Java', 'Understand Java collections and common patterns')
  if (source.includes('python')) topicPool.push('Write clean Python code for real projects', 'Work with Python data structures and modules')
  if (source.includes('react')) topicPool.push('Create reusable React components', 'Manage state and build modern UI workflows')
  if (source.includes('spring')) topicPool.push('Design backend APIs using Spring Boot', 'Structure layered backend applications')
  if (source.includes('sql') || source.includes('database')) topicPool.push('Model and query data effectively with SQL')
  if (source.includes('api')) topicPool.push('Integrate and test REST APIs in applications')

  const genericPool = [
    t('courseDetail.learnPoint1'),
    t('courseDetail.learnPoint2'),
    t('courseDetail.learnPoint3'),
    t('courseDetail.learnPoint4'),
    'Strengthen problem-solving and debugging mindset',
    'Apply concepts through guided exercises and mini projects',
    'Read and improve existing code confidently',
    'Follow coding best practices for maintainable software',
  ]

  const merged = [...fromDesc, ...skillPoints, ...topicPool, ...genericPool].filter(Boolean)
  const unique = Array.from(new Set(merged))
  const shuffled = seededShuffle(unique, hashText(`${courseId}|${title}|${desc}`))
  return shuffled.slice(0, 8)
}
const estimateLearners = (id: string) => {
  let hash = 0
  for (let i = 0; i < String(id).length; i++) hash = (hash * 31 + String(id).charCodeAt(i)) & 0x7fffffff
  return 300 + (hash % 5000)
}
const buildSidebarHighlights = ({
  courseId,
  title,
  desc,
  chapters,
  lessons,
  level,
  avgRating,
  skills,
  t,
}: {
  courseId: string
  title: string
  desc: string
  chapters: number
  lessons: number
  level: string
  avgRating: number
  skills: string[]
  t: (k: string, p?: Record<string, unknown>) => string
}) => {
  const estHours = Math.max(3, chapters * 4 + Math.round(lessons * 0.6))
  const learners = estimateLearners(courseId || title)
  const pool = [
    `📗 ${t('courseDetail.chapterCount', { count: chapters })}`,
    `📄 ${t('courseDetail.lessonCount', { count: lessons || 0 })}`,
    `🎯 ${level}`,
    `⭐ ${avgRating > 0 ? `${avgRating.toFixed(1)}/5 rating` : 'Hands-on practice'}`,
    `⏱️ ${estHours}+ hours of learning`,
    `👥 ${learners.toLocaleString()} learners`,
    `📜 ${t('courseDetail.certCompletion')}`,
    `♾️ ${t('courseDetail.lifetimeAccess')}`,
    `📱 ${t('courseDetail.learnAnywhere')}`,
    `🧠 Build practical coding confidence`,
    `🛠️ Project-oriented exercises`,
    ...(skills.slice(0, 3).map((s) => `✅ Focus on ${s}`)),
  ]
  const unique = Array.from(new Set(pool.filter(Boolean)))
  const shuffled = seededShuffle(unique, hashText(`${courseId}|${title}|${desc}|sidebar`))
  return shuffled.slice(0, 9)
}

const StarDisplay = ({ rating, size = '1rem' }: { rating: number; size?: string }) => { const r = Math.round(rating * 2) / 2; return <span style={{ fontSize: size, color: '#d97706', letterSpacing: '1px' }}>{[1, 2, 3, 4, 5].map((i) => <span key={i}>{i <= Math.floor(r) ? '★' : i - 0.5 === r ? '★' : '☆'}</span>)}</span> }

const CourseDetail = () => {
  const { courseSlug } = useParams()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [joining, setJoining] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [course, setCourse] = useState<AnyObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedbacks, setFeedbacks] = useState<AnyObj[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState('')
  const [canFeedback, setCanFeedback] = useState(false)
  const [canEditMap, setCanEditMap] = useState<Record<string, boolean>>({})
  const [lightboxImageUrl, setLightboxImageUrl] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<AnyObj | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [chapters, setChapters] = useState<AnyObj[]>([])
  const [lessonsByChapter, setLessonsByChapter] = useState<Record<string, AnyObj[]>>({})
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})
  const [activeSection, setActiveSection] = useState('overview')
  const [isEnrolled, setIsEnrolled] = useState(false)

  const loadCanEdit = async (list: AnyObj[]) => { const m: Record<string, boolean> = {}; await Promise.all(list.map(async (fb) => { const fid = getFeedbackId(fb); if (!fid) return; try { const res = await feedbackApi.canEdit(fid); const d = unwrap(res); m[fid] = d === true || d === 'true' } catch { m[fid] = false } })); setCanEditMap(m) }
  const loadFeedback = async () => { if (!courseId) return; setFeedbackLoading(true); setFeedbackError(''); try { const res = await feedbackApi.getByCourse(courseId, 1, 50); const list = toFeedbackList(unwrap(res)); setFeedbacks(list); await loadCanEdit(list) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || t('courseDetail.loadFeedbackFailed')) } finally { setFeedbackLoading(false) } }
  const loadCanFeedback = async () => { if (!courseId || !isAuthenticated) { setCanFeedback(false); return }; try { const res = await feedbackApi.canFeedback(courseId); const d = unwrap(res); setCanFeedback(d === true || d === 'true') } catch { setCanFeedback(false) } }
  const loadIsEnrolled = async () => { if (!courseId || !isAuthenticated) { setIsEnrolled(false); return }; try { const res = await enrollmentApi.isEnrolled(courseId); const d = unwrap(res); setIsEnrolled(d === true || d === 'true') } catch { setIsEnrolled(false) } }

  useEffect(() => {
    if (!courseSlug) return
    let c = false
    setLoading(true); setError('')
    // Resolve slug to UUID
    const resolvedId = resolveToId(courseSlug)
    setCourseId(resolvedId)
    courseApi.getById(resolvedId).then((res) => {
      if (!c) {
        const data = unwrap(res) as AnyObj
        setCourse(data)
        // Populate slug cache with this course
        const id = (data?.courseId || data?.id || resolvedId) as string
        const title = (data?.title || '') as string
        if (id && title) setSlugMap([{ id, title }])
      }
    }).catch((e: { response?: { status?: number; data?: { message?: string } }; message?: string }) => {
      // If slug resolution failed (not found), try fetching all courses to find the slug
      if (!c && !isUuid(courseSlug)) {
        courseApi.getAll(0, 200).then((allRes) => {
          const list = Array.isArray(unwrap(allRes)) ? unwrap(allRes) as AnyObj[] : ((unwrap(allRes) as AnyObj)?.content as AnyObj[]) || []
          setSlugMap(list.map((x) => ({ id: ((x.courseId || x.id) as string), title: ((x.title || '') as string) })))
          const realId = resolveToId(courseSlug)
          if (realId !== courseSlug) {
            setCourseId(realId)
            return courseApi.getById(realId).then((r2) => { if (!c) setCourse(unwrap(r2) as AnyObj) })
          }
          throw e
        }).catch(() => { if (!c) setError(e.response?.data?.message || e.message || 'Lỗi') })
      } else {
        if (!c) setError(e.response?.data?.message || e.message || 'Lỗi')
      }
    }).finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [courseSlug])
  useEffect(() => { loadFeedback(); loadCanFeedback(); loadIsEnrolled() }, [courseId, isAuthenticated])
  useEffect(() => { if (!courseId) return; chapterApi.getByCourseId(courseId).then((res) => { const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setChapters(arr); if (arr.length > 0) setOpenChapters({ [(arr[0].chapterId || arr[0].id) as string]: true }) }).catch(() => { }) }, [courseId])

  const toggleChapter = (chId: string) => { setOpenChapters((p) => ({ ...p, [chId]: !p[chId] })); if (!lessonsByChapter[chId]) { lessonApi.getByChapterId(chId).then((res) => { const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setLessonsByChapter((p) => ({ ...p, [chId]: arr })) }).catch(() => setLessonsByChapter((p) => ({ ...p, [chId]: [] }))) } }
  useEffect(() => { if (!chapters.length) return; const fid = (chapters[0].chapterId || chapters[0].id) as string; if (fid && !lessonsByChapter[fid]) lessonApi.getByChapterId(fid).then((res) => { const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setLessonsByChapter((p) => ({ ...p, [fid]: arr })) }).catch(() => { }) }, [chapters])

  const ratings = useMemo(() => feedbacks.map((f) => Number(f?.rating) || 0).filter((x) => x > 0), [feedbacks])
  const avgRating = useMemo(() => ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, [ratings])
  const ratingDist = useMemo(() => { const d: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }; ratings.forEach((r) => { const k = Math.round(r); if (d[k] !== undefined) d[k]++ }); return d }, [ratings])
  const skills = useMemo(() => extractSkills((course?.title || '') as string, (course?.description || '') as string), [course])
  const learningPoints = useMemo(() => extractLearningPoints(courseId, (course?.title || '') as string, (course?.description || '') as string, t), [course, t, courseId])
  const level = useMemo(() => guessLevel((course?.title || '') as string), [course])
  const totalLessons = useMemo(() => Object.values(lessonsByChapter).reduce((s, l) => s + l.length, 0), [lessonsByChapter])
  const sidebarHighlights = useMemo(() => buildSidebarHighlights({
    courseId,
    title: (course?.title || '') as string,
    desc: (course?.description || '') as string,
    chapters: chapters.length,
    lessons: totalLessons || 0,
    level,
    avgRating,
    skills,
    t: (k, p) => t(k, p),
  }), [courseId, course, chapters.length, totalLessons, level, avgRating, skills, t])

  const handleCreateFeedback = async ({ comment, rating, fileList }: { comment: string; rating: number; fileList?: File[] }) => { setSubmitting(true); try { await feedbackApi.create(courseId!, { comment, rating }, fileList); setCreateModalOpen(false); await Promise.all([loadFeedback(), loadCanFeedback()]) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || t('courseDetail.createFeedbackFailed')) } finally { setSubmitting(false) } }
  const handleUpdateFeedback = async ({ comment, rating, imageRemoveId, fileList }: { comment: string; rating: number; imageRemoveId?: string[]; fileList?: File[] }) => { if (!editingFeedback) return; setSubmitting(true); try { const up = { comment, rating, ...(Array.isArray(imageRemoveId) && imageRemoveId.length > 0 ? { imageRemoveId } : {}) }; await feedbackApi.update(getFeedbackId(editingFeedback), up, fileList); setEditingFeedback(null); await loadFeedback() } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || t('courseDetail.updateFeedbackFailed')) } finally { setSubmitting(false) } }
  const handleJoinFree = async () => { if (!courseId || joining) return; setJoining(true); try { await enrollmentApi.join(courseId); navigate(`/learning/${courseSlug}`) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; alert(err.response?.data?.message || err.message || t('courseDetail.joinFailed')) } finally { setJoining(false) } }
  const handleDeleteFeedback = async (fid: string) => { if (!fid || !window.confirm(t('courseDetail.deleteFeedbackConfirm'))) return; try { await feedbackApi.delete(fid); await Promise.all([loadFeedback(), loadCanFeedback()]) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || t('courseDetail.deleteFeedbackFailed')) } }
  const scrollToSection = (id: string) => { setActiveSection(id); document.getElementById(`cd-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  if (loading) return <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8"><div className="h-[220px] rounded-[20px] bg-gray-100 animate-pulse" /><div className="h-[300px] rounded-[20px] bg-gray-100 animate-pulse mt-6" /></main></div>
  if (error) return <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8"><div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600">⚠️ {error}</div></main></div>

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#1e1b4b_0%,#312e81_40%,#4338ca_100%)] px-6 py-10 text-white">
        <div className="w-full mx-auto">
          <div className="flex items-center gap-1.5 text-[0.82rem] mb-4 text-white/60"><Link to="/" className="text-white/75 no-underline hover:underline">Home</Link><span>›</span><Link to="/courses" className="text-white/75 no-underline hover:underline">Courses</Link><span>›</span><span className="text-white/90">{(course?.title as string) || 'Course'}</span></div>
          <h1 className="m-0 max-w-[800px] text-[2rem] font-extrabold leading-tight">{(course?.title as string) || t('courseDetail.untitled')}</h1>
          <p className="mt-3 mb-0 text-white/75 leading-relaxed max-w-[700px] text-base line-clamp-3">{(course?.description as string) || t('courseDetail.noDescription')}</p>
          <div className="flex items-center gap-4 flex-wrap mt-4">
            {avgRating > 0 && <span className="flex items-center gap-1.5"><StarDisplay rating={avgRating} size="1rem" /><strong>{avgRating.toFixed(1)}</strong><span className="text-white/60 text-[0.85rem]">({t('courseDetail.ratingCount', { count: ratings.length })})</span></span>}
            <span className="px-3 py-1 rounded-md bg-white/15 text-[0.82rem] font-semibold">{level}</span>
            {chapters.length > 0 && <span className="text-white/70 text-[0.85rem]">📗 {t('courseDetail.chapterCount', { count: chapters.length })}</span>}
            {totalLessons > 0 && <span className="text-white/70 text-[0.85rem]">📄 {t('courseDetail.lessonCount', { count: totalLessons })}</span>}
          </div>
          <div className="flex items-center gap-2 mt-4 text-white/60 text-[0.85rem]"><span className="font-bold text-white/80 bg-white/10 rounded px-1.5 py-px">&lt;/&gt;</span><span>Offered by <strong className="text-white/90">UniCode</strong></span></div>
        </div>
      </div>

      {/* Sticky nav */}
      {/* Sticky nav */}
      <nav className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-border-subtle shadow-[0_1px_4px_rgba(0,0,0,0.04)]"><div className="w-full mx-auto px-6 flex justify-center gap-6">{['overview', 'syllabus', 'reviews'].map((s) => <button key={s} type="button" className={`px-6 py-4 text-[0.95rem] font-semibold border-none bg-transparent cursor-pointer transition-all border-b-2 -mb-px ${activeSection === s ? 'text-primary-500 border-primary-500' : 'text-text-muted border-transparent hover:text-text-main hover:border-border-medium'}`} onClick={() => scrollToSection(s)}>{s === 'overview' ? 'Overview' : s === 'syllabus' ? 'Syllabus' : 'Reviews'}</button>)}</div></nav>

      <main className="w-full mx-auto px-6 py-8 pb-16">
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-8 items-start max-[900px]:grid-cols-1">
          <div className="flex flex-col gap-6">
            {/* What you'll learn */}
            <section id="cd-section-overview" className="bg-white border border-border-medium rounded-[18px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h2 className="m-0 mb-4 text-lg font-extrabold">What you&apos;ll learn</h2>
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">{learningPoints.map((pt, i) => <div key={i} className="flex items-start gap-2 text-sm leading-relaxed"><span className="text-green-600 font-bold shrink-0 mt-0.5">✓</span><span className="text-text-secondary">{pt}</span></div>)}</div>
            </section>

            {/* Skills */}
            {skills.length > 0 && <section className="bg-white border border-border-medium rounded-[18px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"><h2 className="m-0 mb-4 text-lg font-extrabold">Skills you&apos;ll gain</h2><div className="flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="px-3 py-1 rounded-full bg-primary-500/8 text-primary-500 text-[0.82rem] font-semibold">{s}</span>)}</div></section>}

            {/* Syllabus */}
            <section id="cd-section-syllabus" className="bg-white border border-border-medium rounded-[18px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
                <h2 className="m-0 text-lg font-extrabold">{t('courseDetail.syllabus')}</h2>
                <span className="text-[0.82rem] font-semibold text-primary-500">{t('courseDetail.chapterCount', { count: chapters.length })}</span>
              </div>
              {chapters.length === 0 && <p className="text-text-muted text-sm m-0">{t('courseDetail.noSyllabus')}</p>}
              <div className="flex flex-col gap-2.5">
                {chapters.map((ch, ci) => {
                  const chId = (ch.chapterId || ch.id) as string
                  const isOpen = openChapters[chId]
                  const lessons = lessonsByChapter[chId] || []
                  return (
                    <div key={chId} className={`border rounded-xl overflow-hidden transition-all ${isOpen ? 'border-primary-500/35 shadow-[0_4px_18px_rgba(0,86,210,0.08)]' : 'border-border-subtle'}`}>
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between px-4 py-3 border-none cursor-pointer transition-colors text-left ${isOpen ? 'bg-primary-500/[0.06]' : 'bg-bg-deep hover:bg-gray-100'}`}
                        onClick={() => toggleChapter(chId)}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-white border border-border-medium text-[0.72rem] font-bold text-primary-500 inline-flex items-center justify-center">{ci + 1}</span>
                          <div className="min-w-0">
                            <span className="text-[0.7rem] text-text-muted uppercase tracking-wider">{t('courseDetail.chapterLabel', { n: ci + 1 })}</span>
                            <div className="font-semibold text-sm text-text-main truncate">{(ch.title || ch.chapterTitle || t('courseDetail.chapterLabel', { n: ci + 1 })) as string}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[0.74rem] font-semibold text-text-muted px-2 py-0.5 rounded-full border border-border-subtle bg-white">{t('courseDetail.lessonCount', { count: lessons.length })}</span>
                          <span className={`text-[0.9rem] text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 py-3 border-t border-border-subtle bg-white">
                          {lessons.length === 0 && <p className="text-text-muted text-sm m-0 py-1">{t('courseDetail.loadingLessons')}</p>}
                          {lessons.map((l, li) => (
                            <div key={(l.lessonId || l.id) as string} className="flex items-center gap-2.5 py-2 text-sm text-text-secondary border-b border-border-subtle/70 last:border-none">
                              <span className="text-[0.72rem] text-primary-500 font-semibold shrink-0">{String(li + 1).padStart(2, '0')}.</span>
                              <span className="truncate">{(l.title || l.lessonTitle || t('courseDetail.lesson')) as string}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Reviews */}
            <section id="cd-section-reviews" className="bg-white border border-border-medium rounded-[18px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h2 className="m-0 mb-4 text-lg font-extrabold flex items-center justify-between">{t('courseDetail.reviews')}{canFeedback && <button type="button" className="text-sm font-semibold text-primary-500 bg-primary-500/8 px-3 py-1.5 rounded-lg border-none cursor-pointer hover:bg-primary-500/15" onClick={() => setCreateModalOpen(true)}>✏️ {t('courseDetail.writeReview')}</button>}</h2>
              {ratings.length > 0 && <div className="flex items-center gap-8 mb-5 p-4 bg-bg-deep rounded-xl flex-wrap"><div className="flex flex-col items-center gap-0.5"><span className="text-[2.5rem] font-extrabold">{avgRating.toFixed(1)}</span><StarDisplay rating={avgRating} size="1.1rem" /><span className="text-[0.78rem] text-text-muted">{t('courseDetail.ratingCount', { count: ratings.length })}</span></div><div className="flex-1 flex flex-col gap-1 min-w-[200px]">{[5, 4, 3, 2, 1].map((star) => <div key={star} className="flex items-center gap-2 text-[0.82rem]"><span className="w-8 text-right text-text-muted">{star}★</span><div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${ratings.length > 0 ? (ratingDist[star] / ratings.length) * 100 : 0}%` }} /></div><span className="w-6 text-right text-text-muted">{ratingDist[star]}</span></div>)}</div></div>}
              {feedbackLoading && <p className="text-text-muted text-sm">{t('courseDetail.loadingReviews')}</p>}
              {!feedbackLoading && feedbackError && <p className="text-red-600 text-sm">{feedbackError}</p>}
              {!feedbackLoading && !feedbackError && feedbacks.length === 0 && <p className="text-text-muted text-sm">{t('courseDetail.noReviews')}</p>}
              <div className="flex flex-col gap-4 mt-2">{feedbacks.map((fb) => {
                const fid = getFeedbackId(fb); const imgs = getImageList(fb); const canEdit = canEditMap[fid]; return (
                  <article key={fid || `${fb.comment}-${getFeedbackDate(fb)}`} className="border border-border-subtle rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm">{getFeedbackUser(fb).charAt(0).toUpperCase()}</div><div className="flex-1"><strong className="text-sm">{getFeedbackUser(fb)}</strong><span className="text-[0.78rem] text-text-muted ml-2">{formatDate(getFeedbackDate(fb))}</span></div><StarDisplay rating={Number(fb?.rating || 0)} size="0.85rem" /></div>
                    <p className="m-0 text-sm text-text-secondary leading-relaxed">{(fb?.comment || '') as string}</p>
                    {imgs.length > 0 && <div className="flex gap-2 flex-wrap mt-2">{imgs.map((img) => <img key={img.imageId || img.imageUrl} src={img.imageUrl} alt="feedback" loading="lazy" className="h-16 rounded-lg cursor-pointer object-cover hover:opacity-80" onClick={() => setLightboxImageUrl(img.imageUrl)} />)}</div>}
                    {canEdit && <div className="flex gap-2 mt-2"><button type="button" className="text-[0.82rem] text-primary-500 bg-primary-500/8 px-2.5 py-1 rounded-lg border-none cursor-pointer hover:bg-primary-500/15" onClick={() => setEditingFeedback(fb)}>{t('common.edit')}</button><button type="button" className="text-[0.82rem] text-red-600 bg-red-500/8 px-2.5 py-1 rounded-lg border-none cursor-pointer hover:bg-red-500/15" onClick={() => handleDeleteFeedback(fid)}>{t('common.delete')}</button></div>}
                  </article>
                )
              })}</div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="sticky top-36">
            <div className="bg-white border border-border-medium rounded-[18px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              {getCourseImage(course) && <img src={getCourseImage(course)} alt="" className="w-full h-[170px] object-cover" />}
              <div className="p-5">
                <div className="text-2xl font-extrabold mb-3">{isFree(course?.price) ? <span className="text-green-600">{t('common.free')}</span> : <span className="text-primary-500">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(course?.price))}</span>}</div>
                {!isAuthenticated ? (
                  <Link to="/login" className="block w-full text-center py-3 rounded-xl bg-primary-500 text-white font-bold text-sm no-underline transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)]">{t('courseDetail.loginToLearn')}</Link>
                ) : isEnrolled ? (
                  <Link to={`/learning/${courseSlug}`} className="block w-full text-center py-3 rounded-xl bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white font-bold text-sm no-underline transition-all hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,86,210,0.25)]">📚 {t('courseDetail.goToLearning', 'Vào My Learning')}</Link>
                ) : isFree(course?.price) ? (
                  <button type="button" className="block w-full text-center py-3 rounded-xl bg-green-600 text-white font-bold text-sm border-none cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(34,197,94,0.25)] hover:bg-green-700 disabled:opacity-60" onClick={handleJoinFree} disabled={joining}>{joining ? t('courseDetail.joining') : t('courseDetail.joinFree')}</button>
                ) : (
                  <Link to={`/payment?courseId=${courseId}`} state={{ course }} className="block w-full text-center py-3 rounded-xl bg-primary-500 text-white font-bold text-sm no-underline transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)]">{t('courseDetail.enrollNow')}</Link>
                )}
                <ul className="list-none p-0 mt-4 flex flex-col gap-2 text-sm text-text-secondary">{sidebarHighlights.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {lightboxImageUrl && <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center cursor-pointer" onClick={() => setLightboxImageUrl('')}><img src={lightboxImageUrl} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded-xl" /></div>}
      <FeedbackModal open={createModalOpen} title={t('courseDetail.writeReview')} submitText={t('courseDetail.submitReview')} submitting={submitting} onClose={() => setCreateModalOpen(false)} onSubmit={handleCreateFeedback} />
      <FeedbackModal open={Boolean(editingFeedback)} title={t('courseDetail.editReview')} submitText={t('courseDetail.saveChanges')} submitting={submitting} initialValues={{ comment: (editingFeedback?.comment || '') as string, rating: Number(editingFeedback?.rating) || 5 }} existingImages={getImageList(editingFeedback)} onClose={() => setEditingFeedback(null)} onSubmit={handleUpdateFeedback} />
      <Footer />
    </div>
  )
}

export default CourseDetail
