import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { courseApi, enrollmentApi, feedbackApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { toSlug, setSlugMap, courseSlugOrId } from '../utils/slug'
import StarRating from '../components/StarRating'

/* ── helpers ── */
const extractList = (p: unknown): unknown[] => {
  if (Array.isArray(p)) return p
  const obj = p as Record<string, unknown>
  for (const k of ['content', 'items', 'results', 'data']) if (Array.isArray(obj?.[k])) return obj[k] as unknown[]
  return []
}
type AnyObj = Record<string, unknown>
const getCourseKey = (c: AnyObj) => (c?.courseId || c?.id || c?._id || c?.courseCode || c?.slug || c?.title) as string
const getCourseTitle = (c: AnyObj) => (c?.title || c?.name || c?.courseName || 'Untitled course') as string
const getCourseDesc = (c: AnyObj) => (c?.description || c?.summary || '') as string
const getFeedbackId = (f: AnyObj) => (f?.feedBackId || f?.feedbackId || f?.id || '') as string
const unwrap = (res: unknown) => {
  const r = res as { data?: { data?: unknown } }
  return r?.data?.data ?? r?.data ?? r
}
const getCourseImage = (c: AnyObj) => {
  const image = c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || c?.courseImage
  return typeof image === 'string' ? image.trim() : ''
}
const clampRating = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : Math.max(0, Math.min(5, n)) }
const buildRatingSummary = (feedbacks: AnyObj[] = []) => {
  const ratings = feedbacks.map((f) => clampRating(f?.rating)).filter((x) => x > 0)
  if (ratings.length === 0) return { count: 0, avg: 0 }
  return { count: ratings.length, avg: ratings.reduce((a, b) => a + b, 0) / ratings.length }
}
const formatPrice = (price: unknown) => {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price); if (Number.isNaN(num)) return String(price)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}
const guessLevel = (c: AnyObj) => {
  const t = (getCourseTitle(c) + ' ' + getCourseDesc(c)).toLowerCase()
  if (t.includes('advanced') || t.includes('nâng cao') || t.includes('master') || t.includes('chuyên')) return 'Advanced'
  if (t.includes('intermediate') || t.includes('trung cấp')) return 'Intermediate'
  if (t.includes('beginner') || t.includes('cơ bản') || t.includes('nhập môn')) return 'Beginner'
  return 'All Levels'
}
const extractSkills = (c: AnyObj) => {
  const keywords = ['Java', 'Python', 'React', 'Spring', 'Node.js', 'JavaScript', 'TypeScript', 'OOP', 'SQL', 'MongoDB', 'Docker', 'AWS', 'REST API', 'HTML', 'CSS', 'Git', 'Machine Learning', 'Data Science', 'Frontend', 'Backend', 'DevOps']
  const title = getCourseTitle(c).toLowerCase()
  const found = keywords.filter((k) => title.includes(k.toLowerCase()))
  if (found.length === 0) return keywords.filter((k) => getCourseDesc(c).toLowerCase().includes(k.toLowerCase())).slice(0, 3)
  return found.slice(0, 3)
}
const estimateDuration = (c: AnyObj) => { const ch = Number(c?.chapterCount) || 0; return ch <= 0 ? null : `${Math.max(2, ch * 4)} hours` }
const estimateLearners = (id: string) => { let hash = 0; for (let i = 0; i < String(id).length; i++) hash = (hash * 31 + String(id).charCodeAt(i)) & 0x7fffffff; return 200 + (hash % 3000) }

const FILTER_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Free']
type Draft = { comment: string; rating: number }
type EditState = { feedbackId: string; comment: string; rating: number } | null

const SkeletonCard = () => (
  <article className="bg-white border border-border-medium rounded-2xl overflow-hidden pointer-events-none">
    <div className="aspect-video"><div className="w-full h-40 bg-[linear-gradient(90deg,#F5F7F8_25%,#E5E7EB_50%,#F5F7F8_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl" /></div>
    <div className="p-4 flex flex-col gap-2">
      <div className="w-3/4 h-[18px] bg-[linear-gradient(90deg,#F5F7F8_25%,#E5E7EB_50%,#F5F7F8_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-lg" />
      <div className="w-1/2 h-[14px] bg-[linear-gradient(90deg,#F5F7F8_25%,#E5E7EB_50%,#F5F7F8_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-lg" />
      <div className="w-full h-[14px] bg-[linear-gradient(90deg,#F5F7F8_25%,#E5E7EB_50%,#F5F7F8_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-lg" />
    </div>
  </article>
)

