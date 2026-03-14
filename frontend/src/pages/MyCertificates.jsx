import { useEffect, useState } from 'react'
import Header from '../components/layout/Header'
import { certificateApi, userApi, enrollmentApi, processApi, chapterApi } from '../api'
import './MyCertificates.css'

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

const MyCertificates = () => {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [certs, setCerts] = useState([])
  const [learnerId, setLearnerId] = useState('')
  const fetchAllCertificates = async () => {
    const res = await certificateApi.getAll(0, 200)
    const payload = res?.data?.data ?? res?.data
    if (Array.isArray(payload?.content)) return payload.content
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload)) return payload
    return []
  }

  const loadCertificates = async (id) => {
    if (!isValidId(id)) return []
    const res = await certificateApi.getByLearnerId(id)
    const payload = res.data?.data ?? res.data
    return Array.isArray(payload) ? payload : []
  }

  const syncCertificates = async (id) => {
    setSyncing(true)
    setSyncMessage('')
    if (!isValidId(id)) {
      setSyncMessage('Không thể đồng bộ chứng chỉ: learnerId không hợp lệ.')
      setSyncing(false)
      return
    }
    try {
      const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
      const results = await Promise.all(
        statuses.map((status) =>
          enrollmentApi.getMyLearning(status, 0, 50).catch(() => ({ data: { data: { content: [] } } })),
        ),
      )
      const enrollments = results.flatMap((res) => extractList(res.data?.data ?? res.data))
      const progressByEnrollmentId = {}
      const chapterPercentCache = {}

      const existingCerts = await loadCertificates(id)
      const existingCourseIds = new Set(existingCerts.map((c) => normalizeId(c.courseId)))
      let createdCount = 0

      for (const enrollment of enrollments) {
        const courseId = getCourseId(enrollment)
        const enrollmentId = enrollment?.enrollmentId
        if (!isValidId(courseId) || !isValidId(enrollmentId)) continue
        if (progressByEnrollmentId[enrollmentId] !== undefined) continue

        let coursePercent = 0
        try {
          const res = await processApi.getCourseProgress({ courseId, enrollmentId })
          const payload = res.data?.data ?? res.data
          coursePercent = typeof payload?.percentComplete === 'number' ? payload.percentComplete : 0
        } catch {
          coursePercent = 0
        }

        let chapterFallbackPercent = 0
        try {
          let chapters = chapterPercentCache[courseId]
          if (!chapters) {
            const chapterRes = await chapterApi.getByCourseId(courseId)
            const chapterPayload = chapterRes.data?.data ?? chapterRes.data
            chapters = Array.isArray(chapterPayload) ? chapterPayload : []
            chapterPercentCache[courseId] = chapters
          }
          if (chapters.length > 0) {
            const values = await Promise.all(chapters.map(async (chapter) => {
              const chapterId = chapter?.chapterId || chapter?.id
              if (!isValidId(chapterId)) return null
              try {
                const pRes = await processApi.getChapterProgress({ chapterId, enrollmentId })
                const pPayload = pRes.data?.data ?? pRes.data
                return typeof pPayload?.percentComplete === 'number' ? pPayload.percentComplete : null
              } catch {
                return null
              }
            }))
            const valid = values.filter((v) => typeof v === 'number')
            if (valid.length > 0) chapterFallbackPercent = valid.reduce((sum, value) => sum + value, 0) / valid.length
          }
        } catch {
          chapterFallbackPercent = 0
        }

        const finalPercent = Math.max(coursePercent, chapterFallbackPercent)
        progressByEnrollmentId[enrollmentId] = finalPercent
      }

      // Pick best enrollment by course using highest computed percent.
      const bestEnrollmentByCourse = new Map()
      enrollments.forEach((enrollment) => {
        const courseId = getCourseId(enrollment)
        const enrollmentId = enrollment?.enrollmentId
        if (!isValidId(courseId) || !isValidId(enrollmentId)) return
        const currentBest = bestEnrollmentByCourse.get(courseId)
        if (!currentBest) {
          bestEnrollmentByCourse.set(courseId, enrollment)
          return
        }
        const currentPercent = Number(progressByEnrollmentId[currentBest.enrollmentId] ?? 0)
        const nextPercent = Number(progressByEnrollmentId[enrollmentId] ?? 0)
        if (nextPercent > currentPercent) {
          bestEnrollmentByCourse.set(courseId, enrollment)
        }
      })

      const completedCourseIdKeys = new Set()
      for (const enrollment of bestEnrollmentByCourse.values()) {
        const courseId = getCourseId(enrollment)
        const enrollmentId = enrollment?.enrollmentId
        if (!courseId || !enrollmentId) continue
        const courseCandidates = uniqueIds([
          courseId,
          enrollment?.courseId,
          enrollment?.courseResponse?.courseId,
          enrollment?.courseResponse?.id,
          enrollment?.course?.courseId,
          enrollment?.course?.id,
        ])
        if (courseCandidates.some((candidate) => existingCourseIds.has(normalizeId(candidate)))) continue
        const finalPercent = Number(progressByEnrollmentId[enrollmentId] ?? 0)
        if (finalPercent < 99.99) continue
        courseCandidates.forEach((candidate) => completedCourseIdKeys.add(normalizeId(candidate)))

        let created = false
        let lastError = null
        for (const courseCandidate of courseCandidates) {
          try {
            await certificateApi.create({ learnerId: id, courseId: courseCandidate })
            existingCourseIds.add(normalizeId(courseCandidate))
            createdCount += 1
            created = true
            break
          } catch (err) {
            const c = err?.response?.data?.errorCode || ''
            if (String(c).includes('CERTIFICATE_ALREADY_EXISTS')) {
              existingCourseIds.add(normalizeId(courseCandidate))
              created = true
              break
            }
            lastError = err
          }
        }
        if (created) continue

        // Backend may return 500 even if row was created; verify by refetching.
        try {
          const afterFail = await loadCertificates(id)
          const appeared = afterFail.some((c) => courseCandidates.some((candidate) => normalizeId(c?.courseId) === normalizeId(candidate)))
          if (appeared) {
            courseCandidates.forEach((candidate) => existingCourseIds.add(normalizeId(candidate)))
            createdCount += 1
            continue
          }
        } catch {
          // ignore learner-list fallback errors
        }

        // Final fallback: certificates may already exist globally for course (backend one-to-one course relation).
        try {
          const globalCerts = await fetchAllCertificates()
          const existsGlobal = globalCerts.some((c) => courseCandidates.some((candidate) => normalizeId(c?.courseId) === normalizeId(candidate)))
          if (existsGlobal) {
            courseCandidates.forEach((candidate) => existingCourseIds.add(normalizeId(candidate)))
          } else if (lastError) {
            // keep lastError for summary message only
            setSyncMessage(lastError?.response?.data?.message || lastError?.message || '')
          }
        } catch {
          // ignore global fallback errors
        }
      }

      const refreshed = await loadCertificates(id)
      if (refreshed.length > 0) {
        setCerts(refreshed)
      } else {
        try {
          const globalCerts = await fetchAllCertificates()
          const fallbackCerts = globalCerts.filter((c) => completedCourseIdKeys.has(normalizeId(c?.courseId)))
          setCerts(fallbackCerts)
        } catch {
          setCerts(refreshed)
        }
      }
      setSyncMessage(createdCount > 0 ? `Đã đồng bộ và tạo ${createdCount} chứng chỉ mới.` : 'Đồng bộ xong. Nếu backend báo 500, hệ thống sẽ dùng chứng chỉ có sẵn theo khóa học.')
    } catch (e) {
      setSyncMessage(e?.response?.data?.message || e?.message || 'Đồng bộ chứng chỉ thất bại.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // Lấy learnerId từ /users/me
        const meRes = await userApi.getMe().catch(() => null)
        const me = meRes ? (meRes.data?.data ?? meRes.data) : null
        let resolvedLearnerId = resolveLearnerId(me)
        if (!isValidId(resolvedLearnerId)) {
          const enrollmentRes = await enrollmentApi.getMyLearning('IN_PROGRESS', 0, 1).catch(() => null)
          const enrollmentPage = enrollmentRes ? (enrollmentRes.data?.data ?? enrollmentRes.data) : null
          const firstEnrollment = extractList(enrollmentPage)[0]
          resolvedLearnerId = resolveLearnerId(firstEnrollment)
        }
        const learnerCandidates = uniqueIds([resolvedLearnerId, me?.userId, me?.id, me?.learnerId])
        if (learnerCandidates.length === 0) {
          throw new Error('Không xác định được learnerId từ API /users/me.')
        }
        let selectedLearnerId = learnerCandidates[0]
        let list = []
        for (const candidate of learnerCandidates) {
          try {
            list = await loadCertificates(candidate)
            selectedLearnerId = candidate
            break
          } catch {
            // try next candidate
          }
        }
        if (!cancelled) {
          setLearnerId(selectedLearnerId)
          setCerts(list)
        }
      } catch (e) {
        if (!cancelled) {
          try {
            const enrollRes = await enrollmentApi.getMyLearning('COMPLETED', 0, 100)
            const enrollPage = enrollRes?.data?.data ?? enrollRes?.data
            const enrolledCourses = extractList(enrollPage).map((enroll) => normalizeId(getCourseId(enroll)))
            const globalCerts = await fetchAllCertificates()
            const fallback = globalCerts.filter((c) => enrolledCourses.includes(normalizeId(c?.courseId)))
            setCerts(fallback)
            setError('')
            setSyncMessage(
              fallback.length > 0
                ? 'Đang hiển thị chứng chỉ theo khóa học đã hoàn thành (fallback từ backend).'
                : 'Chưa tải được chứng chỉ theo learnerId. Hãy bấm Đồng bộ chứng chỉ.',
            )
          } catch {
            const msg =
              e.response?.data?.message ||
              e.response?.data?.errorCode ||
              e.message ||
              'Không thể tải danh sách chứng chỉ.'
            setError(msg)
          }
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

  const formatDate = (value) => {
    if (!value) return ''
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString('vi-VN')
    } catch {
      return ''
    }
  }

  return (
    <div className="mycerts">
      <Header />
      <main className="mycerts-main">
        <div className="mycerts-header">
          <div>
            <h1>My Certificates</h1>
            <p>Các chứng chỉ bạn đã nhận được khi hoàn thành khóa học.</p>
          </div>
          <button
            type="button"
            className="mycerts-sync-btn"
            onClick={() => learnerId && syncCertificates(learnerId)}
            disabled={!learnerId || syncing || loading}
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ chứng chỉ'}
          </button>
        </div>

        {!!syncMessage && <div className="mycerts-loading">{syncMessage}</div>}
        {loading && <div className="mycerts-loading">Đang tải chứng chỉ...</div>}

        {!loading && error && (
          <div className="mycerts-error">
            <strong>Lỗi tải chứng chỉ</strong>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && certs.length === 0 && (
          <div className="mycerts-empty">
            Bạn chưa có chứng chỉ nào. Hãy hoàn thành 100% ít nhất một khóa học để nhận chứng chỉ.
          </div>
        )}

        {!loading && !error && certs.length > 0 && (
          <div className="mycerts-grid">
            {certs.map((c) => (
              <article key={c.certificateId} className="mycerts-card">
                <div className="mycerts-card-title">{c.courseTitle || 'Khóa học'}</div>
                <div className="mycerts-card-learner">
                  {c.learnerName || c.learnerEmail || 'Learner'}
                </div>
                <div className="mycerts-card-meta">
                  <span>Mã chứng chỉ: {c.certificateId}</span>
                  <span>Ngày cấp: {formatDate(c.certificateDate || c.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyCertificates

