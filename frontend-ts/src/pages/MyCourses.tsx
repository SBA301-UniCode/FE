import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { courseApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { courseSlugOrId } from '../utils/slug'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const extractList = (p: unknown) => { if (Array.isArray(p)) return p as AnyObj[]; const o = p as AnyObj; for (const k of ['content', 'items', 'results', 'data']) { if (Array.isArray(o?.[k])) return o[k] as AnyObj[] }; return [] }
const getCourseKey = (c: AnyObj) => (c?.courseId || c?.id || c?._id || c?.courseCode || c?.slug || c?.title) as string
const getCourseTitle = (c: AnyObj) => (c?.title || c?.name || c?.courseName || 'Untitled course') as string
const getCourseDesc = (c: AnyObj) => (c?.description || c?.summary || '') as string
const getCourseImage = (c: AnyObj) => (c?.image || c?.imageUrl || c?.thumbnail || c?.coverImage || c?.cover || '') as string
const formatPrice = (p: unknown) => { const n = Number(p); if (!n || Number.isNaN(n)) return ''; return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) }

interface CourseForm { title: string; description: string; price: number | string; instructorId: string; sylabusId: string; imageFile: File | null }
const EMPTY_FORM: CourseForm = { title: '', description: '', price: 0, instructorId: '', sylabusId: '', imageFile: null }
const DRAFT_KEY = 'unicode_course_form_draft_v1'
const saveDraft = (form: Omit<CourseForm, 'imageFile'>) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: form.title, description: form.description, price: form.price, instructorId: form.instructorId, sylabusId: form.sylabusId })) } catch { /* ignore */ } }
const loadDraft = (): Partial<CourseForm> | null => { try { const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return null; return JSON.parse(raw) } catch { return null } }
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

const inputCls = 'bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]'
const btnGhost = 'px-4 py-2.5 rounded-xl font-bold border border-border-medium bg-white text-text-main cursor-pointer no-underline inline-flex items-center justify-center transition-all hover:bg-bg-deep text-sm'
const btnPrimary = 'px-4 py-2.5 rounded-xl font-bold border-none bg-primary-500 text-white cursor-pointer inline-flex items-center justify-center transition-all shadow-[0_4px_12px_rgba(0,86,210,0.15)] hover:bg-primary-600 text-sm disabled:opacity-60 disabled:cursor-not-allowed'

