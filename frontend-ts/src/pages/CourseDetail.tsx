import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { resolveToId, setSlugMap, toSlug, isUuid } from '../utils/slug'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import FeedbackModal from '../components/feedback/FeedbackModal'
import { courseApi, feedbackApi, chapterApi, lessonApi } from '../api'
import { useAuth } from '../contexts/useAuth'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const getFeedbackId = (f: AnyObj) => (f?.feedBackId || f?.feedbackId || f?.id || '') as string
const getFeedbackUser = (f: AnyObj) => ((f?.userResponse as AnyObj)?.fullName || (f?.userResponse as AnyObj)?.name || (f?.userResponse as AnyObj)?.username || (f?.userResponse as AnyObj)?.email || 'Học viên') as string
const getFeedbackDate = (f: AnyObj) => (f?.createdAt || f?.createdDate || f?.createDate || f?.updatedAt || f?.updateDate || '') as string
const getCourseImage = (c: AnyObj | null) => (c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || c?.courseImage || '') as string
const getImageList = (f: AnyObj | null) => (Array.isArray(f?.imageResponses) ? (f!.imageResponses as AnyObj[]) : []).map((img) => ({ imageUrl: (img?.imageUrl || img?.url || '') as string, imageId: img?.imageId as string })).filter((img) => img.imageUrl)
const formatDate = (v: string) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN') }
const toFeedbackList = (p: unknown) => { if (Array.isArray(p)) return p as AnyObj[]; const o = p as AnyObj; for (const k of ['content', 'items', 'results', 'data']) { if (Array.isArray(o?.[k])) return o[k] as AnyObj[] }; return [] }
const guessLevel = (title = '') => { const t = title.toLowerCase(); if (/advanced|nâng cao|chuyên sâu/.test(t)) return 'Advanced'; if (/intermediate|trung bình/.test(t)) return 'Intermediate'; return 'Beginner' }
const extractSkills = (title = '', desc = '') => { const c = `${title} ${desc}`.toLowerCase(); const M: Record<string, string> = { java: 'Java', python: 'Python', javascript: 'JavaScript', react: 'React', 'node.js': 'Node.js', spring: 'Spring Boot', html: 'HTML', css: 'CSS', typescript: 'TypeScript', sql: 'SQL', docker: 'Docker', git: 'Git', oop: 'OOP', api: 'REST API', mongodb: 'MongoDB', aws: 'AWS' }; return Object.entries(M).filter(([k]) => c.includes(k)).map(([, l]) => l).slice(0, 6) }
const extractLearningPoints = (desc = '') => { const s = desc.split(/[.!?\n]/).map((x) => x.trim()).filter((x) => x.length > 10 && x.length < 120); if (s.length >= 4) return s.slice(0, 6); return [...s, 'Hiểu các khái niệm cơ bản và nâng cao', 'Áp dụng kiến thức vào dự án thực tế', 'Phát triển kỹ năng tư duy lập trình', 'Sẵn sàng cho các cơ hội nghề nghiệp'].slice(0, 6) }

const StarDisplay = ({ rating, size = '1rem' }: { rating: number; size?: string }) => { const r = Math.round(rating * 2) / 2; return <span style={{ fontSize: size, color: '#d97706', letterSpacing: '1px' }}>{[1, 2, 3, 4, 5].map((i) => <span key={i}>{i <= Math.floor(r) ? '★' : i - 0.5 === r ? '★' : '☆'}</span>)}</span> }

