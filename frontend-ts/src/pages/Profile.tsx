import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { userApi, enrollmentApi, certificateApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import type { Role } from '../types'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }

const Profile = () => {
  const { user: _authUser } = useAuth()
  void _authUser
  const [user, setUser] = useState<AnyObj | null>(null)
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
        const userData = unwrap(res) as AnyObj
        setUser(userData); setName((userData?.name as string) || '')
        try { const er = unwrap(await enrollmentApi.getMyLearning('IN_PROGRESS', 0, 1)) as AnyObj; setEnrollmentCount((er?.totalElements as number) ?? (er?.content as unknown[])?.length ?? 0) } catch { /* ignore */ }
        try { const cr = unwrap(await certificateApi.getMyList()); setCertificateCount(Array.isArray(cr) ? cr.length : ((cr as AnyObj)?.content as unknown[])?.length ?? 0) } catch { /* ignore */ }
      } catch { setMessage('Không thể tải thông tin tài khoản.') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return setMessage('Tên không được để trống.')
    setSaving(true); setMessage('')
    try { const u = unwrap(await userApi.update((user as AnyObj).userId as string, { name: name.trim() })) as AnyObj; setUser(u); setEditing(false); setMessage('Cập nhật thành công!') }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; setMessage(err?.response?.data?.message || 'Cập nhật thất bại.') }
    finally { setSaving(false) }
  }

  const roleLabel = (r: Role | AnyObj) => {
    const map: Record<string, string> = { ADMIN: 'Admin', INSTRUCTOR: 'Giảng viên', LEARNER: 'Học viên' }
    const code = (r as AnyObj)?.roleCode as string
    return map[code] || code || 'User'
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="max-w-[800px] mx-auto px-6 py-20 text-center text-text-muted">Đang tải...</main>
    </div>
  )

  const roles = (user?.roles as AnyObj[]) || []

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />

      {/* Cover */}
      <div className="bg-[linear-gradient(135deg,#1a1a2e_0%,#16213e_50%,#0f3460_100%)] px-6 py-10 text-white">
        <div className="max-w-[800px] mx-auto flex items-center gap-6 max-[640px]:flex-col max-[640px]:text-center">
          <div className="shrink-0">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-primary-700))] flex items-center justify-center border-4 border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)] max-[640px]:w-20 max-[640px]:h-20">
              {(user?.avatarUrl as string) ? (
                <img src={user!.avatarUrl as string} alt={(user?.name as string) || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[2.5rem] font-extrabold">{((user?.name as string) || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input type="text" className="flex-1 px-3 py-2 border border-white/30 rounded-lg text-base font-[inherit] outline-none bg-white/10 text-white focus:border-white focus:shadow-[0_0_0_3px_rgba(255,255,255,0.15)]" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
                <button className="px-3.5 py-2 rounded-lg text-[0.85rem] font-semibold font-[inherit] border-none cursor-pointer transition-colors bg-white text-primary-500 hover:bg-gray-100" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                <button className="px-3.5 py-2 rounded-lg text-[0.85rem] font-semibold font-[inherit] border-none cursor-pointer transition-colors bg-white/15 text-white/80 hover:bg-white/25" onClick={() => { setEditing(false); setName((user?.name as string) || '') }}>Hủy</button>
              </div>
            ) : (
              <h1 className="m-0 text-[1.6rem] font-extrabold flex items-center gap-2">
                {(user?.name as string) || 'Unknown'}
                <button className="bg-white/15 border-none cursor-pointer p-1 rounded-md text-white/70 flex items-center transition-colors hover:text-white hover:bg-white/25" onClick={() => setEditing(true)} title="Chỉnh sửa">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </button>
              </h1>
            )}
            <p className="mt-1 text-white/70 text-[0.92rem]">{user?.email as string}</p>
            <div className="flex gap-1.5 mt-2">
              {roles.map((r, i) => <span key={i} className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white uppercase tracking-wide">{roleLabel(r)}</span>)}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[800px] mx-auto px-6 py-6 pb-16">
        {message && <div className="px-4 py-3 rounded-[10px] bg-blue-50 text-primary-500 text-sm font-medium mb-5">{message}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 max-[640px]:grid-cols-1">
          {[
            { icon: '📚', value: enrollmentCount, label: 'Khóa học đang học' },
            { icon: '🏆', value: certificateCount, label: 'Chứng chỉ' },
            { icon: '📅', value: user?.createdAt ? new Date(user.createdAt as string).toLocaleDateString('vi-VN') : '—', label: 'Ngày tham gia' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border-medium rounded-[14px] px-5 py-4 flex items-center gap-3 transition-all hover:border-primary-500 hover:shadow-[0_4px_16px_rgba(0,86,210,0.08)]">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-text-main leading-tight">{s.value}</span>
                <span className="text-[0.78rem] text-text-muted">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="mb-6">
          <h2 className="m-0 mb-4 text-lg font-extrabold">Truy cập nhanh</h2>
          <div className="flex flex-col gap-2.5">
            {[
              { to: '/my-learning', icon: '📚', bg: 'bg-blue-50', title: 'My Learning', sub: 'Tiếp tục khóa học' },
              { to: '/my-certificates', icon: '🏅', bg: 'bg-amber-50', title: 'Chứng chỉ', sub: 'Xem và chia sẻ' },
              { to: '/courses', icon: '🔍', bg: 'bg-emerald-50', title: 'Khám phá', sub: 'Tìm khóa học mới' },
            ].map((lnk) => (
              <Link key={lnk.to} to={lnk.to} className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-border-medium no-underline text-text-main bg-white transition-all hover:border-primary-500 hover:shadow-[0_4px_12px_rgba(0,86,210,0.08)] hover:translate-x-1">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl shrink-0 ${lnk.bg}`}>{lnk.icon}</div>
                <div className="flex-1 flex flex-col"><strong className="text-[0.92rem] font-bold">{lnk.title}</strong><span className="text-[0.78rem] text-text-muted">{lnk.sub}</span></div>
                <span className="text-text-muted text-lg font-semibold">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="bg-white border border-border-medium rounded-[14px] p-5">
          <h2 className="m-0 mb-4 text-lg font-extrabold">Thông tin tài khoản</h2>
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {[
              { label: 'Họ và tên', value: (user?.name as string) || '—' },
              { label: 'Email', value: (user?.email as string) || '—' },
              { label: 'Vai trò', value: roles.map((r) => roleLabel(r)).join(', ') || '—' },
              { label: 'User ID', value: (user?.userId as string) || '—', small: true },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[0.78rem] font-semibold text-text-muted uppercase tracking-wide">{item.label}</span>
                <span className={`text-[0.92rem] font-medium text-text-main ${item.small ? '!text-[0.78rem] !text-text-muted' : ''}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Profile
