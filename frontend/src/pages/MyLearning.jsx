import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { enrollmentApi, processApi, chapterApi, certificateApi, userApi } from '../api'
import './MyLearning.css'

const COURSE_PROGRESS_CACHE_KEY_PREFIX = 'unicode_course_progress_v1'
const normalizeId = (value) => String(value || '').trim().toLowerCase()
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const isValidId = (value) => {
  const normalized = normalizeId(value)
  return normalized.length > 0 && normalized !== ZERO_UUID && normalized !== 'null' && normalized !== 'undefined'
}
const uniqueIds = (values) => {
  const map = new Map()
  values.forEach((value) => {
    if (!isValidId(value)) return
    const key = normalizeId(value)
    if (!map.has(key)) map.set(key, String(value))
  })
  return Array.from(map.values())
}
const resolveLearnerId = (payload) =>
  payload?.userId ||
  payload?.id ||
  payload?.learnerId ||
  payload?.learner?.userId ||
  payload?.learner?.id ||
  ''

const extractList = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.content)) return payload.content
  if (Array.isArray(payload.data)) return payload.data
  return []
}

const getCourseId = (enrollment) =>
  enrollment?.courseId ||
  enrollment?.courseResponse?.courseId ||
  enrollment?.courseResponse?.id ||
  enrollment?.course?.courseId ||
  enrollment?.course?.id ||
  ''

const readCachedCourseProgress = (courseId) => {
  if (!courseId) return 0
  try {
    const raw = localStorage.getItem(`${COURSE_PROGRESS_CACHE_KEY_PREFIX}:${courseId}`)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    const percent = Number(parsed?.percent)
    return Number.isFinite(percent) ? percent : 0
  } catch {
    return 0
  }
}

const getEnrollmentTimestamp = (enrollment) => {
  const raw =
    enrollment?.updatedAt ||
    enrollment?.enrollmentDate ||
    enrollment?.createdAt ||
    ''
  const ts = Date.parse(raw)
  return Number.isNaN(ts) ? 0 : ts
}

const pickBestByCourseId = (list, progressByEnrollment) => {
  const map = new Map()
  for (const enrollment of list) {
    const courseId = getCourseId(enrollment)
    if (!courseId) continue

    const current = map.get(courseId)
    if (!current) {
      map.set(courseId, enrollment)
      continue
    }

    const currentProgress = progressByEnrollment[current?.enrollmentId] ?? 0
    const nextProgress = progressByEnrollment[enrollment?.enrollmentId] ?? 0
    if (nextProgress > currentProgress) {
      map.set(courseId, enrollment)
      continue
    }
    if (nextProgress === currentProgress) {
      const currentTs = getEnrollmentTimestamp(current)
      const nextTs = getEnrollmentTimestamp(enrollment)
      if (nextTs >= currentTs) {
        map.set(courseId, enrollment)
      }
    }
  }
  return Array.from(map.values())
}

