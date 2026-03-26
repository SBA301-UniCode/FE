import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { useAuth } from '../contexts/useAuth'
import { subscriptionApi, courseApi, enrollmentApi } from '../api'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)
const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return fmt(n)
}
const toISODate = (d: Date) => d.toISOString().slice(0, 10)

/* ─── Shared styles ─── */
const cardBase = 'bg-white rounded-2xl border border-border-medium shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden'
const cardHeader = 'px-5 py-3.5 border-b border-border-subtle font-bold text-[0.95rem] text-text-main'
const statCard = 'flex flex-col gap-1 p-5 rounded-2xl border border-border-medium shadow-[0_2px_12px_rgba(0,0,0,0.04)] min-w-[160px]'
const statLabel = 'text-[0.78rem] font-semibold text-text-muted uppercase tracking-wider'
const statValue = 'text-2xl font-extrabold text-text-main'
const tableHead = 'text-left text-[0.78rem] font-semibold text-text-muted uppercase tracking-wider py-2.5 px-3'
const tableCell = 'py-2.5 px-3 text-sm text-text-secondary border-t border-border-subtle'
const pillBtn = (active: boolean) => `px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border transition-all cursor-pointer ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-text-muted border-border-medium hover:border-indigo-300 hover:text-indigo-600'}`

