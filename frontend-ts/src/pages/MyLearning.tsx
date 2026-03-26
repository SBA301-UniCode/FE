import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { enrollmentApi, processApi, chapterApi, certificateApi, userApi, feedbackApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import FeedbackModal from '../components/feedback/FeedbackModal'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const extractList = (p: unknown): AnyObj[] => { if (!p) return []; if (Array.isArray(p)) return p; const o = p as AnyObj; return (o.content || o.data) as AnyObj[] || [] }
const getCourseId = (e: AnyObj) => ((e?.courseId || (e?.courseResponse as AnyObj)?.courseId || (e?.courseResponse as AnyObj)?.id || (e?.course as AnyObj)?.courseId || (e?.course as AnyObj)?.id || '') as string)
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }

const MyLearning = () => {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollments, setEnrollments] = useState<AnyObj[]>([])
  const [progressByEnrollment, setProgressByEnrollment] = useState<Record<string, number>>({})
  const [chapterCountByCourse, setChapterCountByCourse] = useState<Record<string, number>>({})
  const [certifiedCourseIds, setCertifiedCourseIds] = useState<Set<string>>(new Set())
  const [issuingCourseId, setIssuingCourseId] = useState('')
  const [issueMessage, setIssueMessage] = useState('')
  const [learnerId, setLearnerId] = useState('')
  const [canFeedbackByCourse, setCanFeedbackByCourse] = useState<Record<string, boolean>>({})
  const [activeCommentCourseId, setActiveCommentCourseId] = useState('')
  const [feedbackSubmittingByCourse, setFeedbackSubmittingByCourse] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const TABS = [{ key: 'ALL', label: t('myLearning.tabAll') }, { key: 'IN_PROGRESS', label: t('myLearning.tabInProgress') }, { key: 'COMPLETED', label: t('myLearning.tabCompleted') }, { key: 'NOT_STARTED', label: t('myLearning.tabNotStarted') }]

  const filteredEnrollments = useMemo(() => {
    let list = activeTab === 'ALL' ? enrollments : enrollments.filter((e) => e.statusCourse === activeTab)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((e) => {
        const course = (e.courseResponse || {}) as AnyObj
        return ((course.title as string) || '').toLowerCase().includes(q) || ((course.description as string) || '').toLowerCase().includes(q)
      })
    }
    return list
  }, [enrollments, activeTab, searchQuery])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true); setError('')
      try {
        const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const
        const results = await Promise.all(statuses.map((s) => enrollmentApi.getMyLearning(s, 0, 50).catch(() => ({ data: { data: { content: [] } } }))))
        const allEnrollments = results.flatMap((res) => extractList((res as { data?: { data?: unknown } }).data?.data ?? (res as { data?: unknown }).data))
        const courseMap = new Map<string, AnyObj>()
        for (const e of allEnrollments) { const cid = getCourseId(e); if (cid) courseMap.set(cid, e) }
        const unique = Array.from(courseMap.values())
        const pMap: Record<string, number> = {}; const chMap: Record<string, number> = {}; const cfMap: Record<string, boolean> = {}
        // Process in batches of 5 to avoid flooding
        for (let i = 0; i < unique.length; i += 5) {
          const batch = unique.slice(i, i + 5)
          await Promise.all(batch.map(async (en) => {
            const cid = getCourseId(en); const eid = en?.enrollmentId as string; if (!cid || !eid) return
            try { const cr = await chapterApi.getByCourseId(cid); const cl = (cr as { data?: { data?: unknown } }).data?.data ?? (cr as { data?: unknown }).data; chMap[cid] = Array.isArray(cl) ? cl.length : 0 } catch { chMap[cid] = 0 }
            try { const pr = await processApi.getCourseProgress({ courseId: cid, enrollmentId: eid }); const pp = (pr as { data?: { data?: { percentComplete?: number } } }).data?.data ?? (pr as { data?: unknown }).data; pMap[eid] = typeof (pp as AnyObj)?.percentComplete === 'number' ? (pp as AnyObj).percentComplete as number : 0 } catch { pMap[eid] = 0 }
            try { const r = unwrap(await feedbackApi.canFeedback(cid)); cfMap[cid] = r === true || r === 'true' } catch { cfMap[cid] = false }
          }))
        }
        if (!cancelled) { setEnrollments(unique); setProgressByEnrollment(pMap); setChapterCountByCourse(chMap); setCanFeedbackByCourse(cfMap) }
        try { const me = unwrap(await userApi.getMe()) as AnyObj; const uid = (me?.userId || me?.id || '') as string; if (!cancelled) setLearnerId(uid); const cl = unwrap(await certificateApi.getMyList()); const certs = Array.isArray(cl) ? cl : []; if (!cancelled) setCertifiedCourseIds(new Set(certs.map((c: AnyObj) => c?.courseId as string).filter(Boolean))) } catch {}
      } catch (e: unknown) { const err = e as { response?: { data?: { message?: string; errorCode?: string } }; message?: string }; if (!cancelled) setError(err.response?.data?.message || err.response?.data?.errorCode || err.message || 'Error') }
      finally { if (!cancelled) setLoading(false) }
    }; run(); return () => { cancelled = true }
  }, [])

  const handleContinueLearning = (en: AnyObj) => { const cid = getCourseId(en); const eid = en?.enrollmentId as string; if (cid && eid) navigate(`/learning/${cid}?enrollmentId=${encodeURIComponent(eid)}`) }
  const handleIssueCertificate = async (courseId: string) => {
    if (!learnerId || !courseId) return; setIssuingCourseId(courseId); setIssueMessage('')
    try { await certificateApi.create({ learnerId, courseId }); setIssueMessage(t('myLearning.certSuccess')); setCertifiedCourseIds((p) => new Set([...p, courseId])) }
    catch (e: unknown) { const err = e as { response?: { data?: { errorCode?: string; message?: string } }; message?: string }; const code = err.response?.data?.errorCode || ''; if (code.includes('CERTIFICATE_ALREADY_EXISTS')) { setIssueMessage(t('myLearning.certExists')); setCertifiedCourseIds((p) => new Set([...p, courseId])) } else if (code.includes('COURSE_NOT_COMPLETED')) setIssueMessage(t('myLearning.certNotCompleted')); else setIssueMessage(`${err.response?.data?.message || err.message}`) }
    finally { setIssuingCourseId('') }
  }
  const formatPercent = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? '0%' : `${Math.round(n)}%` }
  const handleSubmitFeedback = async (courseId: string, payload: { comment: string; rating: number; fileList?: File[] }) => {
    if (!courseId || !payload?.comment?.trim()) return
    setFeedbackSubmittingByCourse((p) => ({ ...p, [courseId]: true }))
    try { await feedbackApi.create(courseId, { comment: payload.comment.trim(), rating: Number(payload.rating) || 5 }, payload.fileList || []); setActiveCommentCourseId(''); setCanFeedbackByCourse((p) => ({ ...p, [courseId]: false })); setIssueMessage(t('myLearning.feedbackSuccess')) }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setIssueMessage(`${err.response?.data?.message || err.message}`) }
    finally { setFeedbackSubmittingByCourse((p) => ({ ...p, [courseId]: false })) }
  }

  const inProgressCourses = useMemo(() => enrollments.filter((e) => e.statusCourse === 'IN_PROGRESS' && (progressByEnrollment[e.enrollmentId as string] ?? 0) < 99.99).sort((a, b) => new Date(b.enrolledAt as string || 0).getTime() - new Date(a.enrolledAt as string || 0).getTime()), [enrollments, progressByEnrollment])
  const continueCourse = inProgressCourses[0]
  const displayName = authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'Learner'
  const completedCount = enrollments.filter((e) => (progressByEnrollment[e.enrollmentId as string] ?? 0) >= 99.99).length

  const statusColors: Record<string, string> = { COMPLETED: 'bg-emerald-50 border-emerald-200 text-green-600', IN_PROGRESS: 'bg-blue-50 border-blue-200 text-blue-600', NOT_STARTED: 'bg-gray-100 border-gray-200 text-gray-500' }

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />
      <main className="w-full mx-auto px-6 py-8 pb-16">
        {/* Welcome */}
        <div className="bg-[linear-gradient(135deg,#003E99_0%,#0056D2_50%,#1A73E8_100%)] rounded-2xl px-8 py-6 text-white flex items-center justify-between gap-6 mb-5 max-[640px]:flex-col max-[640px]:text-center">
          <div>
            <h1 className="m-0 text-2xl font-extrabold">{t('myLearning.greeting', { greeting: getGreeting(), name: displayName })}</h1>
            <p className="mt-1 text-[0.92rem] text-white/80">{enrollments.length > 0 ? t('myLearning.trackingDesc', { total: enrollments.length, completed: completedCount }) : t('myLearning.startDesc')}</p>
          </div>
          <div className="flex gap-6">
            {[{ v: enrollments.length, l: 'Enrolled' }, { v: completedCount, l: 'Completed' }, { v: certifiedCourseIds.size, l: 'Certificates' }].map((s) => (
              <div key={s.l} className="flex flex-col items-center gap-0.5"><span className="text-2xl font-extrabold">{s.v}</span><span className="text-[0.75rem] text-white/70 uppercase tracking-wider">{s.l}</span></div>
            ))}
          </div>
        </div>

        {/* Continue Learning */}
        {continueCourse && (() => { const cc = (continueCourse.courseResponse || {}) as AnyObj; const pct = Math.round(progressByEnrollment[continueCourse.enrollmentId as string] ?? 0); return (
          <div className="bg-white border border-border-medium rounded-2xl flex gap-5 overflow-hidden mb-6 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] max-[640px]:flex-col">
            <div className="w-60 min-h-[140px] shrink-0 bg-blue-50 max-[640px]:w-full max-[640px]:h-40">{!!(cc.image || cc.imageUrl || cc.thumbnail) && <img src={(cc.image || cc.imageUrl || cc.thumbnail) as string} alt="" className="w-full h-full object-cover block" />}</div>
            <div className="flex-1 py-5 pr-5 flex flex-col justify-center gap-2 max-[640px]:px-5">
              <span className="text-[0.75rem] font-bold text-primary-500 uppercase tracking-widest">{t('myLearning.continueLearning')}</span>
              <h2 className="m-0 text-xl font-extrabold leading-snug">{(cc.title as string) || t('courses.pageTitle')}</h2>
              <div className="flex items-center gap-3"><div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[260px]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#84cc16)] transition-all duration-300" style={{ width: `${pct}%` }} /></div><span className="text-[0.82rem] font-semibold text-text-secondary">{t('myLearning.complete', { percent: pct })}</span></div>
              <button type="button" className="self-start px-5 py-2.5 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white border-none rounded-[10px] font-bold text-sm cursor-pointer font-[inherit] shadow-[0_4px_12px_rgba(0,86,210,0.25)] transition-all hover:-translate-y-0.5" onClick={() => handleContinueLearning(continueCourse)}>{t('myLearning.resume')}</button>
            </div>
          </div>
        )})()}

        {/* Header + Tabs */}
        <div className="flex items-end justify-between gap-5 mb-3 max-[640px]:flex-col max-[640px]:items-start">
          <h2 className="m-0 text-xl font-extrabold">{t('myLearning.allCourses')}</h2>
          <Link to="/courses" className="px-4 py-2.5 rounded-xl font-bold border border-border-medium bg-white text-text-main no-underline inline-flex items-center transition-all hover:-translate-y-px">{t('myLearning.exploreMore')}</Link>
        </div>
        {/* Search */}
        {!loading && !error && enrollments.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-border-medium rounded-xl px-4 py-2.5 mb-4 max-w-[400px]">
            <span className="text-text-muted">🔍</span>
            <input type="text" className="flex-1 bg-transparent border-none outline-none text-text-main text-[0.92rem] font-[inherit]" placeholder={t('myLearning.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer text-sm" onClick={() => setSearchQuery('')}>✕</button>}
          </div>
        )}
        <div className="flex border-b-2 border-border-subtle mb-6">
          {TABS.map((tab) => {
            const count = tab.key === 'ALL' ? enrollments.length : enrollments.filter((e) => e.statusCourse === tab.key).length
            return <button key={tab.key} type="button" className={`inline-flex items-center gap-1.5 px-5 py-3 text-[0.95rem] font-semibold font-[inherit] bg-transparent border-none border-b-[3px] border-transparent cursor-pointer transition-colors -mb-0.5 ${activeTab === tab.key ? 'text-primary-500 !border-b-primary-500' : 'text-text-muted hover:text-text-main'}`} onClick={() => setActiveTab(tab.key)}>{tab.label}<span className={`text-[0.75rem] font-bold px-1.5 py-px rounded-full min-w-[1.4rem] text-center ${activeTab === tab.key ? 'bg-[rgba(0,86,210,0.1)] text-primary-500' : 'bg-border-subtle text-text-secondary'}`}>{count}</span></button>
          })}
        </div>

        {!!issueMessage && <div className="bg-white border border-border-medium rounded-[18px] px-5 py-4 text-text-muted mb-4">{issueMessage}</div>}
        {loading && <div className="bg-white border border-border-medium rounded-[18px] px-5 py-4 text-text-muted">{t('myLearning.loadingCourses')}</div>}
        {!loading && error && <div className="bg-red-50 border border-red-200 rounded-[18px] px-5 py-4 text-red-600"><strong>{t('myLearning.errorLoading')}</strong><div>{error}</div></div>}
        {!loading && !error && enrollments.length === 0 && <div className="bg-white border border-border-medium rounded-[18px] px-5 py-4 text-text-muted">{t('myLearning.noEnrollments')}</div>}

        {!loading && !error && enrollments.length > 0 && (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4 max-[640px]:grid-cols-1">
            {filteredEnrollments.map((e) => {
              const course = (e.courseResponse || {}) as AnyObj
              const percent = progressByEnrollment[e.enrollmentId as string] ?? 0
              const courseId = getCourseId(e)
              const chapterCount = chapterCountByCourse[courseId]
              const displayStatus = percent >= 99.99 ? 'COMPLETED' : ((e.statusCourse as string) || 'IN_PROGRESS')
              return (
                <article key={e.enrollmentId as string} className={`bg-white border rounded-[20px] p-4 flex flex-col gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:border-primary-500 hover:shadow-[0_8px_24px_rgba(0,86,210,0.1)] ${displayStatus === 'COMPLETED' ? 'border-green-600 shadow-[0_2px_12px_rgba(22,163,74,0.1)]' : 'border-border-medium'}`}>
                  <div className="w-full h-[140px] rounded-[14px] overflow-hidden mb-0.5 bg-blue-50">
                    {(course.image || course.imageUrl || course.thumbnail) ? <img src={(course.image || course.imageUrl || course.thumbnail) as string} alt={(course.title as string) || ''} className="w-full h-full object-cover block" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none' }} /> : <div className="w-full h-full flex items-center justify-center text-[2.5rem] opacity-50">📚</div>}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-black text-[1.08rem] leading-snug tracking-tight line-clamp-2">{(course.title as string) || t('courses.pageTitle')}</div>
                    <span className={`text-[0.72rem] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full border whitespace-nowrap uppercase ${statusColors[displayStatus] || statusColors.IN_PROGRESS}`}>{displayStatus}</span>
                  </div>
                  {!!course.instructorName && <p className="m-0 text-[0.85rem] text-text-muted">{t('myLearning.instructor', { name: String(course.instructorName) })}</p>}
                  {!!course.description && <p className="m-0 text-text-secondary leading-relaxed text-[0.92rem] line-clamp-3">{String(course.description)}</p>}
                  <div className="flex items-center justify-between gap-3 mt-auto pt-1">{Number(chapterCount) >= 0 && <span className="text-[0.85rem] text-text-muted">{t('courses.chapterCount', { count: chapterCount })}</span>}<span className="text-[0.85rem] text-text-main font-semibold">{t('myLearning.progress', { percent: formatPercent(percent) })}</span></div>
                  <div className="mt-1"><div className="w-full h-[7px] rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#84cc16_100%)] transition-all duration-300" style={{ width: formatPercent(percent) }} /></div></div>
                  <div className="flex flex-col gap-2 mt-2">
                    {canFeedbackByCourse[courseId] && <button type="button" className="px-4 py-2.5 rounded-xl font-bold border border-border-medium bg-white text-text-main cursor-pointer transition-all hover:-translate-y-px" onClick={() => setActiveCommentCourseId(courseId)}>{t('myLearning.comment')}</button>}
                    <button type="button" className="px-4 py-2.5 rounded-xl font-bold border-none bg-primary-500 text-white cursor-pointer shadow-[0_4px_12px_rgba(0,86,210,0.25)] transition-all hover:-translate-y-px hover:bg-primary-600" onClick={() => handleContinueLearning(e)}>{t('myLearning.continueBtn')}</button>
                    <button type="button" className="px-4 py-2.5 rounded-xl font-bold border border-border-medium bg-white text-text-main cursor-pointer transition-all hover:-translate-y-px" onClick={() => navigate(`/learning/${courseId}/mindmap`)}>{t('myLearning.mindMap')}</button>
                    {percent >= 99.99 && <button type="button" className="px-4 py-2.5 rounded-xl font-bold border border-border-medium bg-white text-text-main cursor-pointer transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" onClick={() => handleIssueCertificate(courseId)} disabled={!learnerId || issuingCourseId === courseId || certifiedCourseIds.has(courseId)}>{certifiedCourseIds.has(courseId) ? t('myLearning.hasCert') : issuingCourseId === courseId ? t('myLearning.issuingCert') : t('myLearning.getCert')}</button>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <FeedbackModal open={Boolean(activeCommentCourseId)} title={t('myLearning.feedbackTitle')} submitText={t('myLearning.feedbackSubmit')} submitting={Boolean(feedbackSubmittingByCourse[activeCommentCourseId])} onClose={() => setActiveCommentCourseId('')} onSubmit={(payload) => handleSubmitFeedback(activeCommentCourseId, payload)} />
      <Footer />
    </div>
  )
}

export default MyLearning