const MyLearning = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [learnerId, setLearnerId] = useState('')
  const [learnerIdCandidates, setLearnerIdCandidates] = useState([])
  const [certifiedCourseIds, setCertifiedCourseIds] = useState(new Set())
  const [issueMessage, setIssueMessage] = useState('')
  const [issuingCourseId, setIssuingCourseId] = useState('')
  const [enrollments, setEnrollments] = useState([])
  const [progressByEnrollment, setProgressByEnrollment] = useState({})
  const [chapterCountByCourse, setChapterCountByCourse] = useState({})
  const fetchAllCertificates = async () => {
    const res = await certificateApi.getAll(0, 200)
    const payload = res?.data?.data ?? res?.data
    if (Array.isArray(payload?.content)) return payload.content
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload)) return payload
    return []
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
        const results = await Promise.all(
          statuses.map((s) =>
            enrollmentApi.getMyLearning(s, 0, 50).catch(() => ({ data: { data: { content: [] } } }))
          )
        )
        const allEnrollments = results.flatMap((res) => {
          const page = res.data?.data ?? res.data
          return extractList(page)
        })

        const progressMap = {}
        const courseChapterCountMap = {}
        const chapterListCache = {}

        await Promise.all(
          allEnrollments.map(async (enrollment) => {
            const courseId = getCourseId(enrollment)
            const enrollmentId = enrollment?.enrollmentId
            if (!isValidId(courseId) || !isValidId(enrollmentId)) return

            let chapters = chapterListCache[courseId]
            if (!chapters) {
              try {
                const chapterRes = await chapterApi.getByCourseId(courseId)
                const chapterPayload = chapterRes.data?.data ?? chapterRes.data
                chapters = Array.isArray(chapterPayload) ? chapterPayload : []
              } catch {
                chapters = []
              }
              chapterListCache[courseId] = chapters
              courseChapterCountMap[courseId] = chapters.length
            }

            let backendPercent = 0
            try {
              const progressRes = await processApi.getCourseProgress({ courseId, enrollmentId })
              const payload = progressRes.data?.data ?? progressRes.data
              backendPercent = typeof payload?.percentComplete === 'number' ? payload.percentComplete : 0
            } catch {
              backendPercent = 0
            }

            let chapterFallbackPercent = 0
            if (chapters.length > 0) {
              const chapterPercents = await Promise.all(
                chapters.map(async (chapter) => {
                  const chapterId = chapter?.chapterId || chapter?.id
                  if (!isValidId(chapterId)) return null
                  try {
                    const chapterProgressRes = await processApi.getChapterProgress({ chapterId, enrollmentId })
                    const chapterPayload = chapterProgressRes.data?.data ?? chapterProgressRes.data
                    return typeof chapterPayload?.percentComplete === 'number' ? chapterPayload.percentComplete : null
                  } catch {
                    return null
                  }
                }),
              )
              const validPercents = chapterPercents.filter((v) => typeof v === 'number')
              if (validPercents.length > 0) {
                chapterFallbackPercent = validPercents.reduce((sum, v) => sum + v, 0) / validPercents.length
              }
            }

            const cachedPercent = readCachedCourseProgress(courseId)
            progressMap[enrollmentId] = Math.max(backendPercent, chapterFallbackPercent, cachedPercent)
          }),
        )

        if (!cancelled) {
          const best = pickBestByCourseId(allEnrollments, progressMap)
          try {
            const meRes = await userApi.getMe()
            const me = meRes.data?.data ?? meRes.data
            const candidates = uniqueIds([
              resolveLearnerId(me),
              me?.userId,
              me?.id,
              me?.learnerId,
              resolveLearnerId(allEnrollments?.[0]),
              allEnrollments?.[0]?.learnerId,
              allEnrollments?.[0]?.userId,
            ])
            setLearnerIdCandidates(candidates)
            if (candidates.length > 0) {
              let selectedLearnerId = candidates[0]
              let certList = []
              for (const candidate of candidates) {
                try {
                  const certRes = await certificateApi.getByLearnerId(candidate)
                  certList = Array.isArray(certRes.data?.data ?? certRes.data) ? (certRes.data?.data ?? certRes.data) : []
                  selectedLearnerId = candidate
                  break
                } catch {
                  // try next candidate
                }
              }
              setLearnerId(selectedLearnerId)
              setCertifiedCourseIds(new Set(certList.map((c) => normalizeId(c?.courseId))))
            } else {
              setLearnerId('')
              setLearnerIdCandidates([])
            }
          } catch {
            // keep page usable even if cert list fails
          }
          setEnrollments(best)
          setProgressByEnrollment(progressMap)
          setChapterCountByCourse(courseChapterCountMap)
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e.response?.data?.message ||
            e.response?.data?.errorCode ||
            e.message ||
            'Không thể tải danh sách khóa học của bạn.'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const handleContinueLearning = (enrollment) => {
    const courseId = getCourseId(enrollment)
    const enrollmentId = enrollment?.enrollmentId
    if (!courseId || !enrollmentId) return
    navigate(`/learning/${courseId}?enrollmentId=${encodeURIComponent(enrollmentId)}`)
  }

  const handleIssueCertificate = async (courseId, enrollment) => {
    if (!learnerId || !courseId) return
    const courseIdCandidates = uniqueIds([
      courseId,
      enrollment?.courseId,
      enrollment?.courseResponse?.courseId,
      enrollment?.courseResponse?.id,
      enrollment?.course?.courseId,
      enrollment?.course?.id,
    ])
    const learnerCandidates = uniqueIds([...(learnerIdCandidates || []), learnerId])
    if (learnerCandidates.length === 0 || courseIdCandidates.length === 0) {
      setIssueMessage('Không thể cấp chứng chỉ: thiếu định danh hợp lệ (learnerId/courseId).')
      return
    }
    if (courseIdCandidates.some((id) => certifiedCourseIds.has(normalizeId(id)))) {
      setIssueMessage('Chứng chỉ đã tồn tại cho khóa học này.')
      return
    }
    setIssuingCourseId(courseId)
    setIssueMessage('')
    try {
      let created = false
      let lastError = null
      for (const learnerCandidate of learnerCandidates) {
        for (const courseCandidate of courseIdCandidates) {
          try {
            await certificateApi.create({ learnerId: learnerCandidate, courseId: courseCandidate })
            setLearnerId(learnerCandidate)
            created = true
            break
          } catch (err) {
            const code = err?.response?.data?.errorCode || ''
            if (String(code).includes('CERTIFICATE_ALREADY_EXISTS')) {
              setLearnerId(learnerCandidate)
              created = true
              break
            }
            lastError = err
          }
        }
        if (created) break
      }
      if (!created) throw lastError || new Error('Cấp chứng chỉ thất bại.')
      setIssueMessage('Đã cấp chứng chỉ thành công. Vào My Certificates để xem.')
      setCertifiedCourseIds((prev) => {
        const next = new Set(prev)
        courseIdCandidates.forEach((id) => next.add(normalizeId(id)))
        return next
      })
    } catch (e) {
      const code = e?.response?.data?.errorCode || ''
      if (String(code).includes('CERTIFICATE_ALREADY_EXISTS')) {
        setIssueMessage('Chứng chỉ đã tồn tại cho khóa học này.')
        setCertifiedCourseIds((prev) => {
          const next = new Set(prev)
          courseIdCandidates.forEach((id) => next.add(normalizeId(id)))
          return next
        })
      } else {
        try {
          const certRes = await certificateApi.getByLearnerId(learnerCandidates[0])
          const certList = Array.isArray(certRes.data?.data ?? certRes.data) ? (certRes.data?.data ?? certRes.data) : []
          const existsNow = certList.some((c) => courseIdCandidates.some((id) => normalizeId(c?.courseId) === normalizeId(id)))
          if (existsNow) {
            setIssueMessage('Chứng chỉ đã được tạo thành công. Vào My Certificates để xem.')
            setCertifiedCourseIds((prev) => {
              const next = new Set(prev)
              courseIdCandidates.forEach((id) => next.add(normalizeId(id)))
              return next
            })
            return
          }
        } catch {
          // ignore secondary check errors
        }
        try {
          const allCerts = await fetchAllCertificates()
          const existsByCourse = allCerts.some((c) =>
            courseIdCandidates.some((id) => normalizeId(c?.courseId) === normalizeId(id)),
          )
          if (existsByCourse) {
            setIssueMessage('Khóa học đã có chứng chỉ trên hệ thống. Vào My Certificates và bấm Đồng bộ chứng chỉ.')
            setCertifiedCourseIds((prev) => {
              const next = new Set(prev)
              courseIdCandidates.forEach((id) => next.add(normalizeId(id)))
              return next
            })
            return
          }
        } catch {
          // ignore all-cert fallback errors
        }
        const details = e?.response?.data?.message || e?.response?.data?.errorCode || e?.message || 'Cấp chứng chỉ thất bại.'
        setIssueMessage(`Cấp chứng chỉ thất bại: ${details} (learnerId=${learnerCandidates[0]}, courseId=${courseIdCandidates[0]})`)
      }
    } finally {
      setIssuingCourseId('')
    }
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '0%'
    const n = Number(value)
    if (Number.isNaN(n)) return '0%'
    return `${Math.round(n)}%`
  }

  return (
    <div className="mylearning">
      <Header />
      <main className="mylearning-main">
        <div className="mylearning-header">
          <div>
            <h1>My Learning</h1>
            <p>Các khóa học bạn đã ghi danh và đang học.</p>
          </div>
          <div className="mylearning-actions">
            <Link to="/courses" className="mylearning-btn mylearning-btn-ghost">
              ← Khám phá thêm khóa học
            </Link>
          </div>
        </div>

        {!!issueMessage && (
          <div className="mylearning-loading">{issueMessage}</div>
        )}

        {loading && <div className="mylearning-loading">Đang tải khóa học...</div>}

        {!loading && error && (
          <div className="mylearning-error">
            <strong>Lỗi tải My Learning</strong>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && enrollments.length === 0 && (
          <div className="mylearning-empty">
            Bạn chưa có khóa học nào. Hãy chọn một khóa ở trang Courses và thanh toán để bắt đầu học.
          </div>
        )}

        {!loading && !error && enrollments.length > 0 && (
          <div className="mylearning-grid">
            {enrollments.map((e) => {
              const course = e.courseResponse || {}
              const percent = progressByEnrollment[e.enrollmentId] ?? 0
              const courseId = getCourseId(e)
              const chapterCount = chapterCountByCourse[courseId]
              const displayStatus = percent >= 99.99 ? 'COMPLETED' : (e.statusCourse || 'IN_PROGRESS')
              const statusClass = displayStatus === 'COMPLETED'
                ? 'is-completed'
                : displayStatus === 'IN_PROGRESS'
                  ? 'is-progress'
                  : 'is-not-started'
              return (
                <article key={e.enrollmentId} className={`mylearning-card ${statusClass}`}>
                  <div className="mylearning-card-top">
                    <div className="mylearning-card-title">{course.title || 'Khóa học'}</div>
                    <span className={`mylearning-pill ${statusClass}`}>{displayStatus}</span>
                  </div>
                  {course.instructorName && (
                    <p className="mylearning-card-instructor">GV: {course.instructorName}</p>
                  )}
                  {course.description && (
                    <p className="mylearning-card-desc">{course.description}</p>
                  )}
                  <div className="mylearning-card-meta">
                    {Number(chapterCount) >= 0 && (
                      <span className="mylearning-chapters">{chapterCount} chương</span>
                    )}
                    <span className="mylearning-progress-text">
                      Tiến trình: {formatPercent(percent)}
                    </span>
                  </div>
                  <div className="mylearning-progress-bar-wrap">
                    <div className="mylearning-progress-bar-bg">
                      <div
                        className="mylearning-progress-bar-fill"
                        style={{ width: formatPercent(percent) }}
                      />
                    </div>
                  </div>
                  <div className="mylearning-card-actions">
                    <button
                      type="button"
                      className="mylearning-btn mylearning-btn-primary mylearning-card-link"
                      onClick={() => handleContinueLearning(e)}
                    >
                      Tiếp tục học
                    </button>
                    {percent >= 99.99 && (
                      <button
                        type="button"
                        className="mylearning-btn mylearning-btn-ghost mylearning-card-link"
                        onClick={() => handleIssueCertificate(courseId, e)}
                        disabled={!learnerId || issuingCourseId === courseId || certifiedCourseIds.has(normalizeId(courseId))}
                      >
                        {certifiedCourseIds.has(normalizeId(courseId))
                          ? 'Đã có chứng chỉ'
                          : issuingCourseId === courseId
                            ? 'Đang cấp...'
                            : 'Nhận chứng chỉ'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyLearning

