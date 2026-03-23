import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { syllabusApi, courseApi } from '../api'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const extractList = (p: unknown) => { if (Array.isArray(p)) return p as AnyObj[]; const o = p as AnyObj; return Array.isArray(o?.content) ? o.content as AnyObj[] : [] }

interface SylForm { courseId: string; courseContent: string; method: string; referenceMaterial: string }

const SyllabusManagement = () => {
  const [syllabuses, setSyllabuses] = useState<AnyObj[]>([])
  const [courses, setCourses] = useState<AnyObj[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AnyObj | null>(null)
  const [form, setForm] = useState<SylForm>({ courseId: '', courseContent: '', method: '', referenceMaterial: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => { setLoading(true); try { const [sRes, cRes] = await Promise.all([syllabusApi.getAll(page, 10), courseApi.getAll(0, 100)]); const sData = unwrap(sRes) as AnyObj; setSyllabuses(extractList(sData)); setTotalPages((sData?.totalPages ?? (sData?.page as AnyObj)?.totalPages ?? 1) as number); setCourses(extractList(unwrap(cRes))) } catch {}; setLoading(false) }, [page])
  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm({ courseId: '', courseContent: '', method: '', referenceMaterial: '' }); setFormError(''); setShowModal(true) }
  const openEdit = (s: AnyObj) => { setEditing(s); setForm({ courseId: (s.courseId || '') as string, courseContent: (s.courseContent || '') as string, method: (s.method || '') as string, referenceMaterial: (s.referenceMaterial || '') as string }); setFormError(''); setShowModal(true) }
  const handleDelete = async (s: AnyObj) => { if (!window.confirm('Xóa syllabus này?')) return; try { await syllabusApi.delete(s.sylabusId as string); load() } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; alert(err.response?.data?.message || 'Lỗi') } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimContent = form.courseContent.trim()
    if (!trimContent) { setFormError('Nội dung khóa học không được trống'); return }
    if (trimContent.length < 5) { setFormError('Nội dung khóa học phải có ít nhất 5 ký tự'); return }
    if (trimContent.length > 2000) { setFormError('Nội dung khóa học tối đa 2000 ký tự'); return }
    if (!form.method.trim()) { setFormError('Phương pháp giảng dạy không được trống'); return }
    setSaving(true); setFormError('')
    try { if (editing) { await syllabusApi.update(editing.sylabusId as string, { courseContent: trimContent, method: form.method.trim(), referenceMaterial: form.referenceMaterial.trim() }) } else { await syllabusApi.create({ courseId: form.courseId || undefined, courseContent: trimContent, method: form.method.trim(), referenceMaterial: form.referenceMaterial.trim() }) }; setShowModal(false); load() } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; message?: string }; setFormError(e.response?.data?.message || e.message || 'Lỗi') }; setSaving(false)
  }

  const btnPrimary = 'px-3.5 py-2 rounded-[10px] font-semibold border-none cursor-pointer text-[0.85rem] transition-all bg-primary-500 text-white hover:bg-primary-600'
  const btnGhost = 'px-3.5 py-2 rounded-[10px] font-semibold cursor-pointer text-[0.85rem] transition-all bg-bg-deep text-text-main border border-border-medium hover:bg-gray-100'
  const btnSm = '!px-2.5 !py-1 !text-[0.78rem]'

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      {/* Banner */}
      <div className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_50%,#14b8a6_100%)] px-6 py-6 pb-7 text-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-1.5 text-[0.82rem] mb-2 text-white/70"><Link to="/" className="text-white/85 no-underline hover:underline">Trang chủ</Link><span>/</span><Link to="/my-courses" className="text-white/85 no-underline hover:underline">Khóa học của tôi</Link><span>/</span><span>Đề cương</span></div>
          <h1 className="m-0 text-2xl font-extrabold">📋 Quản lý Đề cương</h1>
          <p className="mt-1 mb-0 text-white/70 text-sm">Quản lý đề cương khóa học — nội dung, phương pháp giảng dạy và tài liệu tham khảo.</p>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-6 py-6 pb-16">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <Link to="/my-courses" className={`${btnGhost} no-underline inline-flex items-center gap-1`}>← My Courses</Link>
          <button type="button" className={btnPrimary} onClick={openCreate}>+ Tạo Syllabus</button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]" onClick={() => setShowModal(false)}>
            <form className="bg-white border border-border-medium rounded-[18px] px-7 py-6 w-[95%] max-w-[550px] flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
              <h3 className="m-0 text-lg font-extrabold">{editing ? 'Sửa Syllabus' : 'Tạo Syllabus'}</h3>
              {formError && <div className="bg-red-50 border border-red-200 rounded-[10px] p-2 text-[0.85rem] text-red-600">{formError}</div>}
              {!editing && <label className="flex flex-col gap-1 text-sm font-semibold">Khóa học<select className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" value={form.courseId} onChange={(ev) => setForm({ ...form, courseId: ev.target.value })}><option value="">-- Chọn khóa học --</option>{courses.map((c) => <option key={c.courseId as string} value={c.courseId as string}>{c.title as string}</option>)}</select></label>}
              <label className="flex flex-col gap-1 text-sm font-semibold">Nội dung khóa học *<textarea className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none resize-y focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" rows={3} value={form.courseContent} onChange={(ev) => setForm({ ...form, courseContent: ev.target.value })} required /></label>
              <label className="flex flex-col gap-1 text-sm font-semibold">Phương pháp giảng dạy<input className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" value={form.method} onChange={(ev) => setForm({ ...form, method: ev.target.value })} /></label>
              <label className="flex flex-col gap-1 text-sm font-semibold">Tài liệu tham khảo<textarea className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none resize-y focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" rows={2} value={form.referenceMaterial} onChange={(ev) => setForm({ ...form, referenceMaterial: ev.target.value })} /></label>
              <div className="flex gap-3 justify-end"><button type="button" className={btnGhost} onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className={btnPrimary} disabled={saving}>{saving ? '...' : editing ? 'Cập nhật' : 'Tạo'}</button></div>
            </form>
          </div>
        )}

        {/* Table section */}
        <div className="bg-white border border-border-medium rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {loading ? <div className="p-4 text-center text-text-muted">Đang tải...</div> : <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:border-b [&>th]:border-border-subtle [&>th]:font-bold [&>th]:text-text-muted [&>th]:text-[0.82rem] [&>th]:uppercase"><th>Khóa học</th><th>Nội dung</th><th>Phương pháp</th><th>Tài liệu</th><th>Actions</th></tr></thead>
                <tbody>{syllabuses.map((s) => <tr key={s.sylabusId as string} className="hover:[&>td]:bg-bg-deep [&>td]:text-left [&>td]:px-3 [&>td]:py-2 [&>td]:border-b [&>td]:border-border-subtle"><td>{(s.courseTitle as string) || '-'}</td><td className="max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap">{(s.courseContent as string) || '-'}</td><td>{(s.method as string) || '-'}</td><td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{(s.referenceMaterial as string) || '-'}</td><td><div className="flex gap-1.5"><button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => openEdit(s)}>Sửa</button><button type="button" className={`${btnSm} px-2.5 py-1 rounded-[10px] font-semibold cursor-pointer text-[0.78rem] bg-red-500/8 text-red-600 border-none hover:bg-red-500/15`} onClick={() => handleDelete(s)}>Xóa</button></div></td></tr>)}
                  {syllabuses.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-text-muted">Chưa có syllabus nào</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-3 mt-4"><button type="button" className={btnGhost} disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button><span>Trang {page + 1} / {totalPages}</span><button type="button" className={btnGhost} disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>
          </>}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default SyllabusManagement
