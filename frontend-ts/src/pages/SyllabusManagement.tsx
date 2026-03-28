import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { syllabusApi, courseApi } from '../api'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const extractList = (p: unknown) => { if (Array.isArray(p)) return p as AnyObj[]; const o = p as AnyObj; return Array.isArray(o?.content) ? o.content as AnyObj[] : [] }

interface SylForm { courseId: string; courseContent: string; method: string; referenceMaterial: string }

const SyllabusManagement = () => {
  const { t } = useTranslation()
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
  const handleDelete = async (s: AnyObj) => { if (!window.confirm(t('syllabus.confirmDelete'))) return; try { await syllabusApi.delete(s.sylabusId as string); load() } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; toast.error(err.response?.data?.message || t('common.errorGeneric')) } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimContent = form.courseContent.trim()
    if (!trimContent) { setFormError(t('syllabus.contentLabel') + ' ' + t('common.errorGeneric')); return }
    if (trimContent.length < 5) { setFormError(t('syllabus.contentLabel')); return }
    if (trimContent.length > 2000) { setFormError(t('syllabus.contentLabel')); return }
    if (!form.method.trim()) { setFormError(t('syllabus.methodLabel')); return }
    setSaving(true); setFormError('')
    try { if (editing) { await syllabusApi.update(editing.sylabusId as string, { courseContent: trimContent, method: form.method.trim(), referenceMaterial: form.referenceMaterial.trim() }) } else { await syllabusApi.create({ courseId: form.courseId || undefined, courseContent: trimContent, method: form.method.trim(), referenceMaterial: form.referenceMaterial.trim() }) }; setShowModal(false); load() } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; message?: string }; setFormError(e.response?.data?.message || e.message || t('common.errorGeneric')) }; setSaving(false)
  }

  const btnPrimary = 'px-3.5 py-2 rounded-[10px] font-semibold border-none cursor-pointer text-[0.85rem] transition-all bg-primary-500 text-white hover:bg-primary-600'
  const btnGhost = 'px-3.5 py-2 rounded-[10px] font-semibold cursor-pointer text-[0.85rem] transition-all bg-bg-deep text-text-main border border-border-medium hover:bg-gray-100'
  const btnSm = '!px-2.5 !py-1 !text-[0.78rem]'
  const tdBase = 'align-top text-left px-3 py-2 border-b border-border-subtle break-words'

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />
      {/* Banner */}
      <div className="bg-[linear-gradient(135deg,#0d7a5f_0%,#11a87f_52%,#2bc292_100%)] px-6 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
        <div className="w-full max-w-[1320px] mx-auto">
          <h1 className="m-0 text-[1.42rem] font-extrabold tracking-tight">{t('syllabus.title')}</h1>
          <p className="mt-1 mb-0 text-white/80 text-[0.88rem]">{t('syllabus.desc')}</p>
        </div>
      </div>

      <main className="w-full mx-auto px-6 py-4 pb-16">
        <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="m-0 text-lg font-extrabold text-text-main">{t('syllabus.listTitle')}</h2>
            <p className="m-0 mt-1 text-sm text-text-secondary">{t('syllabus.listDesc')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/my-courses" className={`${btnGhost} no-underline inline-flex items-center gap-1`}>{t('manageContent.backMyCourses')}</Link>
            <button type="button" className={btnPrimary} onClick={openCreate}>{t('syllabus.createBtn')}</button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]" onClick={() => setShowModal(false)}>
            <form className="bg-white border border-border-medium rounded-[18px] px-7 py-6 w-[95%] max-w-[550px] flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
              <h3 className="m-0 text-lg font-extrabold">{editing ? t('syllabus.modalEditTitle') : t('syllabus.modalCreateTitle')}</h3>
              {formError && <div className="bg-red-50 border border-red-200 rounded-[10px] p-2 text-[0.85rem] text-red-600">{formError}</div>}
              {!editing && <label className="flex flex-col gap-1 text-sm font-semibold">{t('syllabus.courseLabel')}<select className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" value={form.courseId} onChange={(ev) => setForm({ ...form, courseId: ev.target.value })}><option value="">{t('syllabus.courseSelect')}</option>{courses.map((c) => <option key={c.courseId as string} value={c.courseId as string}>{c.title as string}</option>)}</select></label>}
              <label className="flex flex-col gap-1 text-sm font-semibold">{t('syllabus.contentLabel')}<textarea className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none resize-y focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" rows={3} value={form.courseContent} onChange={(ev) => setForm({ ...form, courseContent: ev.target.value })} required /></label>
              <label className="flex flex-col gap-1 text-sm font-semibold">{t('syllabus.methodLabel')}<input className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" value={form.method} onChange={(ev) => setForm({ ...form, method: ev.target.value })} /></label>
              <label className="flex flex-col gap-1 text-sm font-semibold">{t('syllabus.referenceLabel')}<textarea className="bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm font-normal outline-none resize-y focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]" rows={2} value={form.referenceMaterial} onChange={(ev) => setForm({ ...form, referenceMaterial: ev.target.value })} /></label>
              <div className="flex gap-3 justify-end"><button type="button" className={btnGhost} onClick={() => setShowModal(false)}>{t('syllabus.cancelBtn')}</button><button type="submit" className={btnPrimary} disabled={saving}>{saving ? t('common.loading') : editing ? t('syllabus.updateBtn') : t('syllabus.createSubmitBtn')}</button></div>
            </form>
          </div>
        )}

        {/* Table section */}
        <div className="bg-white border border-border-medium rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {loading ? <div className="p-4 text-center text-text-muted">{t('syllabus.loading')}</div> : <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:border-b [&>th]:border-border-subtle [&>th]:font-bold [&>th]:text-text-muted [&>th]:text-[0.82rem] [&>th]:uppercase">
                    <th className="w-[20%]">{t('syllabus.thCourse')}</th>
                    <th className="w-[36%]">{t('syllabus.thContent')}</th>
                    <th className="w-[18%]">{t('syllabus.thMethod')}</th>
                    <th className="w-[18%]">{t('syllabus.thReference')}</th>
                    <th className="w-[8%]">{t('syllabus.thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {syllabuses.map((s) => (
                    <tr key={s.sylabusId as string} className="hover:[&>td]:bg-bg-deep">
                      <td className={`${tdBase} font-semibold text-text-main`} title={(s.courseTitle as string) || '-'}>{(s.courseTitle as string) || '-'}</td>
                      <td className={`${tdBase} text-text-secondary`}>
                        <p className="m-0 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] wrap-break-word">{(s.courseContent as string) || '-'}</p>
                      </td>
                      <td className={`${tdBase} text-text-main`} title={(s.method as string) || '-'}>
                        <p className="m-0 wrap-break-word">{(s.method as string) || '-'}</p>
                      </td>
                      <td className={`${tdBase} text-text-secondary`}>
                        <p className="m-0 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] wrap-break-word">{(s.referenceMaterial as string) || '-'}</p>
                      </td>
                      <td className={`${tdBase} whitespace-nowrap`}>
                        <div className="flex gap-1.5 justify-end">
                          <button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => openEdit(s)}>{t('syllabus.editBtn')}</button>
                          <button type="button" className={`${btnSm} px-2.5 py-1 rounded-[10px] font-semibold cursor-pointer text-[0.78rem] bg-red-500/8 text-red-600 border-none hover:bg-red-500/15`} onClick={() => handleDelete(s)}>{t('syllabus.deleteBtn')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {syllabuses.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-text-muted">{t('syllabus.noData')}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-3 mt-4"><button type="button" className={btnGhost} disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.prev')}</button><span>{t('admin.paginationPage', { current: page + 1, total: totalPages })}</span><button type="button" className={btnGhost} disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</button></div>
          </>}
        </div>
      </main>
    </div>
  )
}

export default SyllabusManagement
