import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { courseApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './MyCourses.css'

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const getCourseKey = (c) => c?.courseId || c?.id || c?._id || c?.courseCode || c?.slug || c?.title
const getCourseTitle = (c) => c?.title || c?.name || c?.courseName || 'Untitled course'
const getCourseDesc = (c) => c?.description || c?.summary || ''
const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price)
  if (Number.isNaN(num)) return String(price)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

const EMPTY_FORM = { title: '', description: '', price: 0, instructorId: '', sylabusId: '' }

const MyCourses = () => {
  const { user } = useAuth()
  const roleCode = user?.roles?.[0]?.roleCode
  const canView = roleCode === 'INSTRUCTOR' || roleCode === 'ADMIN'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchCourses = async () => {
    if (!canView) { setLoading(false); setCourses([]); return }
    setLoading(true)
    setError('')
    try {
      const res = await courseApi.getMyCourses()
      const payload = res.data?.data ?? res.data
      setCourses(extractList(payload))
    } catch (e) {
      const status = e.response?.status
      if (status === 400 || status === 404) {
        setCourses([])
      } else {
        setError(e.response?.data?.message || e.message || 'Không thể tải danh sách khóa học.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCourses() }, [canView])

  const openCreate = () => {
    setEditingCourse(null)
    setForm({ ...EMPTY_FORM, instructorId: user?.userId || '' })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditingCourse(c)
    setForm({
      title: getCourseTitle(c),
      description: getCourseDesc(c),
      price: c.price ?? 0,
      instructorId: c.instructorId || user?.userId || '',
      sylabusId: c.sylabusId || '',
    })
    setFormError('')
    setShowForm(true)
  }

  const handleDelete = async (c) => {
    const id = getCourseKey(c)
    if (!window.confirm(`Xóa khóa học "${getCourseTitle(c)}"?`)) return
    try {
      await courseApi.delete(id)
      setCourses((prev) => prev.filter((x) => getCourseKey(x) !== id))
    } catch (e) {
      alert(e.response?.data?.message || 'Xóa thất bại')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormError('Tên khóa học không được trống'); return }
    setSaving(true)
    setFormError('')
    try {
      if (editingCourse) {
        await courseApi.update(getCourseKey(editingCourse), {
          title: form.title,
          description: form.description,
          price: Number(form.price) || 0,
        })
      } else {
        await courseApi.create({
          title: form.title,
          description: form.description,
          price: Number(form.price) || 0,
          instructorId: form.instructorId || user?.userId,
          sylabusId: form.sylabusId || undefined,
        })
      }
      setShowForm(false)
      fetchCourses()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mycourses">
      <Header />
      <main className="mycourses-main">
        <div className="mycourses-header">
          <div>
            <h1>My Courses</h1>
            <p>Danh sách khóa học bạn đang sở hữu/quản lý.</p>
          </div>
          <div className="mycourses-actions">
            <Link to="/dashboard" className="mycourses-btn mycourses-btn-ghost">
              ← Dashboard
            </Link>
            {canView && (
              <button type="button" className="mycourses-btn mycourses-btn-primary" onClick={openCreate}>
                + Tạo khóa học
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="mycourses-modal-overlay" onClick={() => setShowForm(false)}>
            <form className="mycourses-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
              <h2>{editingCourse ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}</h2>
              {formError && <div className="mycourses-form-error">{formError}</div>}
              <label>
                Tên khóa học *
                <input
                  value={form.title}
                  onChange={(ev) => setForm({ ...form, title: ev.target.value })}
                  required
                />
              </label>
              <label>
                Mô tả
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                />
              </label>
              <label>
                Giá (VND)
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(ev) => setForm({ ...form, price: ev.target.value })}
                />
              </label>
              <div className="mycourses-form-actions">
                <button type="button" className="mycourses-btn mycourses-btn-ghost" onClick={() => setShowForm(false)}>
                  Hủy
                </button>
                <button type="submit" className="mycourses-btn mycourses-btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingCourse ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!canView && (
          <div className="mycourses-empty">
            Trang này dành cho <strong>Lecturer/Instructor</strong>. (Role hiện tại: {roleCode || 'Unknown'})
          </div>
        )}

        {canView && loading && <div className="mycourses-loading">Đang tải khóa học...</div>}

        {canView && !loading && error && (
          <div className="mycourses-error">
            <strong>Lỗi tải My Courses</strong>
            <div>{error}</div>
          </div>
        )}

        {canView && !loading && !error && courses.length === 0 && (
          <div className="mycourses-empty">
            Chưa có khóa học nào. Nhấn <strong>"+ Tạo khóa học"</strong> để tạo mới.
          </div>
        )}

        {canView && !loading && !error && courses.length > 0 && (
          <div className="mycourses-grid">
            {courses.map((c) => (
              <article key={getCourseKey(c)} className="mycourses-card">
                <div className="mycourses-card-top">
                  <div className="mycourses-card-title">{getCourseTitle(c)}</div>
                  {c?.status && <span className="mycourses-pill">{String(c.status)}</span>}
                </div>
                {c?.instructorName && (
                  <p className="mycourses-card-instructor">GV: {c.instructorName}</p>
                )}
                {getCourseDesc(c) && <p className="mycourses-card-desc">{getCourseDesc(c)}</p>}
                <div className="mycourses-card-meta">
                  {c?.price !== undefined && c?.price !== null && (
                    <span className="mycourses-price">{formatPrice(c.price)}</span>
                  )}
                  {Number(c?.chapterCount) >= 0 && (
                    <span className="mycourses-chapters">{c.chapterCount} chương</span>
                  )}
                </div>
                <div className="mycourses-card-actions">
                  <Link
                    to={`/my-courses/${getCourseKey(c)}/videos`}
                    className="mycourses-btn mycourses-btn-ghost mycourses-card-link"
                  >
                    Quản lý nội dung
                  </Link>
                  <button
                    type="button"
                    className="mycourses-btn mycourses-btn-ghost"
                    onClick={() => openEdit(c)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="mycourses-btn mycourses-btn-danger"
                    onClick={() => handleDelete(c)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyCourses
