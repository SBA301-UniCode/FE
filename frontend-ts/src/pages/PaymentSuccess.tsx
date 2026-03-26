import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { enrollmentApi } from '../api'
import { useTranslation } from 'react-i18next'

const COLORS = ['#0056D2', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899']

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const courseId = searchParams.get('courseId')
  const status = searchParams.get('status') || searchParams.get('statusPayment') || ''
  const resultCode = searchParams.get('resultCode')
  const message = searchParams.get('message') || ''
  const orderId = searchParams.get('orderId') || ''
  const requestId = searchParams.get('requestId') || ''
  const transId = searchParams.get('transId') || searchParams.get('transactionId') || ''
  const [enrolling, setEnrolling] = useState(false)
  const enrollStorageKey = useMemo(() => {
    if (!courseId) return ''
    const txPart = [orderId, requestId, transId].filter(Boolean).join('|')
    return `payment-success-enroll:${txPart || `course:${courseId}`}`
  }, [courseId, orderId, requestId, transId])

  const isError = (resultCode != null && resultCode !== '' && resultCode !== '0') || status.toUpperCase() === 'ERROR' || message.toLowerCase().includes('declined')

  useEffect(() => {
    if (isError || !courseId || !enrollStorageKey) return
    const cur = sessionStorage.getItem(enrollStorageKey)
    if (cur === 'pending' || cur === 'done') return
    sessionStorage.setItem(enrollStorageKey, 'pending')
    let cancelled = false
    const autoEnroll = async () => {
      setEnrolling(true)
      try {
        const r = await enrollmentApi.isEnrolled(courseId)
        const d = r.data?.data ?? r.data
        if (d !== true && d !== 'true') await enrollmentApi.join(courseId)
        sessionStorage.setItem(enrollStorageKey, 'done')
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } }
        if (err?.response?.status === 409) sessionStorage.setItem(enrollStorageKey, 'done')
        else sessionStorage.removeItem(enrollStorageKey)
      } finally { if (!cancelled) setEnrolling(false) }
    }
    autoEnroll()
    return () => { cancelled = true }
  }, [isError, courseId, enrollStorageKey])

  return (
    <div className="min-h-screen bg-bg-page text-text-main relative overflow-hidden flex flex-col">
      <Header />
      <main className="max-w-[520px] mx-auto px-6 py-12 pb-16 relative z-[1]">
        {/* Confetti */}
        {!isError && (
          <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="absolute -top-2.5 w-2 h-2 rounded-sm opacity-80 animate-[confettiFall_linear_forwards]"
                style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s`, background: COLORS[i % 6] }} />
            ))}
          </div>
        )}

        <div className={`bg-white rounded-[20px] p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.08)] animate-[cardPop_0.5s_ease-out] ${isError ? 'border-2 border-red-600' : 'border-2 border-green-600'}`}>
          {isError ? (
            <>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-50 border-[3px] border-red-600 text-red-600 flex items-center justify-center animate-[iconPulse_0.6s_ease]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
              <h1 className="m-0 mb-3 text-2xl font-extrabold">{t('payment.failedTitle')}</h1>
              <p className="m-0 mb-4 text-text-secondary leading-relaxed">{message || t('payment.failedDesc')}</p>
              <p className="m-0 mb-5 text-[0.82rem] text-text-muted bg-amber-50 rounded-lg px-3 py-2.5 text-left">{t('payment.sandboxNote')}</p>
              <div className="flex flex-col gap-2.5">
                {courseId && <Link to={`/payment?courseId=${courseId}`} className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl font-bold text-center no-underline text-[0.95rem] transition-all bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white shadow-[0_4px_14px_rgba(0,86,210,0.25)] hover:-translate-y-0.5">{t('payment.retryPayment')}</Link>}
                <Link to="/courses" className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl font-bold text-center no-underline text-[0.95rem] transition-colors bg-border-subtle text-text-secondary hover:bg-gray-200">{t('payment.chooseCourse')}</Link>
                <Link to="/" className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl font-bold text-center no-underline text-[0.95rem] transition-colors bg-border-subtle text-text-secondary hover:bg-gray-200">{t('payment.goHome')}</Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-50 border-[3px] border-green-600 text-green-600 flex items-center justify-center animate-[iconPulse_0.6s_ease]">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h1 className="m-0 mb-3 text-2xl font-extrabold">{t('payment.successTitle')}</h1>
              <p className="m-0 mb-4 text-text-secondary leading-relaxed">{t('payment.successDesc')}</p>
              {enrolling && <p className="text-[0.88rem] text-primary-500 m-0 mb-4">{t('payment.enrolling')}</p>}
              <div className="text-left mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <h3 className="m-0 mb-3 text-[0.95rem] font-bold text-green-600">{t('payment.whatsNext')}</h3>
                <div className="flex flex-col gap-2">
                  {[t('payment.step1'), t('payment.step2'), t('payment.step3')].map((text, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[0.88rem]">
                      <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-[0.72rem] font-bold shrink-0">{i + 1}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link to="/my-learning" className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl font-bold text-center no-underline text-[0.95rem] transition-all bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white shadow-[0_4px_14px_rgba(0,86,210,0.25)] hover:-translate-y-0.5">{t('payment.goToLearning')}</Link>
                {courseId && <Link to={`/courses/${courseId}`} className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl font-bold text-center no-underline text-[0.95rem] transition-colors bg-border-subtle text-text-secondary hover:bg-gray-200">{t('payment.viewCourse')}</Link>}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default PaymentSuccess
