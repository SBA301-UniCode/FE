import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { processApi, questionBankApi, contentApi } from '../api'
import './QuizPage.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const getContentId = (content) => content?.contentId || content?.id || ''
const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const QuizPage = () => {
  const { contentId } = useParams()
  const [searchParams] = useSearchParams()
  const enrollmentId = searchParams.get('enrollmentId') || ''
  const courseId = searchParams.get('courseId') || ''
  const lessonId = searchParams.get('lessonId') || contentId
  const chapterId = searchParams.get('chapterId') || ''
  const selectedContentId = searchParams.get('contentId') || contentId
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [questions, setQuestions] = useState([])
  const [realContentId, setRealContentId] = useState(null)

  const [phase, setPhase] = useState('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState({})
  const [timeLeft, setTimeLeft] = useState(600)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)

  const DURATION = 600
  const PASS_SCORE = 60

  useEffect(() => {
    if (!lessonId) { setLoadError('Không tìm thấy bài giảng.'); setLoading(false); return }
    setLoading(true); setLoadError('')

    const loadQuestions = questionBankApi.getByLessonId(lessonId, 0, 100)
      .then((res) => {
        const raw = unwrap(res)
        const items = raw?.content ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        if (!items.length) { setLoadError('Bài giảng này chưa có câu hỏi nào.'); return }
        const mapped = items.map((q) => ({
          questionBankId: q.questionBankId,
          text: q.questionText,
          imageUrl: q.imageUrl,
          type: q.questionType || 'MULTIPLE_CHOICE',
          options: (q.options || []).map((o) => ({
            optionId: o.optionId,
            text: o.answerText,
            isCorrect: o.isCorrect || o.correct,
          })),
        }))
        setQuestions(mapped)
      })
      .catch((err) => { setLoadError(err.response?.data?.message || err.message || 'Không tải được câu hỏi.') })

    const resolveContentId = contentApi.getByLessonId(lessonId)
      .then((res) => {
        const contents = Array.isArray(unwrap(res)) ? unwrap(res) : []
        const quizContent = contents.find((c) => c.contentType === 'QUIZ')
        const id = getContentId(quizContent)
        if (isUuid(id)) setRealContentId(id)
      })
      .catch(() => {})

    Promise.all([loadQuestions, resolveContentId]).finally(() => setLoading(false))
  }, [lessonId])

  const startQuiz = useCallback(() => {
    setPhase('taking')
    setTimeLeft(DURATION)
    setAnswers({})
    setFlagged({})
    setCurrentIdx(0)
    setResult(null)
  }, [])

  useEffect(() => {
    if (phase !== 'taking') return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const submitQuiz = useCallback(() => {
    clearInterval(timerRef.current)
    let correct = 0
    questions.forEach((q) => {
      const selected = answers[q.questionBankId]
      const correctOpt = q.options.find((o) => o.isCorrect)
      if (selected && correctOpt && String(selected) === String(correctOpt.optionId)) correct++
    })
    const score = Math.round((correct / questions.length) * 100)
    const passed = score >= PASS_SCORE
    setResult({ correct, total: questions.length, score, passed })
    setPhase('result')

    const trackId = realContentId || contentId
    if (isUuid(trackId) && enrollmentId) {
      const status = passed ? 'COMPLETED' : 'IN_PROCESS'
      processApi.trackContent({ contentId: trackId, enrollmentId, status })
        .then(() => {
          if (courseId) processApi.getCourseProgress({ courseId, enrollmentId }).catch(() => {})
        })
        .catch(() => {})
    }
  }, [answers, questions, contentId, enrollmentId, realContentId, courseId])

  useEffect(() => {
    if (phase === 'taking' && timeLeft <= 0) submitQuiz()
  }, [timeLeft, phase, submitQuiz])

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])
  const currentQ = questions[currentIdx]

  const handleSelect = (optionId) => {
    if (!currentQ) return
    setAnswers((prev) => ({ ...prev, [currentQ.questionBankId]: optionId }))
  }

  const toggleFlag = () => {
    if (!currentQ) return
    setFlagged((prev) => ({ ...prev, [currentQ.questionBankId]: !prev[currentQ.questionBankId] }))
  }

  const goBack = () => {
    if (!courseId) {
      navigate(-1)
      return
    }
    const params = new URLSearchParams()
    if (enrollmentId) params.set('enrollmentId', enrollmentId)
    if (lessonId) params.set('lessonId', lessonId)
    if (chapterId) params.set('chapterId', chapterId)
    if (selectedContentId) params.set('contentId', selectedContentId)
    navigate(`/learning/${courseId}?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="quiz-page">
        <Header />
        <main className="quiz-page-main">
          <div className="quiz-intro-card"><p style={{ textAlign: 'center', padding: '2rem' }}>Đang tải câu hỏi...</p></div>
        </main>
      </div>
    )
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="quiz-page">
        <Header />
        <main className="quiz-page-main">
          <div className="quiz-intro-card">
            <div className="quiz-intro-icon">⚠️</div>
            <h1>Chưa có bài kiểm tra</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{loadError || 'Bài giảng này chưa có câu hỏi nào.'}</p>
            <div className="quiz-intro-actions">
              <button type="button" className="quiz-btn quiz-btn-ghost" onClick={goBack}>Quay lại</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="quiz-page">
        <Header />
        <main className="quiz-page-main">
          <div className="quiz-intro-card">
            <div className="quiz-intro-icon">📝</div>
            <h1>Bài kiểm tra</h1>
            <div className="quiz-intro-meta">
              <div className="quiz-intro-meta-item">
                <span className="quiz-intro-meta-label">Số câu hỏi</span>
                <span className="quiz-intro-meta-value">{questions.length}</span>
              </div>
              <div className="quiz-intro-meta-item">
                <span className="quiz-intro-meta-label">Thời gian</span>
                <span className="quiz-intro-meta-value">{formatTime(DURATION)}</span>
              </div>
              <div className="quiz-intro-meta-item">
                <span className="quiz-intro-meta-label">Điểm đạt</span>
                <span className="quiz-intro-meta-value">{PASS_SCORE}%</span>
              </div>
            </div>
            <div className="quiz-intro-rules">
              <h3>Lưu ý trước khi làm bài</h3>
              <ul>
                <li>Đồng hồ sẽ bắt đầu đếm ngay khi bạn nhấn "Bắt đầu".</li>
                <li>Bạn có thể đánh dấu câu hỏi để xem lại sau.</li>
                <li>Bài kiểm tra sẽ tự động nộp khi hết thời gian.</li>
                <li>Mỗi câu hỏi chỉ có một đáp án đúng.</li>
              </ul>
            </div>
            <div className="quiz-intro-actions">
              <button type="button" className="quiz-btn quiz-btn-primary quiz-btn-lg" onClick={startQuiz}>
                Bắt đầu làm bài
              </button>
              <button type="button" className="quiz-btn quiz-btn-ghost" onClick={goBack}>
                Quay lại
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'result' && result) {
    return (
      <div className="quiz-page">
        <Header />
        <main className="quiz-page-main">
          <div className="quiz-result-card">
            <div className={`quiz-result-badge ${result.passed ? 'quiz-result-badge--pass' : 'quiz-result-badge--fail'}`}>
              {result.passed ? '🎉' : '😔'}
            </div>
            <h1>{result.passed ? 'Chúc mừng! Bạn đã đạt!' : 'Chưa đạt yêu cầu'}</h1>
            <p className="quiz-result-subtitle">
              {result.passed
                ? 'Bạn đã vượt qua bài kiểm tra thành công.'
                : `Bạn cần đạt tối thiểu ${PASS_SCORE}% để vượt qua.`}
            </p>

            <div className="quiz-result-stats">
              <div className="quiz-result-score-ring">
                <svg viewBox="0 0 120 120" className="quiz-result-svg">
                  <circle cx="60" cy="60" r="52" className="quiz-result-ring-bg" />
                  <circle
                    cx="60" cy="60" r="52"
                    className={`quiz-result-ring-fill ${result.passed ? 'quiz-result-ring-fill--pass' : 'quiz-result-ring-fill--fail'}`}
                    strokeDasharray={`${(result.score / 100) * 327} 327`}
                  />
                </svg>
                <div className="quiz-result-score-text">
                  <span className="quiz-result-score-num">{result.score}</span>
                  <span className="quiz-result-score-pct">%</span>
                </div>
              </div>
              <div className="quiz-result-detail-grid">
                <div className="quiz-result-detail">
                  <span className="quiz-result-detail-value quiz-result-detail-correct">{result.correct}</span>
                  <span className="quiz-result-detail-label">Đúng</span>
                </div>
                <div className="quiz-result-detail">
                  <span className="quiz-result-detail-value quiz-result-detail-wrong">{result.total - result.correct}</span>
                  <span className="quiz-result-detail-label">Sai</span>
                </div>
                <div className="quiz-result-detail">
                  <span className="quiz-result-detail-value">{result.total}</span>
                  <span className="quiz-result-detail-label">Tổng câu</span>
                </div>
              </div>
            </div>

            <div className="quiz-review">
              <h3>Đáp án chi tiết</h3>
              {questions.map((q, i) => {
                const userAns = answers[q.questionBankId]
                const correctOpt = q.options.find((o) => o.isCorrect)
                const isCorrect = userAns && correctOpt && String(userAns) === String(correctOpt.optionId)
                return (
                  <div key={q.questionBankId} className={`quiz-review-item ${isCorrect ? 'quiz-review-item--correct' : 'quiz-review-item--wrong'}`}>
                    <div className="quiz-review-q-header">
                      <span className="quiz-review-q-num">Câu {i + 1}</span>
                      <span className={`quiz-review-q-badge ${isCorrect ? 'quiz-review-q-badge--correct' : 'quiz-review-q-badge--wrong'}`}>
                        {isCorrect ? 'Đúng' : 'Sai'}
                      </span>
                    </div>
                    <p className="quiz-review-q-text">{q.text}</p>
                    <div className="quiz-review-options">
                      {q.options.map((opt) => {
                        let cls = 'quiz-review-opt'
                        if (opt.isCorrect) cls += ' quiz-review-opt--correct'
                        if (String(opt.optionId) === String(userAns) && !opt.isCorrect) cls += ' quiz-review-opt--wrong'
                        return (
                          <div key={opt.optionId} className={cls}>
                            <span className="quiz-review-opt-marker">
                              {opt.isCorrect ? '✓' : String(opt.optionId) === String(userAns) ? '✗' : ''}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="quiz-result-actions">
              <button type="button" className="quiz-btn quiz-btn-primary" onClick={startQuiz}>Làm lại</button>
              <button type="button" className="quiz-btn quiz-btn-ghost" onClick={goBack}>Quay lại khóa học</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!currentQ) return null

  return (
    <div className="quiz-page">
      <Header />
      <main className="quiz-page-main">
        <div className="quiz-taking-layout">
          <div className="quiz-question-panel">
            <div className="quiz-question-top">
              <div className="quiz-question-num">
                Câu {currentIdx + 1} <span className="quiz-question-total">/ {questions.length}</span>
              </div>
              <div className={`quiz-timer ${timeLeft <= 60 ? 'quiz-timer--warn' : ''}`}>
                ⏱ {formatTime(timeLeft)}
              </div>
            </div>

            {currentQ.type === 'TRUE_FALSE' && <span className="quiz-question-type-tag">Đúng / Sai</span>}
            {currentQ.type === 'MULTIPLE_CHOICE' && <span className="quiz-question-type-tag">Trắc nghiệm</span>}

            <div className="quiz-question-text">{currentQ.text}</div>
            {currentQ.imageUrl && <img src={currentQ.imageUrl} alt="" className="quiz-question-img" />}

            <div className="quiz-options-list">
              {currentQ.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i)
                const selected = String(answers[currentQ.questionBankId]) === String(opt.optionId)
                return (
                  <button
                    key={opt.optionId}
                    type="button"
                    className={`quiz-option-card ${selected ? 'quiz-option-card--selected' : ''}`}
                    onClick={() => handleSelect(opt.optionId)}
                  >
                    <span className={`quiz-option-letter ${selected ? 'quiz-option-letter--selected' : ''}`}>{letter}</span>
                    <span className="quiz-option-text">{opt.text}</span>
                  </button>
                )
              })}
            </div>

            <div className="quiz-question-actions">
              <button type="button" className="quiz-btn quiz-btn-ghost quiz-btn-sm" onClick={toggleFlag}>
                {flagged[currentQ.questionBankId] ? '🚩 Bỏ đánh dấu' : '🏳️ Đánh dấu xem lại'}
              </button>
              <div className="quiz-nav-btns">
                <button type="button" className="quiz-btn quiz-btn-outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((p) => p - 1)}>
                  ← Trước
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button type="button" className="quiz-btn quiz-btn-primary" onClick={() => setCurrentIdx((p) => p + 1)}>
                    Tiếp →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quiz-btn quiz-btn-submit"
                    onClick={() => { if (window.confirm(`Bạn đã trả lời ${answeredCount}/${questions.length} câu. Nộp bài?`)) submitQuiz() }}
                  >
                    Nộp bài
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="quiz-nav-sidebar">
            <div className="quiz-nav-sidebar-header">
              <h3>Danh sách câu hỏi</h3>
              <div className="quiz-nav-progress">{answeredCount}/{questions.length} đã trả lời</div>
            </div>
            <div className="quiz-nav-grid">
              {questions.map((q, i) => {
                let cls = 'quiz-nav-cell'
                if (i === currentIdx) cls += ' quiz-nav-cell--current'
                if (answers[q.questionBankId]) cls += ' quiz-nav-cell--answered'
                if (flagged[q.questionBankId]) cls += ' quiz-nav-cell--flagged'
                return (
                  <button key={q.questionBankId} type="button" className={cls} onClick={() => setCurrentIdx(i)}>
                    {i + 1}
                    {flagged[q.questionBankId] && <span className="quiz-nav-flag">🚩</span>}
                  </button>
                )
              })}
            </div>
            <div className="quiz-nav-legend">
              <div className="quiz-nav-legend-item"><span className="quiz-nav-dot quiz-nav-dot--current" /> Đang xem</div>
              <div className="quiz-nav-legend-item"><span className="quiz-nav-dot quiz-nav-dot--answered" /> Đã trả lời</div>
              <div className="quiz-nav-legend-item"><span className="quiz-nav-dot quiz-nav-dot--flagged" /> Đánh dấu</div>
              <div className="quiz-nav-legend-item"><span className="quiz-nav-dot quiz-nav-dot--empty" /> Chưa trả lời</div>
            </div>
            <button
              type="button"
              className="quiz-btn quiz-btn-submit quiz-btn-full"
              onClick={() => { if (window.confirm(`Bạn đã trả lời ${answeredCount}/${questions.length} câu. Nộp bài?`)) submitQuiz() }}
            >
              Nộp bài ({answeredCount}/{questions.length})
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default QuizPage
