import { useEffect, useState } from 'react'
import Header from '../components/layout/Header'
import { certificateApi, userApi } from '../api'
import './MyCertificates.css'

const MyCertificates = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [certs, setCerts] = useState([])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // Lấy learnerId từ /users/me
        const meRes = await userApi.getMe()
        const me = meRes.data?.data ?? meRes.data
        const learnerId = me?.userId || me?.id
        if (!learnerId) {
          throw new Error('Không xác định được learnerId từ API /users/me.')
        }
        const res = await certificateApi.getByLearnerId(learnerId)
        const payload = res.data?.data ?? res.data
        const list = Array.isArray(payload) ? payload : []
        if (!cancelled) {
          setCerts(list)
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e.response?.data?.message ||
            e.response?.data?.errorCode ||
            e.message ||
            'Không thể tải danh sách chứng chỉ.'
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
        </div>

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

