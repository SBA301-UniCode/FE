import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { userApi, enrollmentApi, certificateApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './Profile.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res

const Profile = () => {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [certificateCount, setCertificateCount] = useState(0)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await userApi.getMe()
        const userData = unwrap(res)
        setUser(userData)
        setName(userData?.name || '')

        try {
          const enrollRes = await enrollmentApi.getMyLearning('IN_PROGRESS', 0, 1)
          const enrollData = unwrap(enrollRes)
          setEnrollmentCount(enrollData?.totalElements ?? enrollData?.content?.length ?? 0)
        } catch { /* ignore */ }

        try {
          const certRes = await certificateApi.getMyList()
          const certData = unwrap(certRes)
          setCertificateCount(Array.isArray(certData) ? certData.length : certData?.content?.length ?? 0)
        } catch { /* ignore */ }
      } catch {
        setMessage('Không thể tải thông tin tài khoản.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return setMessage('Tên không được để trống.')
    setSaving(true)
    setMessage('')
    try {
      const res = await userApi.update(user.userId, { name: name.trim() })
      const updated = unwrap(res)
      setUser(updated)
      setEditing(false)
      setMessage('Cập nhật thành công!')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = (role) => {
    const map = { ADMIN: 'Admin', INSTRUCTOR: 'Giảng viên', LEARNER: 'Học viên' }
    return map[role?.roleCode] || role?.roleCode || 'User'
  }

  if (loading) {
    return (
      <div className="profile-page">
        <Header />
        <main className="profile-main"><div className="profile-loading">Đang tải...</div></main>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <Header />

      {/* ═══ COVER GRADIENT ═══ */}
      <div className="pf-cover">
        <div className="pf-cover-inner">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} />
              ) : (
                <span className="pf-avatar-fallback">
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="pf-cover-info">
            {editing ? (
              <div className="pf-edit-row">
                <input
                  type="text"
                  className="pf-edit-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
                <button className="pf-btn pf-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button className="pf-btn pf-btn-cancel" onClick={() => { setEditing(false); setName(user?.name || '') }}>
                  Hủy
                </button>
              </div>
            ) : (
              <h1 className="pf-name">
                {user?.name || 'Unknown'}
                <button className="pf-edit-btn" onClick={() => setEditing(true)} title="Chỉnh sửa">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
              </h1>
            )}
            <p className="pf-email">{user?.email}</p>
            <div className="pf-roles">
              {(user?.roles || []).map((r, i) => (
                <span key={i} className="pf-role-badge">{roleLabel(r)}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="profile-main">
        {message && <div className="pf-message">{message}</div>}

        {/* ═══ STATS ROW ═══ */}
        <div className="pf-stats-row">
          <div className="pf-stat-card">
            <span className="pf-stat-icon">📚</span>
            <div className="pf-stat-info">
              <span className="pf-stat-value">{enrollmentCount}</span>
              <span className="pf-stat-label">Khóa học đang học</span>
            </div>
          </div>
          <div className="pf-stat-card">
            <span className="pf-stat-icon">🏆</span>
            <div className="pf-stat-info">
              <span className="pf-stat-value">{certificateCount}</span>
              <span className="pf-stat-label">Chứng chỉ</span>
            </div>
          </div>
          <div className="pf-stat-card">
            <span className="pf-stat-icon">📅</span>
            <div className="pf-stat-info">
              <span className="pf-stat-value">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
              </span>
              <span className="pf-stat-label">Ngày tham gia</span>
            </div>
          </div>
        </div>

        {/* ═══ QUICK LINKS ═══ */}
        <div className="pf-quick-links">
          <h2 className="pf-section-title">Truy cập nhanh</h2>
          <div className="pf-links-grid">
            <Link to="/my-learning" className="pf-link-card">
              <div className="pf-link-icon-wrap pf-link-icon--blue">📚</div>
              <div className="pf-link-text">
                <strong>My Learning</strong>
                <span>Tiếp tục khóa học</span>
              </div>
              <span className="pf-link-arrow">→</span>
            </Link>
            <Link to="/my-certificates" className="pf-link-card">
              <div className="pf-link-icon-wrap pf-link-icon--gold">🏅</div>
              <div className="pf-link-text">
                <strong>Chứng chỉ</strong>
                <span>Xem và chia sẻ</span>
              </div>
              <span className="pf-link-arrow">→</span>
            </Link>
            <Link to="/courses" className="pf-link-card">
              <div className="pf-link-icon-wrap pf-link-icon--green">🔍</div>
              <div className="pf-link-text">
                <strong>Khám phá</strong>
                <span>Tìm khóa học mới</span>
              </div>
              <span className="pf-link-arrow">→</span>
            </Link>
          </div>
        </div>

        {/* ═══ ACCOUNT INFO ═══ */}
        <div className="pf-account-section">
          <h2 className="pf-section-title">Thông tin tài khoản</h2>
          <div className="pf-account-grid">
            <div className="pf-account-item">
              <span className="pf-account-label">Họ và tên</span>
              <span className="pf-account-value">{user?.name || '—'}</span>
            </div>
            <div className="pf-account-item">
              <span className="pf-account-label">Email</span>
              <span className="pf-account-value">{user?.email || '—'}</span>
            </div>
            <div className="pf-account-item">
              <span className="pf-account-label">Vai trò</span>
              <span className="pf-account-value">{(user?.roles || []).map(r => roleLabel(r)).join(', ') || '—'}</span>
            </div>
            <div className="pf-account-item">
              <span className="pf-account-label">User ID</span>
              <span className="pf-account-value" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.userId || '—'}</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Profile
