import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { syllabusApi, courseApi } from '../api'
import './SyllabusManagement.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  return []
}

const SyllabusManagement = () => {
  const [syllabuses, setSyllabuses] = useState([])
  const [courses, setCourses] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ courseId: '', courseContent: '', method: '', referenceMaterial: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, cRes] = await Promise.all([
        syllabusApi.getAll(page, 10),
        courseApi.getAll(0, 100),
      ])
      const sData = unwrap(sRes)
      setSyllabuses(extractList(sData))
      setTotalPages(sData?.totalPages ?? sData?.page?.totalPages ?? 1)
      setCourses(extractList(unwrap(cRes)))
    } catch { /* ignore */ }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ courseId: '', courseContent: '', method: '', referenceMaterial: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      courseId: s.courseId || '',
      courseContent: s.courseContent || '',
      method: s.method || '',
      referenceMaterial: s.referenceMaterial || '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (s) => {
    if (!window.confirm('Xóa syllabus này?')) return
    try { await syllabusApi.delete(s.sylabusId); load() } catch (e) { alert(e.response?.data?.message || 'Lỗi') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.courseContent.trim()) { setFormError('Nội dung khóa học không được trống'); return }
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await syllabusApi.update(editing.sylabusId, {
          courseContent: form.courseContent,
          method: form.method,
          referenceMaterial: form.referenceMaterial,
        })
      } else {
        await syllabusApi.create({
          courseId: form.courseId || undefined,
          courseContent: form.courseContent,
          method: form.method,
          referenceMaterial: form.referenceMaterial,
        })
      }
      setShowModal(false)
      load()
    } catch (err) { setFormError(err.response?.data?.message || err.message) }
    setSaving(false)
  }

  return (
    <div className="syllabus-page">
      <Header />

      {/* ═══ SYLLABUS DASHBOARD BANNER ═══ */}
      <div className="syl-dashboard">
        <div className="syl-dashboard-inner">
          <div className="syl-dashboard-breadcrumb">
            <Link to="/">Trang chủ</Link> <span>/</span> <Link to="/my-courses">Khóa học của tôi</Link> <span>/</span> <span>Đề cương</span>
          </div>
          <h1 className="syl-dashboard-title">📋 Quản lý Đề cương</h1>
          <p className="syl-dashboard-sub">Quản lý đề cương khóa học — nội dung, phương pháp giảng dạy và tài liệu tham khảo.</p>
        </div>
      </div>

      <main className="syllabus-main">

        <div className="syllabus-header">
          <Link to="/my-courses" className="syllabus-btn syllabus-btn-ghost">← My Courses</Link>
          <button type="button" className="syllabus-btn syllabus-btn-primary" onClick={openCreate}>+ Tạo Syllabus</button>
        </div>

        {showModal && (
          <div className="syllabus-modal-overlay" onClick={() => setShowModal(false)}>
            <form className="syllabus-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
              <h3>{editing ? 'Sửa Syllabus' : 'Tạo Syllabus'}</h3>
              {formError && <div className="syllabus-form-error">{formError}</div>}
              {!editing && (
                <label>
                  Khóa học
                  <select value={form.courseId} onChange={(ev) => setForm({ ...form, courseId: ev.target.value })}>
                    <option value="">-- Chọn khóa học --</option>
                    {courses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>{c.title}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Nội dung khóa học *
                <textarea rows={3} value={form.courseContent} onChange={(ev) => setForm({ ...form, courseContent: ev.target.value })} required />
              </label>
              <label>
                Phương pháp giảng dạy
                <input value={form.method} onChange={(ev) => setForm({ ...form, method: ev.target.value })} />
              </label>
              <label>
                Tài liệu tham khảo
                <textarea rows={2} value={form.referenceMaterial} onChange={(ev) => setForm({ ...form, referenceMaterial: ev.target.value })} />
              </label>
              <div className="syllabus-form-actions">
                <button type="button" className="syllabus-btn syllabus-btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="syllabus-btn syllabus-btn-primary" disabled={saving}>{saving ? '...' : editing ? 'Cập nhật' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="syllabus-section">
          {loading ? <div className="syllabus-loading">Đang tải...</div> : (
            <>
              <div className="syllabus-table-wrap">
                <table className="syllabus-table">
                  <thead>
                    <tr><th>Khóa học</th><th>Nội dung</th><th>Phương pháp</th><th>Tài liệu</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {syllabuses.map((s) => (
                      <tr key={s.sylabusId}>
                        <td>{s.courseTitle || '-'}</td>
                        <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.courseContent || '-'}</td>
                        <td>{s.method || '-'}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.referenceMaterial || '-'}</td>
                        <td>
                          <div className="syllabus-actions-cell">
                            <button type="button" className="syllabus-btn syllabus-btn-sm syllabus-btn-ghost" onClick={() => openEdit(s)}>Sửa</button>
                            <button type="button" className="syllabus-btn syllabus-btn-sm syllabus-btn-danger" onClick={() => handleDelete(s)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {syllabuses.length === 0 && <tr><td colSpan={5} className="syllabus-empty">Chưa có syllabus nào</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="syllabus-pagination">
                <button type="button" className="syllabus-btn syllabus-btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
                <span>Trang {page + 1} / {totalPages}</span>
                <button type="button" className="syllabus-btn syllabus-btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default SyllabusManagement