const Courses = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<AnyObj[]>([])
  const [enrolledMap, setEnrolledMap] = useState<Record<string, boolean>>({})
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [feedbackByCourse, setFeedbackByCourse] = useState<Record<string, AnyObj[]>>({})
  const [feedbackLoadingByCourse, setFeedbackLoadingByCourse] = useState<Record<string, boolean>>({})
  const [feedbackErrorByCourse, setFeedbackErrorByCourse] = useState<Record<string, string>>({})
  const [canFeedbackByCourse, setCanFeedbackByCourse] = useState<Record<string, boolean>>({})
  const [canEditByFeedback, setCanEditByFeedback] = useState<Record<string, boolean>>({})
  const [ratingSummaryByCourse, setRatingSummaryByCourse] = useState<Record<string, { count: number; avg: number }>>({})
  const [draftByCourse, setDraftByCourse] = useState<Record<string, Draft>>({})
  const [editingByCourse, setEditingByCourse] = useState<Record<string, EditState>>({})
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [sortBy, setSortBy] = useState('default')
  const [filterLevel, setFilterLevel] = useState('All')
  const [currentPage, setCurrentPage] = useState(0)
  const ITEMS_PER_PAGE = 12

  const filteredCourses = useMemo(() => {
    let result = [...courses]
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase().trim(); result = result.filter((c) => (getCourseTitle(c) + ' ' + getCourseDesc(c)).toLowerCase().includes(q)) }
    if (filterLevel !== 'All') { filterLevel === 'Free' ? result = result.filter((c) => !c.price || Number(c.price) === 0) : result = result.filter((c) => guessLevel(c) === filterLevel) }
    if (sortBy === 'name-asc') result.sort((a, b) => getCourseTitle(a).localeCompare(getCourseTitle(b)))
    else if (sortBy === 'name-desc') result.sort((a, b) => getCourseTitle(b).localeCompare(getCourseTitle(a)))
    else if (sortBy === 'price-asc') result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    else if (sortBy === 'price-desc') result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    else if (sortBy === 'rating') result.sort((a, b) => (ratingSummaryByCourse[getCourseKey(b)]?.avg || 0) - (ratingSummaryByCourse[getCourseKey(a)]?.avg || 0))
    return result
  }, [courses, searchQuery, sortBy, filterLevel, ratingSummaryByCourse])

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE)
  const pagedCourses = filteredCourses.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

  useEffect(() => {
    let cancelled = false; setLoading(true); setError('')
    courseApi.getMyCourses().then((res) => { if (!cancelled) setCourses(extractList(res.data?.data ?? res.data) as AnyObj[]) })
      .catch((e: unknown) => { if (!cancelled) { const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string }; if (err.response?.status === 400 || err.response?.status === 404) setCourses([]); else setError(err.response?.data?.message || err.message || 'Không tải được danh sách khóa học.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || courses.length === 0) return
    let cancelled = false
    const run = async () => {
      const map: Record<string, boolean> = {}
      await Promise.all(courses.map(async (c) => { const id = getCourseKey(c); if (!id) return; try { const res = await enrollmentApi.isEnrolled(id); const data = res.data?.data ?? res.data; map[id] = data === true || data === 'true' } catch { map[id] = false } }))
      if (!cancelled) setEnrolledMap(map)
    }; run(); return () => { cancelled = true }
  }, [isAuthenticated, courses])

  useEffect(() => {
    if (courses.length === 0) return; let cancelled = false
    const run = async () => {
      const sm: Record<string, { count: number; avg: number }> = {}
      await Promise.all(courses.map(async (c) => { const id = getCourseKey(c); if (!id) return; try { const res = await feedbackApi.getByCourse(id, 1, 50); sm[id] = buildRatingSummary(extractList(unwrap(res)) as AnyObj[]) } catch { sm[id] = { count: 0, avg: 0 } } }))
      if (!cancelled) setRatingSummaryByCourse(sm)
    }; run(); return () => { cancelled = true }
  }, [courses])

  const loadCanEditMap = async (feedbacks: AnyObj[]) => {
    const map: Record<string, boolean> = {}
    await Promise.all(feedbacks.map(async (fb) => { const fid = getFeedbackId(fb); if (!fid) return; try { const r = unwrap(await feedbackApi.canEdit(fid)); map[fid] = r === true || r === 'true' } catch { map[fid] = false } }))
    setCanEditByFeedback((p) => ({ ...p, ...map }))
  }
  const loadFeedbackDetail = async (courseId: string) => {
    if (!courseId) return; setFeedbackLoadingByCourse((p) => ({ ...p, [courseId]: true })); setFeedbackErrorByCourse((p) => ({ ...p, [courseId]: '' }))
    try { const res = await feedbackApi.getByCourse(courseId, 1, 20); const list = extractList(unwrap(res)) as AnyObj[]; setFeedbackByCourse((p) => ({ ...p, [courseId]: list })); setRatingSummaryByCourse((p) => ({ ...p, [courseId]: buildRatingSummary(list) })); await loadCanEditMap(list) }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackErrorByCourse((p) => ({ ...p, [courseId]: err.response?.data?.message || err.message || 'Không tải được bình luận.' })) }
    finally { setFeedbackLoadingByCourse((p) => ({ ...p, [courseId]: false })) }
  }
  const loadCanFeedback = async (courseId: string) => {
    if (!courseId || !isAuthenticated) { setCanFeedbackByCourse((p) => ({ ...p, [courseId]: false })); return }
    try { const r = unwrap(await feedbackApi.canFeedback(courseId)); setCanFeedbackByCourse((p) => ({ ...p, [courseId]: r === true || r === 'true' })) } catch { setCanFeedbackByCourse((p) => ({ ...p, [courseId]: false })) }
  }
  const handleBuy = (c: AnyObj) => { const id = (c?.courseId || c?.id) as string; if (!id) return; if (!isAuthenticated) { navigate('/login', { state: { from: '/courses', returnTo: `/payment?courseId=${id}` } }); return }; navigate(`/payment?courseId=${id}`, { state: { course: c } }) }
  const handleOpenDetail = (courseId: string, title?: string) => { if (courseId) navigate(`/courses/${courseSlugOrId(courseId, title)}`) }
  const handleCreateFeedback = async (courseId: string) => { const draft = draftByCourse[courseId] || { comment: '', rating: 5 }; if (!draft.comment?.trim()) return; try { await feedbackApi.create(courseId, { comment: draft.comment.trim(), rating: clampRating(draft.rating) }); setDraftByCourse((p) => ({ ...p, [courseId]: { comment: '', rating: 5 } })); await Promise.all([loadFeedbackDetail(courseId), loadCanFeedback(courseId)]) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackErrorByCourse((p) => ({ ...p, [courseId]: err.response?.data?.message || err.message || 'Gửi bình luận thất bại.' })) } }
  const handleSaveEdit = async (courseId: string) => { const edit = editingByCourse[courseId]; if (!edit?.feedbackId || !edit.comment?.trim()) return; try { await feedbackApi.update(edit.feedbackId, { comment: edit.comment.trim(), rating: clampRating(edit.rating) }); setEditingByCourse((p) => ({ ...p, [courseId]: null })); await loadFeedbackDetail(courseId) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackErrorByCourse((p) => ({ ...p, [courseId]: err.response?.data?.message || err.message || 'Cập nhật bình luận thất bại.' })) } }
  const handleDeleteFeedback = async (courseId: string, feedbackId: string) => { if (!feedbackId) return; try { await feedbackApi.delete(feedbackId); await Promise.all([loadFeedbackDetail(courseId), loadCanFeedback(courseId)]) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setFeedbackErrorByCourse((p) => ({ ...p, [courseId]: err.response?.data?.message || err.message || 'Xóa bình luận thất bại.' })) } }

  void selectedCourseId; void setSelectedCourseId; void loadFeedbackDetail; void loadCanFeedback; void handleCreateFeedback; void handleSaveEdit; void handleDeleteFeedback; void feedbackByCourse; void feedbackLoadingByCourse; void feedbackErrorByCourse; void canFeedbackByCourse; void canEditByFeedback; void draftByCourse; void editingByCourse

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-9 pb-16">
        <div className="mb-6">
          <h1 className="m-0 text-[clamp(2rem,3.5vw,2.4rem)] font-black tracking-tight">Khóa học</h1>
          <p className="mt-1 text-text-secondary">Chọn khóa học và thanh toán qua MoMo để bắt đầu học.</p>
        </div>

        {!loading && !error && courses.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-white border border-border-medium rounded-[var(--radius-btn)] px-3 py-2.5 transition-all focus-within:border-primary-500 focus-within:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]">
                <svg className="shrink-0 text-text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
                <input type="text" className="flex-1 bg-transparent border-none outline-none text-text-main text-[0.92rem] font-[inherit] placeholder:text-text-dim" placeholder="Tìm kiếm khóa học..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer text-[0.85rem] px-1 rounded-md transition-colors hover:text-text-main" onClick={() => setSearchQuery('')}>✕</button>}
              </div>
              <select className="bg-white border border-border-medium rounded-[var(--radius-btn)] px-3 py-2.5 text-text-main text-[0.88rem] font-[inherit] cursor-pointer outline-none min-w-[160px] focus:border-primary-500" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="default">Sắp xếp mặc định</option>
                <option value="name-asc">Tên A → Z</option>
                <option value="name-desc">Tên Z → A</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
              <span className="text-[0.85rem] text-text-muted whitespace-nowrap">{filteredCourses.length} khóa học</span>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {FILTER_LEVELS.map((level) => (
                <button key={level} type="button" className={`px-4 py-1.5 rounded-full text-[0.88rem] font-semibold font-[inherit] border cursor-pointer whitespace-nowrap transition-all ${filterLevel === level ? 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600' : 'bg-white text-text-secondary border-border-medium hover:bg-[#F5F7F8] hover:border-text-muted'}`}
                  onClick={() => { setFilterLevel(level); setCurrentPage(0) }}>
                  {level === 'All' ? 'Tất cả' : level === 'Free' ? 'Miễn phí' : level}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Skeleton */}
        {loading && <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4 items-start">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
        {!loading && error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600">{error}</div>}
        {!loading && !error && courses.length === 0 && (
          <div className="text-center py-16 px-6 bg-white border border-border-medium rounded-[20px]">
            <span className="text-6xl block mb-4">🎓</span>
            <h3 className="text-xl font-bold m-0 mb-2">Chưa có khóa học nào</h3>
            <p className="text-text-muted m-0">Hãy quay lại sau để khám phá các khóa học mới nhất!</p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4 items-start max-[640px]:grid-cols-1">
              {pagedCourses.map((c) => {
                const id = getCourseKey(c)
                const enrolled = enrolledMap[id]
                const imageUrl = getCourseImage(c)
                const showImage = Boolean(imageUrl) && !brokenImages[id]
                const title = getCourseTitle(c)
                const ratingSummary = ratingSummaryByCourse[id] || { count: 0, avg: 0 }
                return (
                  <article key={id} className="bg-white border border-border-medium rounded-2xl flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:border-primary-500 group">
                    {/* Image */}
                    <div className="relative w-full aspect-video overflow-hidden border-b border-border-subtle">
                      {showImage ? (
                        <Link to={`/courses/${courseSlugOrId(id, title)}`}>
                          <img src={imageUrl} alt={title} className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-[1.035]" loading="lazy" onError={() => setBrokenImages((p) => ({ ...p, [id]: true }))} />
                        </Link>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-primary-500 bg-[linear-gradient(135deg,#E3F2FD_0%,#BBDEFB_45%,#90CAF9_100%)]">
                          <span className="text-xl font-black">&lt;/&gt;</span>
                          <span className="text-xs tracking-widest uppercase opacity-90">UniCode</span>
                        </div>
                      )}
                      <span className="absolute top-2.5 right-2.5 bg-white/92 backdrop-blur-sm text-text-main text-[0.72rem] font-bold px-2 py-0.5 rounded-md tracking-wide shadow-[0_1px_4px_rgba(0,0,0,0.1)]">{guessLevel(c)}</span>
                      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.34),transparent_42%)] pointer-events-none" />
                    </div>
                    {/* Body */}
                    <div className="p-3.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-extrabold text-primary-500 bg-[rgba(0,86,210,0.08)] px-1.5 py-0.5 rounded leading-none">&lt;/&gt;</span>
                        <span className="text-[0.78rem] font-semibold text-text-muted">UniCode</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/courses/${courseSlugOrId(id, title)}`} className="no-underline text-inherit"><div className="font-extrabold text-lg leading-snug tracking-tight line-clamp-2">{title}</div></Link>
                        {enrolled && <span className="text-[0.73rem] px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600 whitespace-nowrap font-bold">Đã đăng ký</span>}
                      </div>
                      {extractSkills(c).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">{extractSkills(c).map((s) => <span key={s} className="text-[0.72rem] font-semibold bg-blue-50 text-primary-500 px-2 py-0.5 rounded whitespace-nowrap">{s}</span>)}</div>
                      )}
                      <div className="mt-0.5"><StarRating rating={ratingSummary.avg || 0} count={ratingSummary.count || 0} size="0.9rem" /></div>
                      <div className="flex items-center gap-1.5 text-[0.78rem] text-text-muted mt-0.5">
                        <span className="font-semibold">{guessLevel(c)}</span>
                        {estimateDuration(c) && <><span className="text-border-medium">·</span><span>{estimateDuration(c)}</span></>}
                        <span className="text-border-medium">·</span><span>Course</span>
                      </div>
                      <div className="mt-0.5"><span className="text-[0.78rem] text-text-muted">👥 {estimateLearners(id).toLocaleString()} enrolled</span></div>
                      <div className="flex items-center justify-between gap-3 mt-1.5 pt-2.5 border-t border-border-subtle">
                        <span className="font-extrabold text-text-main text-lg">{formatPrice(c.price)}</span>
                        {Number(c?.chapterCount) >= 0 && <span className="text-[0.88rem] text-text-muted">{c.chapterCount as number} chương</span>}
                      </div>
                      <button type="button" className="mt-1 py-2.5 px-3 rounded-[var(--radius-btn)] border border-border-medium bg-transparent text-text-secondary font-bold cursor-pointer transition-colors hover:bg-[#F5F7F8] hover:border-border-strong" onClick={() => handleOpenDetail(id)}>Xem mô tả & bình luận</button>
                      {enrolled ? (
                        <Link to={`/learning/${id}`} className="mt-1 py-3 px-4 rounded-[var(--radius-btn)] font-bold text-base border-none cursor-pointer bg-green-600 text-white no-underline text-center transition-all shadow-[0_2px_8px_rgba(15,123,15,0.2)] hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(16,185,129,0.42)]">Vào học</Link>
                      ) : (
                        <button type="button" className="mt-1 py-3 px-4 rounded-[var(--radius-btn)] font-bold text-base border-none cursor-pointer bg-primary-500 text-white text-center transition-all shadow-[0_2px_8px_rgba(0,86,210,0.25)] hover:-translate-y-px hover:bg-primary-600" onClick={() => handleBuy(c)}>Mua ngay</button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 py-4">
                <button className="px-4 py-2 text-sm font-semibold font-[inherit] text-primary-500 bg-transparent border border-border-medium rounded-[var(--radius-btn)] cursor-pointer transition-colors hover:bg-[rgba(0,86,210,0.05)] hover:border-primary-500 disabled:opacity-40 disabled:cursor-not-allowed" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>← Trước</button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} className={`w-9 h-9 flex items-center justify-center text-sm font-semibold font-[inherit] rounded-[var(--radius-btn)] border border-transparent cursor-pointer transition-all ${currentPage === i ? 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600' : 'text-text-secondary bg-transparent hover:bg-[#F5F7F8]'}`} onClick={() => setCurrentPage(i)}>{i + 1}</button>
                  ))}
                </div>
                <button className="px-4 py-2 text-sm font-semibold font-[inherit] text-primary-500 bg-transparent border border-border-medium rounded-[var(--radius-btn)] cursor-pointer transition-colors hover:bg-[rgba(0,86,210,0.05)] hover:border-primary-500 disabled:opacity-40 disabled:cursor-not-allowed" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>Sau →</button>
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
