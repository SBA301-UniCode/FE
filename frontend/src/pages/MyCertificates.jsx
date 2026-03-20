import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { certificateApi } from '../api'
import './MyCertificates.css'

const getCertificateImageUrl = (cert) =>
  String(cert?.certicateUrl || cert?.certificateUrl || cert?.imageUrl || '').trim()

const MyCertificates = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [certificates, setCertificates] = useState([])

  useEffect(() => {
    let cancelled = false

    const fetchCertificates = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await certificateApi.getMyList()
        const payload = res?.data?.data ?? res?.data
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.content) ? payload.content : [])
        if (!cancelled) setCertificates(list)
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

    fetchCertificates()
    return () => { cancelled = true }
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="mycerts">
      <Header />
      <main className="mycerts-main">
        <div className="mycerts-header">
          <div>
            <h1>Chứng chỉ của tôi</h1>
            <p>Tất cả chứng chỉ bạn đã nhận được.</p>
          </div>
          <div className="mycerts-actions">
            <Link to="/my-learning" className="mycerts-btn mycerts-btn-ghost">
              ← Quay lại My Learning
            </Link>
          </div>
        </div>

        {loading && <div className="mycerts-loading">Đang tải chứng chỉ...</div>}

        {!loading && error && (
          <div className="mycerts-error">
            <strong>Lỗi</strong>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && certificates.length === 0 && (
          <div className="mycerts-empty">
            Bạn chưa có chứng chỉ nào. Hoàn thành một khóa học để nhận chứng chỉ!
          </div>
        )}

        {!loading && !error && certificates.length > 0 && (
          <div className="mycerts-grid">
            {certificates.map((cert) => (
              <article key={cert.certificateId} className="mycerts-card">
                <div className="mycerts-card-badge">🎓 Chứng chỉ</div>
                <h3 className="mycerts-card-title">{cert.courseTitle || 'Khóa học'}</h3>
                {cert.instructorName && (
                  <p className="mycerts-card-instructor">Giảng viên: {cert.instructorName}</p>
                )}
                <div className="mycerts-card-info">
                  <div className="mycerts-card-row">
                    <span className="mycerts-label">Mã chứng chỉ:</span>
                    <span className="mycerts-serial">{cert.serialNumber || '—'}</span>
                  </div>
                  <div className="mycerts-card-row">
                    <span className="mycerts-label">Ngày cấp:</span>
                    <span>{formatDate(cert.certificateDate || cert.createdAt)}</span>
                  </div>
                  <div className="mycerts-card-row">
                    <span className="mycerts-label">Học viên:</span>
                    <span>{cert.learnerName || '—'}</span>
                  </div>
                </div>
                <div className="mycerts-card-actions">
                  {getCertificateImageUrl(cert) && (
                    <a
                      href={getCertificateImageUrl(cert)}
                      target="_blank"
                      rel="noreferrer"
                      className="mycerts-btn mycerts-btn-ghost"
                    >
                      Xem ảnh chứng chỉ
                    </a>
                  )}
                  {cert.serialNumber && (
                    <Link
                      to={`/verify-certificate?code=${cert.serialNumber}`}
                      className="mycerts-btn mycerts-btn-primary"
                    >
                      Xem trang xác minh
                    </Link>
                  )}
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
