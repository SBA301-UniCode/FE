import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { processApi, questionBankApi, contentApi, examApi } from '../api'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const getContentId = (c: AnyObj) => ((c?.contentId || c?.id || '') as string)
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

interface QOption { optionId: string; text: string; isCorrect: boolean }
interface QItem { questionBankId: string; text: string; imageUrl?: string; type: string; options: QOption[] }
interface QResult { correct: number; total: number; score: number; passed: boolean }

const DURATION_DEFAULT = 600, PASS_SCORE_DEFAULT = 60

/* ─── Shared button styles ─── */
const btnBase = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-sm border-none cursor-pointer transition-all'
const btnPrimary = `${btnBase} px-5 py-2.5 bg-primary-500 text-white hover:shadow-[0_4px_16px_rgba(0,86,210,0.25)] hover:-translate-y-px`
const btnSubmit = `${btnBase} px-5 py-2.5 bg-green-600 text-white hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)] hover:-translate-y-px`
const btnOutline = `${btnBase} px-5 py-2.5 bg-transparent border border-border-medium text-text-secondary hover:bg-bg-deep disabled:opacity-40 disabled:cursor-not-allowed`
const btnGhost = `${btnBase} px-4 py-2 bg-transparent text-text-muted hover:text-text-main hover:bg-bg-deep`
const btnLg = 'px-8 py-3.5 text-base'