const CourseDetail = () => {
  const { courseSlug } = useParams()
  const { isAuthenticated } = useAuth()
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

  const loadCanEdit = async (list: AnyObj[]) => { const m: Record<string, boolean> = {}; await Promise.all(list.map(async (fb) => { const fid = getFeedbackId(fb); if (!fid) return; try { const res = await feedbackApi.canEdit(fid); const d = unwrap(res); m[fid] = d === true || d === 'true' } catch { m[fid] = false } })); setCanEditMap(m) }
  const loadFeedback = async () => { if (!courseId) return; setFeedbackLoading(true); setFeedbackError(''); try { const res = await feedbackApi.getByCourse(courseId, 1, 50); const list = toFeedbackList(unwrap(res)); setFeedbacks(list); await loadCanEdit(list) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || 'Không tải được bình luận.') } finally { setFeedbackLoading(false) } }
  const loadCanFeedback = async () => { if (!courseId || !isAuthenticated) { setCanFeedback(false); return }; try { const res = await feedbackApi.canFeedback(courseId); const d = unwrap(res); setCanFeedback(d === true || d === 'true') } catch { setCanFeedback(false) } }

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
  useEffect(() => { loadFeedback(); loadCanFeedback() }, [courseId, isAuthenticated])
  useEffect(() => { if (!courseId) return; chapterApi.getByCourseId(courseId).then((res) => { const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setChapters(arr); if (arr.length > 0) setOpenChapters({ [(arr[0].chapterId || arr[0].id) as string]: true }) }).catch(() => {}) }, [courseId])

  const toggleChapter = (chId: string) => { setOpenChapters((p) => ({ ...p, [chId]: !p[chId] })); if (!lessonsByChapter[chId]) { lessonApi.getByChapterId(chId).then((res) => { const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setLessonsByChapter((p) => ({ ...p, [chId]: arr })) }).catch(() => setLessonsByChapter((p) => ({ ...p, [chId]: [] }))) } }
  useEffect(() => { if (!chapters.length) return; const fid = (chapters[0].chapterId || chapters[0].id) as string; if (fid && !lessonsByChapter[fid]) lessonApi.getByChapterId(fid).then((res) => { const arr = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : []; setLessonsByChapter((p) => ({ ...p, [fid]: arr })) }).catch(() => {}) }, [chapters])

  const ratings = useMemo(() => feedbacks.map((f) => Number(f?.rating) || 0).filter((x) => x > 0), [feedbacks])
  const avgRating = useMemo(() => ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, [ratings])
  const ratingDist = useMemo(() => { const d: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }; ratings.forEach((r) => { const k = Math.round(r); if (d[k] !== undefined) d[k]++ }); return d }, [ratings])
  const skills = useMemo(() => extractSkills((course?.title || '') as string, (course?.description || '') as string), [course])
  const learningPoints = useMemo(() => extractLearningPoints((course?.description || '') as string), [course])
  const level = useMemo(() => guessLevel((course?.title || '') as string), [course])
  const totalLessons = useMemo(() => Object.values(lessonsByChapter).reduce((s, l) => s + l.length, 0), [lessonsByChapter])

  const handleCreateFeedback = async ({ comment, rating, fileList }: { comment: string; rating: number; fileList?: File[] }) => { setSubmitting(true); try { await feedbackApi.create(courseId!, { comment, rating }, fileList); setCreateModalOpen(false); await Promise.all([loadFeedback(), loadCanFeedback()]) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || 'Tạo bình luận thất bại.') } finally { setSubmitting(false) } }
  const handleUpdateFeedback = async ({ comment, rating, imageRemoveId, fileList }: { comment: string; rating: number; imageRemoveId?: string[]; fileList?: File[] }) => { if (!editingFeedback) return; setSubmitting(true); try { const up = { comment, rating, ...(Array.isArray(imageRemoveId) && imageRemoveId.length > 0 ? { imageRemoveId } : {}) }; await feedbackApi.update(getFeedbackId(editingFeedback), up, fileList); setEditingFeedback(null); await loadFeedback() } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || 'Cập nhật thất bại.') } finally { setSubmitting(false) } }
  const handleDeleteFeedback = async (fid: string) => { if (!fid || !window.confirm('Xóa bình luận này?')) return; try { await feedbackApi.delete(fid); await Promise.all([loadFeedback(), loadCanFeedback()]) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackError(err.response?.data?.message || err.message || 'Xóa thất bại.') } }
  const scrollToSection = (id: string) => { setActiveSection(id); document.getElementById(`cd-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  if (loading) return <div className="min-h-screen bg-bg-page text-text-main"><Header /><main className="max-w-[1200px] mx-auto px-6 py-8"><div className="h-[220px] rounded-[20px] bg-gray-100 animate-pulse" /><div className="h-[300px] rounded-[20px] bg-gray-100 animate-pulse mt-6" /></main></div>
  if (error) return <div className="min-h-screen bg-bg-page text-text-main"><Header /><main className="max-w-[1200px] mx-auto px-6 py-8"><div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600">⚠️ {error}</div></main></div>

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#1e1b4b_0%,#312e81_40%,#4338ca_100%)] px-6 py-8 text-white">
        <div className="max-w-[1200px] mx-auto flex items-start gap-8 max-[768px]:flex-col">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[0.82rem] mb-3 text-white/60"><Link to="/" className="text-white/75 no-underline hover:underline">Home</Link><span>›</span><Link to="/courses" className="text-white/75 no-underline hover:underline">Courses</Link><span>›</span><span className="text-white/90">{(course?.title as string) || 'Course'}</span></div>
            <h1 className="m-0 text-[1.75rem] font-extrabold leading-tight">{(course?.title as string) || 'Khóa học'}</h1>
            <p className="mt-2 mb-0 text-white/75 leading-relaxed max-w-[620px] text-sm line-clamp-3">{(course?.description as string) || 'Khóa học chưa có mô tả.'}</p>
            <div className="flex items-center gap-3 flex-wrap mt-3">
              {avgRating > 0 && <span className="flex items-center gap-1.5"><StarDisplay rating={avgRating} size="0.95rem" /><strong>{avgRating.toFixed(1)}</strong><span className="text-white/60 text-[0.82rem]">({ratings.length} đánh giá)</span></span>}
              <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-[0.78rem] font-semibold">{level}</span>
              {chapters.length > 0 && <span className="text-white/70 text-[0.82rem]">📗 {chapters.length} chương</span>}
              {totalLessons > 0 && <span className="text-white/70 text-[0.82rem]">📄 {totalLessons} bài giảng</span>}
            </div>
            <div className="flex items-center gap-2 mt-3 text-white/60 text-[0.82rem]"><span className="font-bold text-white/80 bg-white/10 rounded px-1.5 py-px">&lt;/&gt;</span><span>Offered by <strong className="text-white/90">UniCode</strong></span></div>
          </div>
          {getCourseImage(course) && <div className="shrink-0 w-[300px] h-[180px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-[768px]:w-full max-[768px]:h-[200px]"><img src={getCourseImage(course)} alt="" className="w-full h-full object-cover" /></div>}
        </div>
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-border-subtle shadow-[0_1px_4px_rgba(0,0,0,0.04)]"><div className="max-w-[1200px] mx-auto px-6 flex gap-1">{['overview', 'syllabus', 'reviews'].map((s) => <button key={s} type="button" className={`px-5 py-3 text-sm font-semibold border-none bg-transparent cursor-pointer transition-all ${activeSection === s ? 'text-primary-500 border-b-2 border-primary-500' : 'text-text-muted hover:text-text-main'}`} onClick={() => scrollToSection(s)}>{s === 'overview' ? 'Overview' : s === 'syllabus' ? 'Syllabus' : 'Reviews'}</button>)}</div></nav>

      <main className="max-w-[1200px] mx-auto px-6 py-8 pb-16">
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
              <h2 className="m-0 mb-4 text-lg font-extrabold">Syllabus — {chapters.length} chương</h2>
              {chapters.length === 0 && <p className="text-text-muted text-sm m-0">Chưa có nội dung syllabus.</p>}
              <div className="flex flex-col gap-1">{chapters.map((ch, ci) => { const chId = (ch.chapterId || ch.id) as string; const isOpen = openChapters[chId]; const lessons = lessonsByChapter[chId] || []; return (
                <div key={chId} className="border border-border-subtle rounded-xl overflow-hidden">
                  <button type="button" className="w-full flex items-center justify-between px-4 py-3 border-none bg-bg-deep cursor-pointer transition-colors hover:bg-gray-100 text-left" onClick={() => toggleChapter(chId)}>
                    <div className="flex items-center gap-2"><span className="text-text-muted text-sm">{isOpen ? '▾' : '▸'}</span><div><span className="text-[0.72rem] text-text-muted uppercase tracking-wider">Chương {ci + 1}</span><div className="font-semibold text-sm text-text-main">{(ch.title || ch.chapterTitle || `Chương ${ci + 1}`) as string}</div></div></div>
                    {lessons.length > 0 && <span className="text-[0.78rem] text-text-muted shrink-0">{lessons.length} bài</span>}
                  </button>
                  {isOpen && <div className="px-4 py-2 border-t border-border-subtle">{lessons.length === 0 && <p className="text-text-muted text-sm m-0 py-2">Đang tải...</p>}{lessons.map((l) => <div key={(l.lessonId || l.id) as string} className="flex items-center gap-2 py-1.5 text-sm text-text-secondary"><span className="text-[0.75rem]">📄</span><span>{(l.title || l.lessonTitle || 'Bài giảng') as string}</span></div>)}</div>}
                </div>
              ) })}</div>
            </section>

            {/* Reviews */}
            <section id="cd-section-reviews" className="bg-white border border-border-medium rounded-[18px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h2 className="m-0 mb-4 text-lg font-extrabold flex items-center justify-between">Reviews{canFeedback && <button type="button" className="text-sm font-semibold text-primary-500 bg-primary-500/8 px-3 py-1.5 rounded-lg border-none cursor-pointer hover:bg-primary-500/15" onClick={() => setCreateModalOpen(true)}>✏️ Viết đánh giá</button>}</h2>
              {ratings.length > 0 && <div className="flex items-center gap-8 mb-5 p-4 bg-bg-deep rounded-xl flex-wrap"><div className="flex flex-col items-center gap-0.5"><span className="text-[2.5rem] font-extrabold">{avgRating.toFixed(1)}</span><StarDisplay rating={avgRating} size="1.1rem" /><span className="text-[0.78rem] text-text-muted">{ratings.length} đánh giá</span></div><div className="flex-1 flex flex-col gap-1 min-w-[200px]">{[5, 4, 3, 2, 1].map((star) => <div key={star} className="flex items-center gap-2 text-[0.82rem]"><span className="w-8 text-right text-text-muted">{star}★</span><div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${ratings.length > 0 ? (ratingDist[star] / ratings.length) * 100 : 0}%` }} /></div><span className="w-6 text-right text-text-muted">{ratingDist[star]}</span></div>)}</div></div>}
              {feedbackLoading && <p className="text-text-muted text-sm">Đang tải đánh giá...</p>}
              {!feedbackLoading && feedbackError && <p className="text-red-600 text-sm">{feedbackError}</p>}
              {!feedbackLoading && !feedbackError && feedbacks.length === 0 && <p className="text-text-muted text-sm">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>}
              <div className="flex flex-col gap-4 mt-2">{feedbacks.map((fb) => { const fid = getFeedbackId(fb); const imgs = getImageList(fb); const canEdit = canEditMap[fid]; return (
                <article key={fid || `${fb.comment}-${getFeedbackDate(fb)}`} className="border border-border-subtle rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm">{getFeedbackUser(fb).charAt(0).toUpperCase()}</div><div className="flex-1"><strong className="text-sm">{getFeedbackUser(fb)}</strong><span className="text-[0.78rem] text-text-muted ml-2">{formatDate(getFeedbackDate(fb))}</span></div><StarDisplay rating={Number(fb?.rating || 0)} size="0.85rem" /></div>
                  <p className="m-0 text-sm text-text-secondary leading-relaxed">{(fb?.comment || '') as string}</p>
                  {imgs.length > 0 && <div className="flex gap-2 flex-wrap mt-2">{imgs.map((img) => <img key={img.imageId || img.imageUrl} src={img.imageUrl} alt="feedback" loading="lazy" className="h-16 rounded-lg cursor-pointer object-cover hover:opacity-80" onClick={() => setLightboxImageUrl(img.imageUrl)} />)}</div>}
                  {canEdit && <div className="flex gap-2 mt-2"><button type="button" className="text-[0.82rem] text-primary-500 bg-primary-500/8 px-2.5 py-1 rounded-lg border-none cursor-pointer hover:bg-primary-500/15" onClick={() => setEditingFeedback(fb)}>Sửa</button><button type="button" className="text-[0.82rem] text-red-600 bg-red-500/8 px-2.5 py-1 rounded-lg border-none cursor-pointer hover:bg-red-500/15" onClick={() => handleDeleteFeedback(fid)}>Xóa</button></div>}
                </article>
              ) })}</div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="sticky top-36">
            <div className="bg-white border border-border-medium rounded-[18px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              {getCourseImage(course) && <img src={getCourseImage(course)} alt="" className="w-full h-[170px] object-cover" />}
              <div className="p-5">
                <div className="text-2xl font-extrabold mb-3">{Number(course?.price) > 0 ? <span className="text-primary-500">{Number(course!.price).toLocaleString('vi-VN')}đ</span> : <span className="text-green-600">Miễn phí</span>}</div>
                <Link to={isAuthenticated ? `/learning/${courseSlug}` : '/login'} className="block w-full text-center py-3 rounded-xl bg-primary-500 text-white font-bold text-sm no-underline transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)]">{isAuthenticated ? 'Bắt đầu học' : 'Đăng nhập để học'}</Link>
                <ul className="list-none p-0 mt-4 flex flex-col gap-2 text-sm text-text-secondary">{['📗 ' + chapters.length + ' chương học', '📄 ' + (totalLessons || '—') + ' bài giảng', '🎯 ' + level, '📜 Chứng chỉ hoàn thành', '♾️ Truy cập trọn đời', '📱 Học mọi lúc mọi nơi'].map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {lightboxImageUrl && <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center cursor-pointer" onClick={() => setLightboxImageUrl('')}><img src={lightboxImageUrl} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded-xl" /></div>}
      <FeedbackModal open={createModalOpen} title="Viết đánh giá" submitText="Gửi đánh giá" submitting={submitting} onClose={() => setCreateModalOpen(false)} onSubmit={handleCreateFeedback} />
      <FeedbackModal open={Boolean(editingFeedback)} title="Sửa đánh giá" submitText="Lưu thay đổi" submitting={submitting} initialValues={{ comment: (editingFeedback?.comment || '') as string, rating: Number(editingFeedback?.rating) || 5 }} existingImages={getImageList(editingFeedback)} onClose={() => setEditingFeedback(null)} onSubmit={handleUpdateFeedback} />
      <Footer />
    </div>
  )
}

export default CourseDetail
