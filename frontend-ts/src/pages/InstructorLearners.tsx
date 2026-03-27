import { useEffect, useMemo, useState } from 'react'
import Header from '../components/layout/Header'
import { courseApi, enrollmentApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const extractList = (p: unknown): AnyObj[] => {
  if (Array.isArray(p)) return p as AnyObj[]
  const o = p as AnyObj
  for (const k of ['content', 'items', 'results', 'data']) if (Array.isArray(o?.[k])) return o[k] as AnyObj[]
  return []
}
const extractPage = (p: unknown) => {
  const o = p as AnyObj
  const content = extractList(o)
  const totalElements = Number(o?.totalElements ?? o?.total ?? o?.totalCount ?? content.length) || content.length
  const totalPages = Number(o?.totalPages ?? (totalElements ? Math.ceil(totalElements / (Number(o?.size) || 10)) : 1)) || 1
  return { content, totalElements, totalPages }
}

const getCourseId = (c: AnyObj) => (c?.courseId || c?.id || c?._id) as string
const getCourseTitle = (c: AnyObj) => (c?.title || c?.courseName || c?.name || 'Untitled') as string
const getCourseLevel = (c: AnyObj) => (c?.level || c?.courseLevel || '') as string

const getUserId = (u: AnyObj) => (u?.userId || u?.id) as string
const getEmail = (u: AnyObj) => (u?.email || '') as string
const getName = (u: AnyObj) => (u?.fullName || u?.name || u?.username || '') as string

const InstructorLearners = () => {
  const { user } = useAuth()
  const { t } = useTranslation()

  const myUserId = ((user as AnyObj | null)?.userId || (user as AnyObj | null)?.id || '') as string

  const [courseLoading, setCourseLoading] = useState(true)
  const [courseError, setCourseError] = useState('')
  const [coursePage, setCoursePage] = useState(0)
  const courseSize = 4
  const [courseTotalPages, setCourseTotalPages] = useState(1)
  const [allCourses, setAllCourses] = useState<AnyObj[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const [learnerLoading, setLearnerLoading] = useState(false)
  const [learnerError, setLearnerError] = useState('')
  const [learnerPage, setLearnerPage] = useState(0)
  const learnerSize = 10
  const [learnerTotalPages, setLearnerTotalPages] = useState(1)
  const [keysearch, setKeysearch] = useState('')
  const [bannedOnly, setBannedOnly] = useState(false)
  const [rows, setRows] = useState<AnyObj[]>([])
  const [bannedByUser, setBannedByUser] = useState<Record<string, boolean>>({})
  const [actingUserId, setActingUserId] = useState('')

  const myCourses = useMemo(() => {
    const list = allCourses
    if (!myUserId) return list
    return list.filter((c) => {
      const ins = (c?.instructorId || (c?.instructorResponse as AnyObj | undefined)?.userId || (c?.instructor as AnyObj | undefined)?.userId) as string
      return !ins || ins === myUserId
    })
  }, [allCourses, myUserId])

  const courseTotal = myCourses.length
  const computedTotalPages = Math.max(1, Math.ceil(courseTotal / courseSize))
  const courses = useMemo(() => myCourses.slice(coursePage * courseSize, (coursePage + 1) * courseSize), [myCourses, coursePage, courseSize])
  const selectedCourse = useMemo(() => myCourses.find((c) => getCourseId(c) === selectedCourseId) || null, [myCourses, selectedCourseId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setCourseLoading(true); setCourseError('')
      try {
        const res = await courseApi.getAll(0, 500)
        const data = unwrap(res)
        const page = extractPage(data)
        const list = page.content
        if (!cancelled) {
          setAllCourses(list)
          setCourseTotalPages(Math.max(1, Math.ceil(list.length / courseSize)))
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string; errorCode?: string } }; message?: string }
        if (!cancelled) setCourseError(err.response?.data?.message || err.response?.data?.errorCode || err.message || 'Error')
      } finally {
        if (!cancelled) setCourseLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, []) // load once

  useEffect(() => {
    setCourseTotalPages(computedTotalPages)
    if (coursePage > computedTotalPages - 1) setCoursePage(0)
  }, [computedTotalPages, coursePage])

  useEffect(() => {
    if (!selectedCourseId && myCourses[0]) setSelectedCourseId(getCourseId(myCourses[0]) || '')
  }, [selectedCourseId, myCourses])

  const loadLearners = async (opts?: { keepPage?: boolean }) => {
    if (!selectedCourseId) return
    setLearnerLoading(true); setLearnerError('')
    try {
      const page = opts?.keepPage ? learnerPage : 0
      const res = await enrollmentApi.reportLearnersByCourse(selectedCourseId, { keysearch: keysearch.trim() || undefined, banned: bannedOnly || undefined, page, size: learnerSize })
      const data = unwrap(res)
      const pg = extractPage(data)
      setRows(pg.content)
      setLearnerTotalPages(pg.totalPages || 1)
      if (!opts?.keepPage) setLearnerPage(0)

      // Populate banned map for current page (only needed when not filtering bannedOnly)
      if (!bannedOnly && myUserId) {
        const next: Record<string, boolean> = { ...bannedByUser }
        await Promise.all(pg.content.map(async (r) => {
          const u = (r?.userResponse || r?.user || {}) as AnyObj
          const uid = getUserId(u)
          if (!uid || next[uid] !== undefined) return
          try {
            const rr = await enrollmentApi.isBanned({ userId: uid, coureId: selectedCourseId })
            const v = unwrap(rr)
            next[uid] = v === true || v === 'true'
          } catch {
            next[uid] = false
          }
        }))
        setBannedByUser(next)
      }
      if (bannedOnly) {
        const next: Record<string, boolean> = { ...bannedByUser }
        for (const r of pg.content) {
          const u = (r?.userResponse || r?.user || {}) as AnyObj
          const uid = getUserId(u)
          if (uid) next[uid] = true
        }
        setBannedByUser(next)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errorCode?: string } }; message?: string }
      setLearnerError(err.response?.data?.message || err.response?.data?.errorCode || err.message || 'Error')
    } finally {
      setLearnerLoading(false)
    }
  }

  useEffect(() => { void loadLearners() }, [selectedCourseId, bannedOnly])
  useEffect(() => { void loadLearners({ keepPage: true }) }, [learnerPage])

  const handleBanToggle = async (targetUserId: string, toBanned: boolean) => {
    if (!selectedCourseId || !targetUserId || actingUserId) return
    setActingUserId(targetUserId)
    try {
      if (toBanned) await enrollmentApi.banLearner({ userId: targetUserId, coureId: selectedCourseId })
      else await enrollmentApi.openBanLearner({ userId: targetUserId, coureId: selectedCourseId })
      setBannedByUser((p) => ({ ...p, [targetUserId]: toBanned }))
      toast.success(toBanned ? t('instructorLearners.toastBanned') : t('instructorLearners.toastUnbanned'))
      await loadLearners({ keepPage: true })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || t('instructorLearners.toastActionFailed'))
    } finally {
      setActingUserId('')
    }
  }

  const btnP = 'px-3 py-2 rounded-xl border border-border-medium bg-white font-bold text-sm cursor-pointer hover:bg-bg-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
  const btnB = 'px-3 py-2 rounded-xl border-none bg-red-600 text-white font-bold text-sm cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
  const btnU = 'px-3 py-2 rounded-xl border-none bg-emerald-600 text-white font-bold text-sm cursor-pointer hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />

      <div className="bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_52%,#2dd4bf_100%)] px-6 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
        <div className="w-full mx-auto">
          <h1 className="m-0 text-[1.42rem] font-extrabold tracking-tight">{t('instructorLearners.title')}</h1>
          <p className="mt-1 mb-0 text-white/80 text-[0.88rem]">{t('instructorLearners.subtitle')}</p>
        </div>
      </div>

      <main className="w-full mx-auto px-6 py-4 pb-16">

        {/* Courses */}
        <section className="bg-white border border-border-medium rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="m-0 text-base font-extrabold">{t('instructorLearners.yourCourses')}</h2>
            <div className="flex items-center gap-2">
              <button type="button" className={btnP} onClick={() => setCoursePage((p) => Math.max(0, p - 1))} disabled={courseLoading || coursePage <= 0}>←</button>
              <span className="text-sm text-text-secondary font-semibold">{coursePage + 1}/{courseTotalPages}</span>
              <button type="button" className={btnP} onClick={() => setCoursePage((p) => Math.min(courseTotalPages - 1, p + 1))} disabled={courseLoading || coursePage >= courseTotalPages - 1}>→</button>
            </div>
          </div>
          {courseLoading && <div className="mt-3 text-sm text-text-muted">{t('common.loading', 'Loading...')}</div>}
          {!courseLoading && courseError && <div className="mt-3 text-sm text-red-600">{courseError}</div>}
          {!courseLoading && !courseError && courses.length === 0 && <div className="mt-3 text-sm text-text-muted">{t('instructorLearners.noCourses')}</div>}

          {!courseLoading && !courseError && courses.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {courses.map((c) => {
                const id = getCourseId(c)
                const active = id && id === selectedCourseId
                return (
                  <button
                    key={id || getCourseTitle(c)}
                    type="button"
                    className={`text-left w-full rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-px ${
                      active ? 'border-primary-500 shadow-[0_8px_22px_rgba(0,86,210,0.12)]' : 'border-border-medium bg-white hover:border-primary-500/60'
                    }`}
                    onClick={() => { const cid = getCourseId(c) || ''; setSelectedCourseId(cid); setLearnerPage(0) }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-[1rem] leading-snug line-clamp-2">{getCourseTitle(c)}</div>
                        <div className="mt-1 text-[0.82rem] text-text-muted">{getCourseLevel(c) ? t('instructorLearners.levelLabel', { level: getCourseLevel(c) }) : ''}</div>
                      </div>
                      {active && <span className="shrink-0 text-[0.72rem] font-extrabold text-primary-600 bg-primary-500/10 px-2 py-1 rounded-full">{t('instructorLearners.selected')}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Learners */}
        <section className="bg-white border border-border-medium rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="m-0 text-base font-extrabold">{t('instructorLearners.learners')}</h2>
              <p className="mt-1 text-sm text-text-secondary">{selectedCourse ? t('instructorLearners.coursePrefix', { title: getCourseTitle(selectedCourse) }) : t('instructorLearners.noCourseSelected')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-border-medium rounded-xl px-3 py-2">
                <span className="text-text-muted">🔎</span>
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-sm min-w-[220px]"
                  placeholder={t('instructorLearners.searchPlaceholder')}
                  value={keysearch}
                  onChange={(e) => setKeysearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void loadLearners() }}
                />
                {keysearch && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer" onClick={() => { setKeysearch(''); void loadLearners() }}>✕</button>}
              </div>
              <button type="button" className={`${btnP} ${bannedOnly ? 'shadow-[inset_0_-2px_0_0_#0056D2] text-primary-600' : ''}`} onClick={() => { setBannedOnly((p) => !p); setLearnerPage(0) }}>{t('instructorLearners.bannedOnly')}</button>
              <button type="button" className={btnP} onClick={() => void loadLearners()} disabled={learnerLoading || !selectedCourseId}>{t('instructorLearners.reload')}</button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" className={btnP} onClick={() => setLearnerPage((p) => Math.max(0, p - 1))} disabled={learnerLoading || learnerPage <= 0}>←</button>
            <span className="text-sm text-text-secondary font-semibold">{learnerPage + 1}/{learnerTotalPages}</span>
            <button type="button" className={btnP} onClick={() => setLearnerPage((p) => Math.min(learnerTotalPages - 1, p + 1))} disabled={learnerLoading || learnerPage >= learnerTotalPages - 1}>→</button>
          </div>

          {learnerLoading && <div className="mt-3 text-sm text-text-muted">{t('common.loading', 'Loading...')}</div>}
          {!learnerLoading && learnerError && <div className="mt-3 text-sm text-red-600">{learnerError}</div>}
          {!learnerLoading && !learnerError && rows.length === 0 && <div className="mt-3 text-sm text-text-muted">{t('instructorLearners.noLearners')}</div>}

          {!learnerLoading && !learnerError && rows.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-[0.82rem] text-text-muted">
                    <th className="py-2 border-b border-border-subtle">{t('instructorLearners.colLearner')}</th>
                    <th className="py-2 border-b border-border-subtle">{t('instructorLearners.colEmail')}</th>
                    <th className="py-2 border-b border-border-subtle">{t('instructorLearners.colProgress')}</th>
                    <th className="py-2 border-b border-border-subtle text-right">{t('instructorLearners.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const u = (r?.userResponse || r?.user || {}) as AnyObj
                    const uid = getUserId(u)
                    const banned = uid ? !!bannedByUser[uid] : false
                    const rawPct = Number(r?.percentComplete)
                    const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0
                    return (
                      <tr key={uid || getEmail(u) || getName(u)} className="text-sm">
                        <td className="py-3 border-b border-border-subtle">
                          <div className="font-extrabold">{getName(u) || t('instructorLearners.noName')}</div>
                          {banned && <div className="mt-0.5 inline-flex items-center text-[0.72rem] font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{t('instructorLearners.bannedBadge')}</div>}
                        </td>
                        <td className="py-3 border-b border-border-subtle text-text-secondary">{getEmail(u) || '-'}</td>
                        <td className="py-3 border-b border-border-subtle">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            {pct <= 0 ? (
                              <div className="flex-1" />
                            ) : (
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[linear-gradient(90deg,#22c55e,#84cc16)] rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            )}
                            <div className="font-bold text-text-secondary">{Math.round(pct)}%</div>
                          </div>
                        </td>
                        <td className="py-3 border-b border-border-subtle text-right">
                          {!uid ? (
                            <span className="text-text-muted">-</span>
                          ) : banned ? (
                            <button type="button" className={btnU} onClick={() => void handleBanToggle(uid, false)} disabled={actingUserId === uid}>{t('instructorLearners.unban')}</button>
                          ) : (
                            <button type="button" className={btnB} onClick={() => void handleBanToggle(uid, true)} disabled={actingUserId === uid}>{t('instructorLearners.ban')}</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default InstructorLearners

