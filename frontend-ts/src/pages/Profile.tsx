import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { userApi, enrollmentApi, certificateApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'
import type { Role } from '../types'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }

const Profile = () => {
  const { user: _authUser } = useAuth()
  void _authUser
  const { t } = useTranslation()
  const [user, setUser] = useState<AnyObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalCourses, setTotalCourses] = useState(0)
  const [inProgressCourses, setInProgressCourses] = useState(0)
  const [completedCourses, setCompletedCourses] = useState(0)
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
        try { 
          let inProg = 0, comp = 0, notStart = 0;
          try { const r = unwrap(await enrollmentApi.getMyLearning('IN_PROGRESS', 0, 1)) as AnyObj; inProg = (r?.totalElements as number) ?? (r?.content as unknown[])?.length ?? 0; } catch {}
          try { const r = unwrap(await enrollmentApi.getMyLearning('COMPLETED', 0, 1)) as AnyObj; comp = (r?.totalElements as number) ?? (r?.content as unknown[])?.length ?? 0; } catch {}
          try { const r = unwrap(await enrollmentApi.getMyLearning('NOT_STARTED', 0, 1)) as AnyObj; notStart = (r?.totalElements as number) ?? (r?.content as unknown[])?.length ?? 0; } catch {}
          setInProgressCourses(inProg); setCompletedCourses(comp); setTotalCourses(inProg + comp + notStart);
        } catch { /* ignore */ }
        try { const cr = unwrap(await certificateApi.getMyList()); setCertificateCount(Array.isArray(cr) ? cr.length : ((cr as AnyObj)?.content as unknown[])?.length ?? 0) } catch { /* ignore */ }
      } catch { setMessage(t('profile.loadError')) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return setMessage(t('profile.nameEmpty'))
    setSaving(true); setMessage('')
    try { const u = unwrap(await userApi.update((user as AnyObj).userId as string, { name: name.trim() })) as AnyObj; setUser(u); setEditing(false); setMessage(t('profile.updateSuccess')) }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; setMessage(err?.response?.data?.message || t('profile.updateFailed')) }
    finally { setSaving(false) }
  }

  const roleLabel = (r: Role | AnyObj) => {
    const code = (r as AnyObj)?.roleCode as string
    const map: Record<string, string> = { ADMIN: t('profile.roleAdmin'), INSTRUCTOR: t('profile.roleInstructor'), LEARNER: t('profile.roleLearner') }
    return map[code] || code || 'User'
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />
      <main className="max-w-[800px] mx-auto px-6 py-20 text-center text-text-muted">{t('profile.loading')}</main>
    </div>
  )

  const roles = (user?.roles as AnyObj[]) || []

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col font-inter">
      <Header />

      {/* Modern Aesthetic Cover */}
      <div className="relative bg-[linear-gradient(135deg,#0a0f25_0%,#1a2a5c_50%,#0056D2_100%)] px-6 py-16 text-white overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-400 opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-[850px] mx-auto flex items-center gap-8 max-[640px]:flex-col max-[640px]:text-center relative z-10">
          <div className="shrink-0">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-[linear-gradient(135deg,var(--color-primary-400),var(--color-primary-700))] flex items-center justify-center border-[4px] border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.4)] max-[640px]:w-24 max-[640px]:h-24 transition-transform hover:scale-105 duration-300">
              {(user?.avatarUrl as string) ? (
                <img src={user!.avatarUrl as string} alt={(user?.name as string) || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[3rem] font-black drop-shadow-md">{((user?.name as string) || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {editing ? (
              <div className="flex items-center gap-3">
                <input type="text" className="flex-1 px-4 py-2.5 border border-white/40 rounded-xl text-lg font-bold outline-none bg-white/10 text-white placeholder-white/50 focus:bg-white/20 focus:border-white focus:shadow-[0_0_0_4px_rgba(255,255,255,0.15)] transition-all" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
                <button className="px-5 py-2.5 rounded-xl text-[0.95rem] font-bold border-none cursor-pointer transition-all bg-white text-primary-600 hover:bg-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-px" onClick={handleSave} disabled={saving}>{saving ? t('profile.saving') : t('profile.save')}</button>
                <button className="px-5 py-2.5 rounded-xl text-[0.95rem] font-bold border-none cursor-pointer transition-all bg-white/10 text-white/90 hover:bg-white/20 hover:text-white" onClick={() => { setEditing(false); setName((user?.name as string) || '') }}>{t('profile.cancel')}</button>
              </div>
            ) : (
              <div className="flex items-center gap-4 max-[640px]:justify-center">
                <h1 className="m-0 text-[2rem] font-black tracking-tight drop-shadow-md">
                  {(user?.name as string) || 'Unknown'}
                </h1>
                <button className="bg-white/10 border-none cursor-pointer p-2 rounded-xl text-white/80 transition-all hover:text-white hover:bg-white/25 hover:shadow-lg" onClick={() => setEditing(true)} title={t('profile.editName')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2 max-[640px]:justify-center">
              <div className="flex items-center gap-2 text-white/80 text-[1rem]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                {user?.email as string}
              </div>
              <div className="flex items-center gap-2 text-white/80 text-[1rem]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {user?.createdAt ? new Date(user.createdAt as string).toLocaleDateString('vi-VN') : '—'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 max-[640px]:justify-center">
              {roles.map((r, i) => <span key={i} className="text-[0.75rem] font-extrabold px-3 py-1 rounded-[8px] bg-indigo-500/40 border border-indigo-400/30 text-indigo-50 uppercase tracking-widest shadow-sm backdrop-blur-md">{roleLabel(r)}</span>)}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-6 py-10 pb-20 w-full relative -mt-8 z-20">
        {message && <div className="px-5 py-4 rounded-xl bg-blue-50 border border-blue-200 text-primary-600 text-[0.95rem] font-bold mb-8 shadow-sm flex items-center gap-3"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>{message}</div>}

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-2 gap-6 mb-10 max-[640px]:grid-cols-1">
          {[
            { value: totalCourses, label: t('profile.totalCourses', 'Tổng khóa học') },
            { value: inProgressCourses, label: t('profile.coursesInProgress', 'Đang học') },
            { value: completedCourses, label: t('profile.coursesCompleted', 'Hoàn thành') },
            { value: certificateCount, label: t('profile.certificates', 'Chứng chỉ') },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border-medium rounded-[24px] p-8 flex flex-col justify-center items-center text-center gap-2 transition-all duration-300 min-h-[140px] hover:border-primary-400 hover:shadow-[0_8px_28px_rgba(0,86,210,0.12)] hover:-translate-y-1 w-full">
              <span className="text-[2.5rem] font-black text-text-main leading-none">{s.value}</span>
              <span className="text-[0.85rem] font-bold text-text-muted uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-8 max-[850px]:grid-cols-1 items-stretch">
          {/* Quick Links / Navigation */}
          <div className="flex flex-col gap-6">
            <h2 className="m-0 text-xl font-black text-text-main pl-1 border-l-4 border-primary-500 rounded-sm leading-none">{t('profile.quickLinks')}</h2>
            <div className="flex flex-col gap-4">
              {[
                { to: '/my-learning', title: t('profile.myLearning'), sub: t('profile.myLearningDesc'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, bg: 'bg-indigo-50 text-indigo-600' },
                { to: '/my-certificates', title: t('profile.certsLink'), sub: t('profile.certsLinkDesc'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l-3 3v4l3-3 3 3v-4l-3-3z"/><circle cx="12" cy="8" r="5"/></svg>, bg: 'bg-emerald-50 text-emerald-600' },
                { to: '/courses', title: t('profile.explore'), sub: t('profile.exploreDesc'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>, bg: 'bg-amber-50 text-amber-600' },
              ].map((lnk) => (
                <Link key={lnk.to} to={lnk.to} className="group flex items-center gap-5 p-5 rounded-[20px] border border-border-medium no-underline text-text-main bg-white transition-all duration-300 hover:border-primary-400 hover:shadow-[0_8px_24px_rgba(0,86,210,0.12)] hover:-translate-y-1">
                  <div className={`w-[48px] h-[48px] shrink-0 rounded-[14px] flex items-center justify-center ${lnk.bg} transition-transform group-hover:scale-110 duration-300`}>
                    {lnk.icon}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <strong className="text-[1.05rem] font-bold text-text-main group-hover:text-primary-600 transition-colors">{lnk.title}</strong>
                    <span className="text-[0.85rem] text-text-muted mt-1 leading-relaxed">{lnk.sub}</span>
                  </div>
                  <div className="w-9 h-9 shrink-0 rounded-full bg-bg-deep flex items-center justify-center text-text-muted group-hover:bg-primary-50 group-hover:text-primary-600 transition-all duration-300">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Detailed Account Info */}
          <div className="flex flex-col gap-6">
            <h2 className="m-0 text-xl font-black text-text-main pl-1 border-l-4 border-indigo-400 rounded-sm leading-none">{t('profile.accountInfo')}</h2>
            <div className="bg-white border border-border-medium rounded-[20px] p-6 shadow-sm flex-1">
              <div className="flex flex-col gap-5">
                {[
                  { label: t('profile.fullName'), value: (user?.name as string) || '—', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                  { label: t('profile.email'), value: (user?.email as string) || '—', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> },
                  { label: t('profile.role'), value: roles.map((r) => roleLabel(r)).join(', ') || '—', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg> },
                  { label: t('profile.joinDate', 'Ngày tham gia'), value: user?.createdAt ? new Date(user.createdAt as string).toLocaleDateString('vi-VN') : '—', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                ].map((item, idx) => (
                  <div key={item.label} className={`flex flex-col gap-1.5 ${idx !== 0 ? 'pt-4 border-t border-border-subtle' : ''}`}>
                    <div className="flex items-center gap-2 text-text-muted">
                      {item.icon}
                      <span className="text-[0.75rem] font-bold uppercase tracking-wider">{item.label}</span>
                    </div>
                    <span className="text-[0.95rem] font-semibold text-text-main">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}

export default Profile