const QuizPage = () => {
  const { contentId } = useParams()
  const [searchParams] = useSearchParams()
  const enrollmentId = searchParams.get('enrollmentId') || ''
  const courseId = searchParams.get('courseId') || ''
  const lessonId = searchParams.get('lessonId') || contentId || ''
  const chapterId = searchParams.get('chapterId') || ''
  const selectedContentId = searchParams.get('contentId') || contentId || ''
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [questions, setQuestions] = useState<QItem[]>([])
  const [realContentId, setRealContentId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'intro' | 'taking' | 'result'>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [timeLeft, setTimeLeft] = useState(DURATION_DEFAULT)
  const [examDuration, setExamDuration] = useState(DURATION_DEFAULT)
  const [examPassScore, setExamPassScore] = useState(PASS_SCORE_DEFAULT)
  const [result, setResult] = useState<QResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [exam, setExam] = useState('')
  const [examName, setExamName] = useState('')
  const [examAttemptId, setExamAttemptId] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)



  useEffect(() => {
    if (!lessonId) { setLoadError(t('quiz.noQuestionsLesson')); setLoading(false); return }
    setLoading(true); setLoadError('')
    const loadQ = async () => {
      /* Step 1: resolve the real contentId for the QUIZ content */
      let examId = ''
      try {
        const cRes = await contentApi.getByContentId(lessonId)
        examId = cRes.data.data.contentId
        setExam(examId);
      } catch { }
      /* Step 2: try to get exam questions from examApi */
      let loaded = false
      if (examId) {
        try {
          const examRes = await examApi.getExamById(examId)
          const examData = unwrap(examRes) as AnyObj
          if (examData) {
            const dur = Number(examData.duration); if (Number.isFinite(dur) && dur > 0) { setExamDuration(dur); setTimeLeft(dur) }
            const ps = Number(examData.passScore); if (Number.isFinite(ps) && ps > 0) setExamPassScore(ps)
            if (examData.name || examData.examName) setExamName((examData.name || examData.examName) as string)
          }
          const qRes = await examApi.getQuestionsByExam(examId)
          const qRaw = unwrap(qRes)
          const qItems = (Array.isArray(qRaw) ? qRaw : (qRaw as AnyObj)?.content ?? (qRaw as AnyObj)?.items ?? []) as AnyObj[]
          if (qItems.length > 0) {
            setQuestions(qItems.map((q) => ({ questionBankId: (q.questionBankId || q.questionId || q.id) as string, text: (q.questionText || q.text) as string, imageUrl: q.imageUrl as string | undefined, type: (q.questionType || q.type || 'MULTIPLE_CHOICE') as string, options: ((q.options || q.answers || []) as AnyObj[]).map((o) => ({ optionId: (o.optionId || o.answerId || o.id) as string, text: (o.answerText || o.text) as string, isCorrect: (o.isCorrect || o.correct) as boolean })) })))
            loaded = true
          }
        } catch { }
      }
      /* Step 3: fallback to questionBankApi */
      if (!loaded) {
        try {
          const res = await questionBankApi.getByLessonId(lessonId, 0, 100)
          const raw = unwrap(res) as AnyObj
          const items = (raw?.content ?? raw?.items ?? (Array.isArray(raw) ? raw : [])) as AnyObj[]
          if (!items.length) { setLoadError(t('quiz.noQuestionsLesson')); return }
          setQuestions(items.map((q) => ({ questionBankId: q.questionBankId as string, text: q.questionText as string, imageUrl: q.imageUrl as string | undefined, type: (q.questionType as string) || 'MULTIPLE_CHOICE', options: ((q.options as AnyObj[]) || []).map((o) => ({ optionId: o.optionId as string, text: o.answerText as string, isCorrect: (o.isCorrect || o.correct) as boolean })) })))
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } }; message?: string }
          setLoadError(e.response?.data?.message || e.message || t('quiz.cantLoadQuestions'))
        }
      }
    }
    loadQ().finally(() => setLoading(false))
  }, [lessonId])

  const startQuiz = useCallback(async () => {
    const res = await examApi.startExam(exam)
    const attemptData = unwrap(res) as any;

    // Lưu lại ID của lượt thi này để tí nữa submit
    setExamAttemptId(attemptData.examAttemptId);
    setPhase('taking'); setTimeLeft(examDuration); setAnswers({}); setFlagged({}); setCurrentIdx(0); setResult(null)
  }, [examDuration])

  useEffect(() => { if (phase !== 'taking') return; timerRef.current = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0 }; return p - 1 }), 1000); return () => clearInterval(timerRef.current!) }, [phase])

  const submitQuiz = useCallback(async () => {
    clearInterval(timerRef.current!);

    // 1. Chuyển đổi dữ liệu từ state 'answers' sang format Backend yêu cầu
    const formattedAnswers = Object.entries(answers).map(([qId, optId]) => ({
      questionBankId: qId,
      selectedOptionId: optId
    }));

    const submitRequest = {
      examAttemptId: examAttemptId,
      answers: formattedAnswers
    };

    try {
      // 2. Gọi API Submit lên Backend
      const res = await examApi.submitExam(submitRequest);
      const serverResult = unwrap(res) as any;

      // 3. Cập nhật kết quả dựa trên dữ liệu thật từ Database
      // Giả sử serverResult trả về: score, passed, correctAnswers, totalQuestions...
      setResult({
        score: serverResult.score,
        passed: serverResult.passed,
        correct: serverResult.rightAnswer || 0,
        total: questions.length
      });

      setPhase('result');

      // 4. Track tiến độ (giữ nguyên logic cũ của bạn)
      const tId = realContentId || contentId || '';
      if (isUuid(tId) && enrollmentId) {
        processApi.trackContent({
          contentId: tId,
          enrollmentId,
          status: (serverResult.passed ? 'COMPLETED' : 'IN_PROCESS')
        });
      }
    } catch (error) {
      console.error("Lỗi khi nộp bài:", error);
      alert("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại!");
    }
  }, [answers, examAttemptId, questions, realContentId, contentId, enrollmentId]);
  // 1. Hàm tải danh sách lịch sử từ Backend
  const fetchHistory = useCallback(async () => {
    if (!exam) return
    try {
      const res = await examApi.getMyAttemptResults(exam)
      const data = unwrap(res)
      setHistory(Array.isArray(data) ? data : [])
      setShowHistory(true)
    } catch (err) {
      console.error("Lỗi tải lịch sử:", err)
      alert("Không thể tải lịch sử làm bài.")
    }
  }, [exam])

  // 2. Hàm xử lý khi nhấn vào "Xem lại" một dòng cụ thể
  const reviewAttempt = (attempt: any) => {
    const oldAnswers: Record<string, string> = {}

    // Mapping lịch sử câu trả lời vào state answers của React
    // Bạn hãy kiểm tra tên field 'answerHistoryList' có khớp với DTO Backend trả về không nhé
    if (attempt.answerHistoryList) {
      attempt.answerHistoryList.forEach((h: any) => {
        // Logic lấy ID câu hỏi và ID phương án đã chọn
        const qId = h.questionBankId || h.questionId
        const optId = h.selectedOptionId
        if (qId && optId) oldAnswers[qId] = optId
      })
    }

    setAnswers(oldAnswers)
    setResult({
      score: attempt.score,
      passed: attempt.passed,
      correct: attempt.rightAnswer || 0,
      total: questions.length
    })

    setIsReviewMode(true) // Đánh dấu là đang ở chế độ xem lại
    setPhase('result')    // Chuyển sang màn hình kết quả
    setShowHistory(false) // Đóng Modal lịch sử
  }


  useEffect(() => { if (phase === 'taking' && timeLeft <= 0) submitQuiz() }, [timeLeft, phase, submitQuiz])

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])
  const currentQ = questions[currentIdx]
  const handleSelect = (optId: string) => { if (!currentQ) return; setAnswers((p) => ({ ...p, [currentQ.questionBankId]: optId })) }
  const toggleFlag = () => { if (!currentQ) return; setFlagged((p) => ({ ...p, [currentQ.questionBankId]: !p[currentQ.questionBankId] })) }
  const goBack = () => { if (!courseId) { navigate(-1); return }; const p = new URLSearchParams(); if (enrollmentId) p.set('enrollmentId', enrollmentId); if (lessonId) p.set('lessonId', lessonId); if (chapterId) p.set('chapterId', chapterId); if (selectedContentId) p.set('contentId', selectedContentId); navigate(`/learning/${courseId}?${p.toString()}`) }
  const HistoryModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[24px] w-full max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-deep">
          <h2 className="text-xl font-bold text-text-main">Lịch sử làm bài</h2>
          <button onClick={() => setShowHistory(false)} className="text-2xl text-text-muted hover:text-text-main transition-colors">&times;</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-text-muted">Bạn chưa thực hiện bài thi này lần nào.</div>
          ) : (
            history.map((att, idx) => (
              <div key={att.examAttemptId} className="flex justify-between items-center p-4 mb-3 border border-border-medium rounded-xl hover:border-primary-500 hover:bg-primary-500/5 transition-all group">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-text-main">Lần {history.length - idx}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(att.attemptStartTime).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-lg font-black ${att.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {att.score}%
                  </div>
                  <button
                    className={`${btnOutline} group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500`}
                    onClick={() => reviewAttempt(att)}
                  >
                    Xem lại
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
  /* ─── LOADING / ERROR ─── */
  const IntroCard = ({ children }: { children: React.ReactNode }) => <div className="max-w-[580px] mx-auto bg-white border border-border-medium rounded-[20px] p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">{children}</div>

  if (loading) return <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8 pb-16"><IntroCard><p className="text-center py-8">{t('quiz.loading')}</p></IntroCard></main></div>
  if (loadError || questions.length === 0) return <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8 pb-16"><IntroCard><div className="text-5xl mb-2">⚠️</div><h1 className="m-0 mb-6 text-2xl font-extrabold">{t('quiz.noQuiz')}</h1><p className="text-text-muted text-center">{loadError || t('quiz.noQuestionsLesson')}</p><div className="flex flex-col gap-2.5 items-center mt-6"><button type="button" className={btnGhost} onClick={goBack}>{t('quiz.goBack')}</button></div></IntroCard></main></div>

  /* ─── INTRO ─── */
  if (phase === 'intro') return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8 pb-16">
      <IntroCard>
        <div className="text-5xl mb-2">📝</div>
        <h1 className="m-0 mb-6 text-2xl font-extrabold">{examName || t('quiz.title')}</h1>
        <div className="flex justify-center gap-6 mb-6">{[{ l: 'Questions', v: questions.length }, { l: 'Time', v: formatTime(examDuration) }, { l: 'Pass', v: `${examPassScore}%` }].map((m) => <div key={m.l} className="flex flex-col items-center gap-0.5"><span className="text-[0.78rem] text-text-muted uppercase tracking-wider">{m.l}</span><span className="text-xl font-bold text-primary-500">{m.v}</span></div>)}</div>
        <div className="text-left bg-bg-deep border border-border-subtle rounded-[14px] p-4 mb-6"><h3 className="m-0 mb-2 text-sm text-text-main">{t('quiz.notesTitle')}</h3><ul className="m-0 pl-5">{[t('quiz.note1'), t('quiz.note2'), t('quiz.note3'), t('quiz.note4')].map((note) => <li key={note} className="text-[0.88rem] text-text-secondary mb-1 leading-relaxed">{note}</li>)}</ul></div>
        <div className="flex flex-col gap-2.5 items-center">
          <button type="button" className={`${btnPrimary} ${btnLg}`} onClick={startQuiz}>{t('quiz.startBtn')}</button>
          <button type="button" className={`${btnOutline} w-full max-w-[200px]`} onClick={fetchHistory}>
            🕒 {t('quiz.history')}
          </button>          <button type="button" className={btnGhost} onClick={goBack}>{t('quiz.goBack')}</button></div>
      </IntroCard>
    </main></div>
  )

  /* ─── RESULT ─── */
  if (phase === 'result' && result) return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8 pb-16">
      <div className="max-w-[720px] mx-auto bg-white border border-border-medium rounded-[20px] p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="text-[3.5rem] mb-1">{result.passed ? '🎉' : '😔'}</div>
        <h1 className="m-0 mb-1 text-2xl font-extrabold">{result.passed ? t('quiz.resultPassed') : t('quiz.resultFailed')}</h1>
        <p className="m-0 mb-6 text-text-muted text-sm">{result.passed ? t('quiz.resultPassedDesc') : t('quiz.resultFailedDesc', { score: examPassScore })}</p>
        {/* Score ring */}
        <div className="flex items-center justify-center gap-10 mb-8 flex-wrap">
          <div className="relative w-[120px] h-[120px]"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r="52" fill="none" stroke="#E5E7EB" strokeWidth="10" /><circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round" className={result.passed ? 'stroke-green-500' : 'stroke-red-500'} strokeDasharray={`${(result.score / 100) * 327} 327`} style={{ transition: 'stroke-dasharray 0.8s ease' }} /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-[2rem] font-extrabold">{result.score}</span><span className="text-base text-text-muted ml-px">%</span></div></div>
          <div className="flex gap-6">{[{ v: result.correct, l: t('quiz.correct'), c: 'text-green-600' }, { v: result.total - result.correct, l: t('quiz.incorrect'), c: 'text-red-600' }, { v: result.total, l: 'Total', c: 'text-text-main' }].map((d) => <div key={d.l} className="flex flex-col items-center"><span className={`text-2xl font-extrabold ${d.c}`}>{d.v}</span><span className="text-[0.78rem] text-text-muted uppercase tracking-wider">{d.l}</span></div>)}</div>
        </div>
        {/* Review answers */}
        <div className="text-left mt-6">
          <h3 className="m-0 mb-4 text-lg font-bold text-center">{t('quiz.detailAnswers')}</h3>
          {questions.map((q, i) => {
            const ua = answers[q.questionBankId]; const co = q.options.find((o) => o.isCorrect); const ok = ua && co && String(ua) === String(co.optionId); return (
              <div key={q.questionBankId} className={`bg-bg-deep border border-border-medium rounded-[14px] p-4 mb-3 ${ok ? 'border-l-[3px] border-l-green-500' : 'border-l-[3px] border-l-red-500'}`}>
                <div className="flex justify-between items-center mb-1"><span className="text-[0.82rem] font-bold text-text-muted">{t('quiz.questionNum', { num: i + 1 })}</span><span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-md ${ok ? 'bg-emerald-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{ok ? t('quiz.correct') : t('quiz.incorrect')}</span></div>
                <p className="m-0 mb-2.5 text-sm font-semibold text-text-main leading-relaxed">{q.text}</p>
                <div className="flex flex-col gap-1">{q.options.map((opt) => { let cls = 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[0.88rem] text-text-secondary'; if (opt.isCorrect) cls += ' bg-emerald-50 text-green-600'; if (String(opt.optionId) === String(ua) && !opt.isCorrect) cls += ' bg-red-50 text-red-600'; return <div key={opt.optionId} className={cls}><span className="w-[18px] text-center font-bold text-[0.85rem] shrink-0">{opt.isCorrect ? '✓' : String(opt.optionId) === String(ua) ? '✗' : ''}</span><span>{opt.text}</span></div> })}</div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-center gap-3 mt-6"><button type="button" className={btnPrimary} onClick={startQuiz}>{t('quiz.retry')}</button><button type="button" className={btnGhost} onClick={goBack}>{t('quiz.backToCourse')}</button></div>
      </div>
    </main></div>
  )

  /* ─── TAKING ─── */
  if (!currentQ) return null
  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col"><Header /><main className="w-full mx-auto px-6 py-8 pb-16">
      <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-5 items-start max-[768px]:grid-cols-1">
        {/* Question panel */}
        <div className="bg-white border border-border-medium rounded-[20px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-3"><div className="text-base font-bold">{t('quiz.questionNum', { num: currentIdx + 1 })} <span className="font-normal text-text-muted">/ {questions.length}</span></div><div className={`flex items-center gap-1 text-base font-bold px-3 py-1.5 rounded-[10px] ${timeLeft <= 60 ? 'text-red-600 bg-red-600/8 animate-pulse' : 'text-primary-500 bg-primary-500/8'}`}>⏱ {formatTime(timeLeft)}</div></div>
          {currentQ.type === 'TRUE_FALSE' && <span className="inline-block text-[0.72rem] font-semibold uppercase tracking-widest bg-purple-50 text-violet-600 px-2.5 py-0.5 rounded-md mb-3">{t('quiz.trueFalse')}</span>}
          {currentQ.type === 'MULTIPLE_CHOICE' && <span className="inline-block text-[0.72rem] font-semibold uppercase tracking-widest bg-purple-50 text-violet-600 px-2.5 py-0.5 rounded-md mb-3">{t('quiz.multipleChoice')}</span>}
          <div className="text-[1.08rem] font-semibold leading-relaxed mb-5 text-text-main">{currentQ.text}</div>
          {currentQ.imageUrl && <img src={currentQ.imageUrl} alt="" className="max-w-full rounded-xl mb-5" />}
          <div className="flex flex-col gap-2.5 mb-5">{currentQ.options.map((opt, i) => {
            const sel = String(answers[currentQ.questionBankId]) === String(opt.optionId); return (
              <button key={opt.optionId} type="button" className={`flex items-center gap-3 w-full text-left border rounded-[14px] px-4 py-3 cursor-pointer transition-all text-sm text-text-main ${sel ? 'bg-[rgba(0,86,210,0.06)] border-primary-500' : 'bg-white border-border-medium hover:bg-bg-deep hover:border-text-muted'}`} onClick={() => handleSelect(opt.optionId)}>
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-[0.88rem] shrink-0 border ${sel ? 'bg-primary-500 text-white border-primary-500' : 'bg-bg-deep text-text-muted border-border-medium'}`}>{String.fromCharCode(65 + i)}</span>
                <span className="flex-1 leading-snug">{opt.text}</span>
              </button>
            )
          })}</div>
          <div className="flex justify-between items-center flex-wrap gap-2 border-t border-border-subtle pt-4">
            <button type="button" className={`${btnGhost} text-[0.82rem] px-3 py-1.5`} onClick={toggleFlag}>{flagged[currentQ.questionBankId] ? t('quiz.unflag') : t('quiz.flag')}</button>
            <div className="flex gap-2">
              <button type="button" className={btnOutline} disabled={currentIdx === 0} onClick={() => setCurrentIdx((p) => p - 1)}>{t('quiz.prevQuestion')}</button>
              {currentIdx < questions.length - 1 ? <button type="button" className={btnPrimary} onClick={() => setCurrentIdx((p) => p + 1)}>{t('quiz.nextQuestion')}</button> : <button type="button" className={btnSubmit} onClick={() => { if (window.confirm(t('quiz.submitConfirm', { answered: answeredCount, total: questions.length }))) submitQuiz() }}>{t('quiz.submitQuiz')}</button>}
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="bg-white border border-border-medium rounded-[20px] p-5 sticky top-20 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-[768px]:static max-[768px]:-order-1">
          <h3 className="m-0 mb-0.5 text-[0.95rem] font-bold">{t('quiz.questionList')}</h3>
          <div className="text-[0.8rem] text-text-muted mb-3">{answeredCount}/{questions.length}</div>
          <div className="grid grid-cols-5 gap-1.5 mb-3 max-[768px]:grid-cols-8">{questions.map((q, i) => { let cls = 'relative w-full aspect-square flex items-center justify-center rounded-[10px] border text-[0.82rem] font-semibold cursor-pointer transition-all'; if (i === currentIdx) cls += ' border-primary-500 bg-[rgba(0,86,210,0.08)] text-primary-500'; else if (answers[q.questionBankId]) cls += ' bg-emerald-50 border-emerald-200 text-green-600'; else cls += ' bg-white border-border-medium text-text-muted hover:bg-bg-deep'; if (flagged[q.questionBankId]) cls += ' !border-amber-500'; return <button key={q.questionBankId} type="button" className={cls} onClick={() => setCurrentIdx(i)}>{i + 1}{flagged[q.questionBankId] && <span className="absolute -top-0.5 -right-0.5 text-[0.55rem]">🚩</span>}</button> })}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-2 mb-4">{[{ cls: 'bg-[rgba(0,86,210,0.3)] border border-primary-500', label: 'Current' }, { cls: 'bg-emerald-50 border border-green-600', label: 'Answered' }, { cls: 'bg-transparent border border-amber-500', label: 'Flagged' }, { cls: 'bg-bg-deep border border-border-medium', label: 'Unanswered' }].map((d) => <div key={d.label} className="flex items-center gap-1 text-[0.72rem] text-text-muted"><span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${d.cls}`} />{d.label}</div>)}</div>
          <button type="button" className={`${btnSubmit} w-full`} onClick={() => { if (window.confirm(t('quiz.submitConfirm', { answered: answeredCount, total: questions.length }))) submitQuiz() }}>{t('quiz.submitCount', { answered: answeredCount, total: questions.length })}</button>
        </div>
      </div>
    </main></div>
  )
}

export default QuizPage