interface DaySummary { localDate: string; totalAmount: number; totalPayment: number; success: number; error: number }

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const roles = (user?.roles || []).map((r) => (r as unknown as AnyObj).roleCode || (r as unknown as AnyObj).roleName || '').map(String)
  const isAdmin = roles.some((r) => r.toUpperCase() === 'ADMIN')
  const isInstructor = roles.some((r) => r.toUpperCase() === 'INSTRUCTOR')

  /* ── Admin state ── */
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [totalSuccess, setTotalSuccess] = useState(0)
  const [totalError, setTotalError] = useState(0)
  const [totalPending, setTotalPending] = useState(0)
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([])
  const [totalCourses, setTotalCourses] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [recentTx, setRecentTx] = useState<AnyObj[]>([])
  const [loadingReport, setLoadingReport] = useState(true)

  /* ── Chart period state ── */
  type Period = '7d' | '14d' | '30d' | 'custom'
  const [period, setPeriod] = useState<Period>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  /* ── Instructor state ── */
  const [myCourses, setMyCourses] = useState<AnyObj[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [loadingInstructor, setLoadingInstructor] = useState(true)
  /* ── Instructor revenue state ── */
  const [instrRevenue, setInstrRevenue] = useState(0)
  const [instrTxCount, setInstrTxCount] = useState(0)
  const [instrSuccessCount, setInstrSuccessCount] = useState(0)
  const [instrDaySummaries, setInstrDaySummaries] = useState<DaySummary[]>([])
  const [instrPeriod, setInstrPeriod] = useState<Period>('30d')
  const [instrCustomFrom, setInstrCustomFrom] = useState('')
  const [instrCustomTo, setInstrCustomTo] = useState('')
  const [loadingInstrRevenue, setLoadingInstrRevenue] = useState(false)

  /* ── Build date range from period ── */
  const getDateRange = useCallback((p: Period, cf: string, ct: string) => {
    const now = new Date()
    if (p === '7d') return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: toISODate(now) }
    if (p === '14d') return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13)), to: toISODate(now) }
    if (p === 'custom' && cf && ct) return { from: cf, to: ct }
    // default 30d
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: toISODate(now) }
  }, [])

  /* ── Admin data fetch ── */
  const loadAdminData = useCallback(async (p: Period, cf: string, ct: string) => {
    setLoadingReport(true)
    const { from, to } = getDateRange(p, cf, ct)
    try {
      const [reportRes, coursesRes, txRes] = await Promise.all([
        subscriptionApi.report({ from, to }),
        courseApi.getAll(0, 1),
        subscriptionApi.search({}, 0, 8),
      ])
      const rep = unwrap(reportRes) as AnyObj
      setTotalRevenue(Number(rep?.totalAmount || 0))
      setTotalPayments(Number(rep?.totalPayment || 0))
      setTotalSuccess(Number(rep?.totalSuccess || 0))
      setTotalError(Number(rep?.totalError || 0))
      setTotalPending(Number(rep?.totalPending || 0))
      setDaySummaries(((rep?.data as DaySummary[]) || []))

      const cp = unwrap(coursesRes) as AnyObj
      setTotalCourses(Number(cp?.totalElements || 0))

      try {
        const usersRes = await fetch('/api/v1/users?page=0&size=1', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } })
        if (usersRes.ok) { const ud = await usersRes.json(); setTotalUsers(Number(ud?.data?.totalElements || ud?.totalElements || 0)) }
      } catch { /* ignore */ }

      const txPage = unwrap(txRes) as AnyObj
      const txList = (txPage?.content || txPage?.data || []) as AnyObj[]
      setRecentTx(txList)
    } catch { /* ignore */ }
    setLoadingReport(false)
  }, [getDateRange])

  /* ── Instructor data fetch ── */
  const loadInstructorData = useCallback(async () => {
    setLoadingInstructor(true)
    try {
      const res = await courseApi.getAll(0, 500)
      const page = unwrap(res) as AnyObj
      const all = ((page?.content || []) as AnyObj[])
      // Filter courses where instructorId matches current user
      const mine = all.filter((c) => {
        const iId = String(c.instructorId || '')
        return iId && user && iId === user.userId
      })
      setMyCourses(mine)

      // Count students: fetch enrollments per course (only first 20 to avoid flooding)
      let students = 0
      const batchSize = 5
      for (let i = 0; i < Math.min(mine.length, 20); i += batchSize) {
        const batch = mine.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(c => {
            const cid = (c.courseId || c.id) as string
            if (!cid) return Promise.resolve(null)
            return enrollmentApi.getByCourse(cid, 0, 1)
          })
        )
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) {
            const ep = unwrap(r.value) as AnyObj
            students += Number(ep?.totalElements || 0)
          }
        }
      }
      setTotalStudents(students)
    } catch { /* ignore */ }
    setLoadingInstructor(false)
  }, [user])

  /* ── Instructor revenue fetch ── */
  const loadInstructorRevenue = useCallback(async (courses: AnyObj[], p: Period, cf: string, ct: string) => {
    if (courses.length === 0) return
    setLoadingInstrRevenue(true)
    const { from, to } = getDateRange(p, cf, ct)
    try {
      // Fetch all subscriptions in the date range
      const res = await subscriptionApi.search({ from, to }, 0, 500)
      const page = unwrap(res) as AnyObj
      const all = ((page?.content || []) as AnyObj[])

      // Filter subscriptions that belong to instructor's courses
      // SubcriptionResponse uses 'courseraId' (mapped from course.courseId)
      const courseIds = new Set(courses.map(c => String(c.courseId || c.id || '')))
      const mine = all.filter(tx => {
        const txCourseId = String(tx.courseraId || (tx.courseResponse as AnyObj)?.courseId || tx.courseId || '')
        return courseIds.has(txCourseId)
      })

      // Group by day
      const dayMap = new Map<string, DaySummary>()
      let totalRev = 0, totalTx = 0, totalSuc = 0
      for (const tx of mine) {
        const date = String(tx.createdAt || '').slice(0, 10)
        const amount = Number(tx.subcriptionPrice || tx.amount || 0)
        const status = String(tx.statusPayment || tx.status || '').toUpperCase()
        const isSuccess = status === 'SUCCESS' || status === 'COMPLETED'

        if (!dayMap.has(date)) dayMap.set(date, { localDate: date, totalAmount: 0, totalPayment: 0, success: 0, error: 0 })
        const d = dayMap.get(date)!
        d.totalPayment++
        if (isSuccess) { d.totalAmount += amount; d.success++; totalRev += amount; totalSuc++ }
        else d.error++
        totalTx++
      }

      const sorted = [...dayMap.values()].sort((a, b) => a.localDate.localeCompare(b.localDate))
      setInstrRevenue(totalRev)
      setInstrTxCount(totalTx)
      setInstrSuccessCount(totalSuc)
      setInstrDaySummaries(sorted)
    } catch { /* ignore */ }
    setLoadingInstrRevenue(false)
  }, [getDateRange])

  useEffect(() => {
    if (isAdmin) loadAdminData(period, customFrom, customTo)
    if (isInstructor && !isAdmin) {
      loadInstructorData().then(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isInstructor])

  // Load instructor revenue after myCourses is set
  useEffect(() => {
    if (isInstructor && !isAdmin && myCourses.length > 0) {
      loadInstructorRevenue(myCourses, instrPeriod, instrCustomFrom, instrCustomTo)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCourses])

  /* ── Period change handler ── */
  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (p !== 'custom') loadAdminData(p, customFrom, customTo)
  }
  const handleCustomApply = () => {
    if (customFrom && customTo) loadAdminData('custom', customFrom, customTo)
  }

  /* ── Chart helpers ── */
  const maxDayAmount = Math.max(1, ...daySummaries.map((d) => d.totalAmount))
  // Y-axis: 5 ticks from 0 to maxDayAmount
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxDayAmount * p))

  /* ── Status badge ── */
  const statusBadge = (s: string) => {
    const upper = String(s || '').toUpperCase()
    if (upper === 'SUCCESS' || upper === 'COMPLETED') return <span className="inline-block text-[0.72rem] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-green-600">{t('dashboard.statusSuccess')}</span>
    if (upper === 'ERROR' || upper === 'FAILED') return <span className="inline-block text-[0.72rem] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600">{t('dashboard.statusFailed')}</span>
    return <span className="inline-block text-[0.72rem] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">{t('dashboard.statusPending')}</span>
  }

  /* ═══════ ADMIN DASHBOARD ═══════ */
  if (isAdmin) return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <div className="bg-[linear-gradient(135deg,#312e81_0%,#4338ca_50%,#6366f1_100%)] px-6 py-8 text-white">
        <div className="w-full mx-auto">
          <h1 className="m-0 text-2xl font-extrabold">{t('dashboard.adminTitle')}</h1>
          <p className="mt-1 mb-0 text-white/70 text-sm">{t('dashboard.adminSubtitle')}</p>
        </div>
      </div>

      <main className="w-full mx-auto px-6 py-6 pb-16">
        {loadingReport ? <div className="text-center py-12 text-text-muted">{t('dashboard.loading')}</div> : <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <span className={statLabel}>{t('dashboard.revenue')}</span>
              <span className={`${statValue} !text-green-700`}>{fmtMoney(totalRevenue)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
              <span className={statLabel}>{t('dashboard.transactions')}</span>
              <span className={`${statValue} !text-blue-700`}>{fmt(totalPayments)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <span className={statLabel}>{t('dashboard.success')}</span>
              <span className={`${statValue} !text-green-700`}>{fmt(totalSuccess)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)' }}>
              <span className={statLabel}>{t('dashboard.failed')}</span>
              <span className={`${statValue} !text-red-600`}>{fmt(totalError)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)' }}>
              <span className={statLabel}>{t('dashboard.pending')}</span>
              <span className={`${statValue} !text-amber-600`}>{fmt(totalPending)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)' }}>
              <span className={statLabel}>{t('dashboard.coursesLabel')}</span>
              <span className={`${statValue} !text-violet-700`}>{fmt(totalCourses)}</span>
            </div>
          </div>

          {/* Revenue chart */}
          <div className={`${cardBase} mb-6`}>
            <div className={`${cardHeader} flex items-center justify-between flex-wrap gap-2`}>
              <span>{t('dashboard.revenueChart')}</span>
              {/* Period selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button className={pillBtn(period === '7d')} onClick={() => handlePeriodChange('7d')}>{t('dashboard.period7d')}</button>
                <button className={pillBtn(period === '14d')} onClick={() => handlePeriodChange('14d')}>{t('dashboard.period14d')}</button>
                <button className={pillBtn(period === '30d')} onClick={() => handlePeriodChange('30d')}>{t('dashboard.period30d')}</button>
                <button className={pillBtn(period === 'custom')} onClick={() => setPeriod('custom')}>{t('dashboard.periodCustom')}</button>
              </div>
            </div>

            {/* Custom date range */}
            {period === 'custom' && (
              <div className="px-5 pt-3 flex items-center gap-2 flex-wrap">
                <label className="text-[0.78rem] text-text-muted font-semibold">{t('dashboard.from')}</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg border border-border-medium text-sm" />
                <label className="text-[0.78rem] text-text-muted font-semibold">{t('dashboard.to')}</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-2 py-1 rounded-lg border border-border-medium text-sm" />
                <button onClick={handleCustomApply} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[0.78rem] font-semibold border-0 cursor-pointer hover:bg-indigo-700 transition-colors">{t('dashboard.apply')}</button>
              </div>
            )}

            <div className="px-5 py-4">
              {daySummaries.length === 0 ? <p className="text-text-muted text-sm text-center py-8">{t('dashboard.noData')}</p> : (
                <div className="flex">
                  {/* Y-axis labels */}
                  <div className="flex flex-col-reverse justify-between h-[220px] pr-2 py-1" style={{ minWidth: '52px' }}>
                    {yTicks.map((v, i) => (
                      <span key={i} className="text-[0.65rem] text-text-muted font-semibold text-right leading-none">{fmtShort(v)}</span>
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="flex-1 flex flex-col">
                    <div className="relative flex items-end gap-[2px] h-[220px] border-l border-b border-border-subtle pl-1">
                      {/* Horizontal grid lines */}
                      {[0.25, 0.5, 0.75, 1].map((p, i) => (
                        <div key={i} className="absolute left-0 right-0 border-t border-dashed border-border-subtle/50" style={{ bottom: `${p * 100}%` }} />
                      ))}

                      {daySummaries.map((d, i) => {
                        const pct = maxDayAmount > 0 ? (d.totalAmount / maxDayAmount) * 100 : 0
                        const barPct = Math.max(pct > 0 ? 2 : 0, pct)
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0 relative group" style={{ zIndex: 1 }}>
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-[0.68rem] px-2 py-1 rounded-md whitespace-nowrap shadow-lg z-10">
                              <div className="font-bold">{String(d.localDate || '').slice(5)}</div>
                              <div>{fmtMoney(d.totalAmount)}</div>
                              <div>{d.totalPayment} {t('dashboard.transactions').toLowerCase()}</div>
                            </div>
                            <div
                              className="w-full rounded-t-[3px] transition-all duration-300 hover:opacity-80 cursor-pointer"
                              style={{
                                height: `${barPct}%`,
                                minHeight: d.totalAmount > 0 ? '4px' : '0px',
                                background: d.totalAmount > 0 ? 'linear-gradient(180deg, #6366f1, #a5b4fc)' : 'transparent',
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>

                    {/* X-axis labels */}
                    <div className="flex gap-[2px] pl-1 mt-1">
                      {daySummaries.map((d, i) => (
                        <div key={i} className="flex-1 min-w-0 text-center">
                          <span className="text-[0.58rem] text-text-muted truncate block">
                            {/* Show label every few bars to avoid clutter */}
                            {daySummaries.length <= 14 || i % Math.ceil(daySummaries.length / 15) === 0 ? String(d.localDate || '').slice(5) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Users + Success rate + Recent tx */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 mb-6">
            <div className="flex flex-col gap-4">
              <div className={statCard} style={{ background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' }}>
                <span className={statLabel}>{t('dashboard.totalUsers')}</span>
                <span className={`${statValue} !text-slate-700`}>{fmt(totalUsers)}</span>
              </div>
              <div className={statCard} style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
                <span className={statLabel}>{t('dashboard.successRate')}</span>
                <span className={`${statValue} !text-blue-700`}>{totalPayments > 0 ? Math.round((totalSuccess / totalPayments) * 100) : 0}%</span>
              </div>
            </div>

            {/* Recent transactions table */}
            <div className={cardBase}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <span>{t('dashboard.recentTx')}</span>
                <Link to="/admin" className="text-[0.78rem] text-primary-500 font-semibold no-underline hover:underline">{t('dashboard.viewAll')}</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-bg-deep">
                    <th className={tableHead}>{t('dashboard.txId')}</th>
                    <th className={tableHead}>{t('dashboard.txDate')}</th>
                    <th className={tableHead}>{t('dashboard.txAmount')}</th>
                    <th className={tableHead}>{t('dashboard.txStatus')}</th>
                  </tr></thead>
                  <tbody>
                    {recentTx.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-text-muted text-sm">{t('dashboard.noTx')}</td></tr> : recentTx.map((tx, i) => (
                      <tr key={i} className="hover:bg-bg-deep/50 transition-colors">
                        <td className={`${tableCell} font-mono text-[0.78rem]`}>{String(tx.subcriptionId || tx.id || '').slice(0, 8)}...</td>
                        <td className={tableCell}>{String(tx.createdAt || '').slice(0, 10)}</td>
                        <td className={`${tableCell} font-bold`}>{fmtMoney(Number(tx.subcriptionPrice || tx.amount || 0))}</td>
                        <td className={tableCell}>{statusBadge(String(tx.statusPayment || tx.status || ''))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>}
      </main>
      <Footer />
    </div>
  )

  /* ═══════ INSTRUCTOR DASHBOARD ═══════ */
  if (isInstructor) return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <div className="bg-[linear-gradient(135deg,#065f46_0%,#047857_50%,#10b981_100%)] px-6 py-8 text-white">
        <div className="w-full mx-auto">
          <h1 className="m-0 text-2xl font-extrabold">{t('dashboard.instructorTitle')}</h1>
          <p className="mt-1 mb-0 text-white/70 text-sm">{t('dashboard.instructorSubtitle')}</p>
        </div>
      </div>

      <main className="w-full mx-auto px-6 py-6 pb-16">
        {loadingInstructor ? <div className="text-center py-12 text-text-muted">{t('dashboard.loading')}</div> : <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <span className={statLabel}>{t('dashboard.myCourses')}</span>
              <span className={`${statValue} !text-green-700`}>{fmt(myCourses.length)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
              <span className={statLabel}>{t('dashboard.totalStudents')}</span>
              <span className={`${statValue} !text-blue-700`}>{fmt(totalStudents)}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)' }}>
              <span className={statLabel}>{t('dashboard.avgPerCourse')}</span>
              <span className={`${statValue} !text-amber-700`}>{myCourses.length > 0 ? fmt(Math.round(totalStudents / myCourses.length)) : '0'}</span>
            </div>
            <div className={statCard} style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)' }}>
              <span className={statLabel}>{t('dashboard.instrRevenue')}</span>
              <span className={`${statValue} !text-violet-700`}>{fmtMoney(instrRevenue)}</span>
            </div>
          </div>

          {/* ── Instructor Revenue Chart ── */}
          <div className={`${cardBase} mb-6`}>
            <div className={`${cardHeader} flex items-center justify-between flex-wrap gap-2`}>
              <span>{t('dashboard.instrRevenueChart')}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button className={pillBtn(instrPeriod === '7d')} onClick={() => { setInstrPeriod('7d'); loadInstructorRevenue(myCourses, '7d', instrCustomFrom, instrCustomTo) }}>{t('dashboard.period7d')}</button>
                <button className={pillBtn(instrPeriod === '14d')} onClick={() => { setInstrPeriod('14d'); loadInstructorRevenue(myCourses, '14d', instrCustomFrom, instrCustomTo) }}>{t('dashboard.period14d')}</button>
                <button className={pillBtn(instrPeriod === '30d')} onClick={() => { setInstrPeriod('30d'); loadInstructorRevenue(myCourses, '30d', instrCustomFrom, instrCustomTo) }}>{t('dashboard.period30d')}</button>
                <button className={pillBtn(instrPeriod === 'custom')} onClick={() => setInstrPeriod('custom')}>{t('dashboard.periodCustom')}</button>
              </div>
            </div>

            {instrPeriod === 'custom' && (
              <div className="px-5 pt-3 flex items-center gap-2 flex-wrap">
                <label className="text-[0.78rem] text-text-muted font-semibold">{t('dashboard.from')}</label>
                <input type="date" value={instrCustomFrom} onChange={(e) => setInstrCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg border border-border-medium text-sm" />
                <label className="text-[0.78rem] text-text-muted font-semibold">{t('dashboard.to')}</label>
                <input type="date" value={instrCustomTo} onChange={(e) => setInstrCustomTo(e.target.value)} className="px-2 py-1 rounded-lg border border-border-medium text-sm" />
                <button onClick={() => { if (instrCustomFrom && instrCustomTo) loadInstructorRevenue(myCourses, 'custom', instrCustomFrom, instrCustomTo) }} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[0.78rem] font-semibold border-0 cursor-pointer hover:bg-indigo-700 transition-colors">{t('dashboard.apply')}</button>
              </div>
            )}

            <div className="px-5 py-4">
              {loadingInstrRevenue ? <p className="text-text-muted text-sm text-center py-8">{t('dashboard.loading')}</p>
              : instrDaySummaries.length === 0 ? <p className="text-text-muted text-sm text-center py-8">{t('dashboard.noData')}</p>
              : (() => {
                  const maxAmt = Math.max(1, ...instrDaySummaries.map(d => d.totalAmount))
                  const yT = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxAmt * p))
                  return (
                    <div className="flex">
                      <div className="flex flex-col-reverse justify-between h-[220px] pr-2 py-1" style={{ minWidth: '52px' }}>
                        {yT.map((v, i) => <span key={i} className="text-[0.65rem] text-text-muted font-semibold text-right leading-none">{fmtShort(v)}</span>)}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="relative flex items-end gap-[2px] h-[220px] border-l border-b border-border-subtle pl-1">
                          {[0.25, 0.5, 0.75, 1].map((p, i) => <div key={i} className="absolute left-0 right-0 border-t border-dashed border-border-subtle/50" style={{ bottom: `${p * 100}%` }} />)}
                          {instrDaySummaries.map((d, i) => {
                            const pct = maxAmt > 0 ? (d.totalAmount / maxAmt) * 100 : 0
                            const barPct = Math.max(pct > 0 ? 2 : 0, pct)
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0 relative group" style={{ zIndex: 1 }}>
                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-[0.68rem] px-2 py-1 rounded-md whitespace-nowrap shadow-lg z-10">
                                  <div className="font-bold">{String(d.localDate || '').slice(5)}</div>
                                  <div>{fmtMoney(d.totalAmount)}</div>
                                  <div>{d.totalPayment} {t('dashboard.transactions').toLowerCase()}</div>
                                </div>
                                <div className="w-full rounded-t-[3px] transition-all duration-300 hover:opacity-80 cursor-pointer" style={{ height: `${barPct}%`, minHeight: d.totalAmount > 0 ? '4px' : '0px', background: d.totalAmount > 0 ? 'linear-gradient(180deg, #059669, #6ee7b7)' : 'transparent' }} />
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex gap-[2px] pl-1 mt-1">
                          {instrDaySummaries.map((d, i) => (
                            <div key={i} className="flex-1 min-w-0 text-center">
                              <span className="text-[0.58rem] text-text-muted truncate block">
                                {instrDaySummaries.length <= 14 || i % Math.ceil(instrDaySummaries.length / 15) === 0 ? String(d.localDate || '').slice(5) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}
            </div>

            {/* Revenue summary row */}
            <div className="px-5 pb-4 grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-[0.72rem] text-text-muted font-semibold uppercase">{t('dashboard.transactions')}</div>
                <div className="text-lg font-extrabold text-text-main">{fmt(instrTxCount)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.72rem] text-text-muted font-semibold uppercase">{t('dashboard.success')}</div>
                <div className="text-lg font-extrabold text-green-600">{fmt(instrSuccessCount)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.72rem] text-text-muted font-semibold uppercase">{t('dashboard.successRate')}</div>
                <div className="text-lg font-extrabold text-blue-600">{instrTxCount > 0 ? Math.round((instrSuccessCount / instrTxCount) * 100) : 0}%</div>
              </div>
            </div>
          </div>

          <div className={cardBase}>
            <div className={`${cardHeader} flex items-center justify-between`}>
              <span>{t('dashboard.courseTable')}</span>
              <Link to="/my-courses" className="text-[0.78rem] text-primary-500 font-semibold no-underline hover:underline">{t('dashboard.manageCourses')}</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr className="bg-bg-deep">
                  <th className={tableHead}>{t('dashboard.courseName')}</th>
                  <th className={tableHead}>{t('dashboard.price')}</th>
                  <th className={tableHead}>{t('dashboard.actions')}</th>
                </tr></thead>
                <tbody>
                  {myCourses.length === 0 ? <tr><td colSpan={3} className="text-center py-6 text-text-muted text-sm">{t('dashboard.noCourses')}</td></tr> : myCourses.map((c, i) => (
                    <tr key={i} className="hover:bg-bg-deep/50 transition-colors">
                      <td className={`${tableCell} font-semibold text-text-main max-w-[300px] truncate`}>{String(c.courseName || c.title || '')}</td>
                      <td className={`${tableCell} font-bold`}>{c.isFree ? <span className="text-green-600">{t('dashboard.free')}</span> : fmtMoney(Number(c.price || 0))}</td>
                      <td className={tableCell}><Link to={`/my-courses/${c.courseId || c.id}/videos`} className="text-primary-500 text-[0.82rem] font-semibold no-underline hover:underline">{t('dashboard.manage')}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}
      </main>
      <Footer />
    </div>
  )

  return null
}