const MyCourses = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const roleCode = (user?.roles as unknown as AnyObj[])?.[0]?.roleCode as string | undefined
  const canView = roleCode === 'INSTRUCTOR' || roleCode === 'ADMIN'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<AnyObj[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<AnyObj | null>(null)
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM)
  const [imagePreview, setImagePreview] = useState('')
  const [isObjectPreview, setIsObjectPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [currentPage, setCurrentPage] = useState(0)
  const ITEMS_PER_PAGE = 6

  const fetchCourses = async () => { if (!canView) { setLoading(false); setCourses([]); return }; setLoading(true); setError(''); try { const res = await courseApi.getMyCourses(); const p = (res as { data?: { data?: unknown } }).data?.data ?? (res as { data?: unknown }).data; setCourses(extractList(p)) } catch (e: unknown) { const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string }; if (err.response?.status === 400 || err.response?.status === 404) setCourses([]); else setError(err.response?.data?.message || err.message || 'Error') } finally { setLoading(false) } }
  useEffect(() => { fetchCourses() }, [canView])
  useEffect(() => () => { if (isObjectPreview && imagePreview) URL.revokeObjectURL(imagePreview) }, [isObjectPreview, imagePreview])

  const resetPreview = () => { if (isObjectPreview && imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(''); setIsObjectPreview(false) }
  const openCreate = () => { setEditingCourse(null); resetPreview(); const draft = loadDraft(); setForm(draft && draft.title ? { ...EMPTY_FORM, ...draft, instructorId: draft.instructorId || user?.userId || '', imageFile: null } : { ...EMPTY_FORM, instructorId: user?.userId || '' }); setFormError(''); setShowForm(true) }
  const openEdit = (c: AnyObj) => { setEditingCourse(c); resetPreview(); const img = getCourseImage(c); if (img) { setImagePreview(img); setIsObjectPreview(false) }; setForm({ title: getCourseTitle(c), description: getCourseDesc(c), price: (c.price ?? 0) as number, instructorId: (c.instructorId || user?.userId || '') as string, sylabusId: (c.sylabusId || '') as string, imageFile: null }); setFormError(''); setShowForm(true) }
  const closeForm = () => { if (!editingCourse && (form.title.trim() || form.description.trim() || Number(form.price) > 0)) saveDraft(form); resetPreview(); setShowForm(false) }
  const handleImageChange = (file?: File) => { resetPreview(); if (!file) { setForm((p) => ({ ...p, imageFile: null })); return }; setForm((p) => ({ ...p, imageFile: file })); setImagePreview(URL.createObjectURL(file)); setIsObjectPreview(true) }
  const handleDelete = async (c: AnyObj) => { const id = getCourseKey(c); if (!window.confirm(`${t('common.delete')} "${getCourseTitle(c)}"?`)) return; try { await courseApi.delete(id); setCourses((p) => p.filter((x) => getCourseKey(x) !== id)) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; alert(err.response?.data?.message || 'Error') } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimTitle = form.title.trim()
    if (!trimTitle) { setFormError(t('myCourses.validationNameEmpty')); return }
    if (trimTitle.length < 3) { setFormError(t('myCourses.validationNameMin')); return }
    if (trimTitle.length > 200) { setFormError(t('myCourses.validationNameMax')); return }
    if (form.description.length > 5000) { setFormError(t('myCourses.validationDescMax')); return }
    const priceNum = Number(form.price)
    if (!Number.isFinite(priceNum) || priceNum < 0) { setFormError(t('myCourses.validationPricePositive')); return }
    if (priceNum > 100_000_000) { setFormError(t('myCourses.validationPriceMax')); return }
    if (priceNum % 1 !== 0) { setFormError(t('myCourses.validationPriceWhole')); return }
    if (!editingCourse && !form.imageFile) { setFormError(t('myCourses.validationImageRequired')); return }
    setSaving(true); setFormError('')
    try { const payload = { title: trimTitle, description: form.description.trim(), price: priceNum }; if (editingCourse) { const id = getCourseKey(editingCourse); await courseApi.update(id, payload as unknown as Parameters<typeof courseApi.update>[1]); if (form.imageFile) { const fd = new FormData(); fd.append('file', form.imageFile); await courseApi.updateImage(id, fd as unknown as Parameters<typeof courseApi.updateImage>[1]) } } else { const cp = { ...payload, instructorId: form.instructorId || user?.userId, sylabusId: form.sylabusId || undefined }; await courseApi.create(cp as unknown as Parameters<typeof courseApi.create>[0], form.imageFile || undefined) }; clearDraft(); closeForm(); fetchCourses() } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; message?: string }; setFormError(e.response?.data?.message || e.message || 'Error') } finally { setSaving(false) }
  }

  const totalChapters = useMemo(() => courses.reduce((s, c) => s + (Number(c?.chapterCount) || 0), 0), [courses])

  const filteredCourses = useMemo(() => {
    let result = [...courses]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => (getCourseTitle(c) + ' ' + getCourseDesc(c)).toLowerCase().includes(q))
    }
    if (sortBy === 'name-asc') result.sort((a, b) => getCourseTitle(a).localeCompare(getCourseTitle(b)))
    else if (sortBy === 'name-desc') result.sort((a, b) => getCourseTitle(b).localeCompare(getCourseTitle(a)))
    else if (sortBy === 'price-asc') result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    else if (sortBy === 'price-desc') result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    return result
  }, [courses, searchQuery, sortBy])
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE)
  const pagedCourses = filteredCourses.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      {/* Banner */}
      {canView && <div className="bg-[linear-gradient(135deg,#312e81_0%,#4338ca_50%,#6366f1_100%)] px-6 py-8 text-white"><div className="max-w-[1280px] mx-auto flex items-center justify-between gap-6"><div><h1 className="m-0 text-2xl font-extrabold">{t('myCourses.instructorDashboard')}</h1><p className="mt-1 mb-0 text-white/70 text-sm">{t('myCourses.dashboardDesc')}</p></div><div className="flex gap-8">{[{ v: courses.length, l: 'Courses' }, { v: totalChapters, l: 'Chapters' }].map((s) => <div key={s.l} className="flex flex-col items-center"><span className="text-3xl font-extrabold">{s.v}</span><span className="text-[0.75rem] text-white/60 uppercase tracking-wider">{s.l}</span></div>)}</div></div></div>}

      <main className="max-w-[1280px] mx-auto px-6 py-6 pb-16">
        <div className="flex items-end justify-between gap-4 mb-5 flex-wrap"><div /><div className="flex gap-3 flex-wrap"><Link to="/" className={`${btnGhost} no-underline`}>{t('myCourses.homePage')}</Link>{canView && <button type="button" className={btnPrimary} onClick={openCreate}>{t('myCourses.createCourse')}</button>}</div></div>

        {/* Search & Sort toolbar */}
        {canView && !loading && !error && courses.length > 0 && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-border-medium rounded-xl px-4 py-2.5">
              <span className="text-text-muted">🔍</span>
              <input type="text" className="flex-1 bg-transparent border-none outline-none text-text-main text-[0.92rem] font-[inherit]" placeholder={t('myCourses.searchPlaceholder')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0) }} />
              {searchQuery && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer text-sm" onClick={() => { setSearchQuery(''); setCurrentPage(0) }}>✕</button>}
            </div>
            <select className="bg-white border border-border-medium rounded-xl px-3 py-2.5 text-text-main text-[0.88rem] outline-none cursor-pointer" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">{t('myCourses.sortDefault')}</option>
              <option value="name-asc">{t('myCourses.sortNameAsc')}</option>
              <option value="name-desc">{t('myCourses.sortNameDesc')}</option>
              <option value="price-asc">{t('myCourses.sortPriceAsc')}</option>
              <option value="price-desc">{t('myCourses.sortPriceDesc')}</option>
            </select>
            <span className="text-[0.85rem] text-text-muted">{t('myCourses.courseCount', { count: filteredCourses.length })}</span>
          </div>
        )}

        {/* Modal */}
        {showForm && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]" onClick={closeForm}><form className="bg-white border border-border-medium rounded-[18px] px-7 py-6 w-[95%] max-w-[520px] flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
          <h2 className="m-0 text-xl font-extrabold">{editingCourse ? t('myCourses.editCourse') : t('myCourses.createNew')}</h2>
          {formError && <div className="bg-red-50 border border-red-200 rounded-[10px] px-3 py-2 text-sm text-red-600">{formError}</div>}
          <label className="flex flex-col gap-1 text-sm font-semibold">{t('myCourses.courseNameLabel')}<input className={inputCls} value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} required /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold">{t('myCourses.descriptionLabel')}<textarea className={`${inputCls} resize-y min-h-[200px]`} rows={8} value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold">{t('myCourses.priceLabel')} <span className="text-text-muted font-normal text-[0.78rem]">{t('myCourses.priceMax')}</span><input className={inputCls} type="number" min={0} max={100000000} step={1000} value={form.price} onChange={(ev) => { const v = ev.target.value; if (v === '' || Number(v) <= 100_000_000) setForm({ ...form, price: v }) }} />{Number(form.price) > 0 && <span className="text-[0.82rem] text-primary-500 font-bold mt-0.5">{formatPrice(form.price)}</span>}{(form.price === '' || form.price === 0 || form.price === '0') && <span className="text-[0.82rem] text-green-600 font-bold mt-0.5">{t('common.free')}</span>}</label>
          <label className="flex flex-col gap-1 text-sm font-semibold">{t('myCourses.imageLabel')} {editingCourse ? t('myCourses.imageOptional') : '*'}<input className={inputCls} type="file" accept="image/*" onChange={(ev) => handleImageChange(ev.target.files?.[0])} /></label>
          {imagePreview && <div className="-mt-1 border border-border-medium rounded-xl overflow-hidden bg-bg-deep"><img src={imagePreview} alt="Preview" className="block w-full max-h-[220px] object-cover" /></div>}
          <div className="flex gap-3 justify-end"><button type="button" className={btnGhost} onClick={closeForm}>{t('common.cancel')}</button><button type="submit" className={btnPrimary} disabled={saving}>{saving ? t('myCourses.saving') : editingCourse ? t('myCourses.update') : t('myCourses.createBtn')}</button></div>
        </form></div>}

        {!canView && <div className="bg-white border border-border-medium rounded-2xl px-5 py-4 text-text-muted">{t('myCourses.roleRequired')} (Role: {roleCode || 'Unknown'})</div>}
        {canView && loading && <div className="bg-white border border-border-medium rounded-2xl px-5 py-4 text-text-muted">{t('myCourses.loadingCourses')}</div>}
        {canView && !loading && error && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600"><strong>{t('myCourses.errorLoading')}</strong><div>{error}</div></div>}
        {canView && !loading && !error && courses.length === 0 && <div className="bg-white border border-border-medium rounded-2xl px-5 py-4 text-text-muted">{t('myCourses.noCoursesList')}</div>}

        {canView && !loading && !error && filteredCourses.length > 0 && <><div className="grid grid-cols-3 gap-4 mt-5 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">{pagedCourses.map((c) => <article key={getCourseKey(c)} className="bg-white border border-border-medium rounded-[18px] p-4 flex flex-col gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,86,210,0.08)]">
          {getCourseImage(c) && <div className="w-full h-[130px] rounded-xl overflow-hidden bg-blue-50 mb-0.5"><img src={getCourseImage(c)} alt="" className="w-full h-full object-cover block" /></div>}
          <div className="flex items-start justify-between gap-3"><div className="font-extrabold text-lg leading-tight">{getCourseTitle(c)}</div>{!!c?.status && <span className="text-[0.75rem] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-green-600 whitespace-nowrap">{String(c.status)}</span>}</div>
          {!!c?.instructorName && <p className="m-0 text-[0.85rem] text-text-muted">{t('myLearning.instructor', { name: String(c.instructorName) })}</p>}
          {getCourseDesc(c) && <p className="m-0 text-text-secondary leading-relaxed text-sm line-clamp-3">{getCourseDesc(c)}</p>}
          <div className="flex items-center justify-between gap-3 mt-1">{c?.price !== undefined && c?.price !== null && <span className="font-extrabold text-primary-500">{formatPrice(c.price)}</span>}{Number(c?.chapterCount) >= 0 && <span className="text-[0.85rem] text-text-muted">{t('courses.chapterCount', { count: c.chapterCount as number })}</span>}</div>
          <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(88px,1fr)] gap-2 mt-1.5 max-[640px]:grid-cols-1"><Link to={`/my-courses/${courseSlugOrId(getCourseKey(c), getCourseTitle(c))}/videos`} className={`${btnGhost} no-underline min-h-[44px]`}>{t('myCourses.manageContent')}</Link><button type="button" className={`${btnGhost} min-h-[44px]`} onClick={() => openEdit(c)}>{t('myCourses.editBtn')}</button><button type="button" className="col-span-full justify-self-start px-4 py-2 rounded-xl font-bold text-sm cursor-pointer bg-red-500/8 text-red-600 border border-red-200 hover:bg-red-500/15 transition-all min-h-[40px] max-[640px]:w-full" onClick={() => handleDelete(c)}>{t('myCourses.deleteBtn')}</button></div>
        </article>)}</div>
        {/* Pagination */}
        {totalPages > 1 && <div className="flex items-center justify-center gap-3 mt-6"><button type="button" className={btnGhost} disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)}>{t('myCourses.paginationPrev')}</button><span className="text-[0.88rem] text-text-secondary">{t('myCourses.paginationPage', { current: currentPage + 1, total: totalPages })}</span><button type="button" className={btnGhost} disabled={currentPage + 1 >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>{t('myCourses.paginationNext')}</button></div>}
        </>}
      </main>
      <Footer />
    </div>
  )
}

export default MyCourses
