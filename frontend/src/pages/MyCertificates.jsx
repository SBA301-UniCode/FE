import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
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
      setLoading(true); setError('')
      try {
        const res = await certificateApi.getMyList()
        const payload = res?.data?.data ?? res?.data
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.content) ? payload.content : [])
        if (!cancelled) setCertificates(list)
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Không thể tải danh sách chứng chỉ.')
      } finally { if (!cancelled) setLoading(false) }
    }
    fetchCertificates()
    return () => { cancelled = true }
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try { return new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) }
    catch { return dateStr }
  }

  return (
    <div className="cert-page">
      <Header />

      {/* ═══ HERO BANNER ═══ */}
      <div className="cert-hero">
        <div className="cert-hero-inner">
          <span className="cert-hero-icon">🏆</span>
          <h1 className="cert-hero-title">My Certificates</h1>
          <p className="cert-hero-sub">
            {certificates.length > 0
              ? `Bạn đã đạt được ${certificates.length} chứng chỉ. Tiếp tục phát triển kỹ năng!`
              : 'Hoàn thành khóa học để nhận chứng chỉ tại đây.'
            }
          </p>
        </div>
      </div>

      <main className="cert-main">
        {loading && (
          <div className="cert-skeleton-grid">
            {[1,2,3].map(i => <div key={i} className="cert-skeleton-card" />)}
          </div>
        )}

        {!loading && error && (
          <div className="cert-error">
            <strong>Lỗi</strong>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && certificates.length === 0 && (
          <div className="cert-empty">
            <span className="cert-empty-icon">📜</span>
            <h3>Chưa có chứng chỉ nào</h3>
            <p>Hoàn thành 100% một khóa học để nhận chứng chỉ đầu tiên!</p>
            <Link to="/my-learning" className="cert-empty-btn">Quay lại My Learning →</Link>
          </div>
        )}

        {!loading && !error && certificates.length > 0 && (
          <div className="cert-grid">
            {certificates.map((cert) => (
              <article key={cert.certificateId} className="cert-card">
                <div className="cert-card-ribbon">
                  <span>🎓</span> Certificate of Completion
                </div>
                {getCertificateImageUrl(cert) && (
                  <a href={getCertificateImageUrl(cert)} target="_blank" rel="noreferrer" className="cert-card-image-link">
                    <img src={getCertificateImageUrl(cert)} alt="Certificate" className="cert-card-image" loading="lazy" />
                  </a>
                )}
                <div className="cert-card-body">
                  <h3 className="cert-card-title">{cert.courseTitle || 'Khóa học'}</h3>
                  {cert.instructorName && (
                    <p className="cert-card-instructor">Instructor: {cert.instructorName}</p>
                  )}
                  <div className="cert-card-details">
                    <div className="cert-card-detail">
                      <span className="cert-detail-label">Serial</span>
                      <span className="cert-detail-value cert-serial">{cert.serialNumber || '—'}</span>
                    </div>
                    <div className="cert-card-detail">
                      <span className="cert-detail-label">Issued</span>
                      <span className="cert-detail-value">{formatDate(cert.certificateDate || cert.createdAt)}</span>
                    </div>
                    <div className="cert-card-detail">
                      <span className="cert-detail-label">Learner</span>
                      <span className="cert-detail-value">{cert.learnerName || '—'}</span>
                    </div>
                  </div>
                  <div className="cert-card-actions">
                    {getCertificateImageUrl(cert) && (
                      <a href={getCertificateImageUrl(cert)} target="_blank" rel="noreferrer" className="cert-action-btn cert-action-view">
                        📄 View Certificate
                      </a>
                    )}
                    {cert.serialNumber && (
                      <Link to={`/verify-certificate?code=${cert.serialNumber}`} className="cert-action-btn cert-action-verify">
                        ✓ Verify
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default MyCertificates
