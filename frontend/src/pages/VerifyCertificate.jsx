import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import { certificateApi } from '../api'
import './VerifyCertificate.css'

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleVerify = async (serialToVerify) => {
    const serial = (serialToVerify || code).trim()
    if (!serial) {
      setError('Vui lòng nhập mã chứng chỉ.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await certificateApi.verifyBySerial(serial)
      const data = res?.data?.data ?? res?.data
      setResult(data)
    } catch (e) {
      const status = e?.response?.status
      if (status === 404) {
        setError('Không tìm thấy chứng chỉ với mã này. Vui lòng kiểm tra lại.')
      } else {
        setError(
          e?.response?.data?.message ||
          e?.response?.data?.errorCode ||
          e?.message ||
          'Có lỗi xảy ra khi xác minh.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialCode = searchParams.get('code')
    if (initialCode) {
      setCode(initialCode)
      handleVerify(initialCode)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="verify-cert">
      <Header />
      <main className="verify-cert-main">
        <div className="verify-cert-container">
          <div className="verify-cert-hero">
            <div className="verify-cert-icon">🔍</div>
            <h1>Xác minh Chứng chỉ</h1>
            <p>Nhập mã chứng chỉ (Serial Number) để xác minh tính hợp lệ.</p>
          </div>

          <div className="verify-cert-form">
            <div className="verify-cert-input-group">
              <input
                id="serial-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: UC-2026-A8F921"
                className="verify-cert-input"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button
                id="verify-btn"
                type="button"
                onClick={() => handleVerify()}
                disabled={loading}
                className="verify-cert-btn"
              >
                {loading ? 'Đang xác minh...' : 'Xác minh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="verify-cert-error">
              <span className="verify-cert-error-icon">❌</span>
              {error}
            </div>
          )}

          {result && (
            <div className="verify-cert-result">
              <div className="verify-cert-result-header">
                <span className="verify-cert-check">✅</span>
                <h2>Chứng chỉ hợp lệ</h2>
              </div>
              <div className="verify-cert-result-body">
                <div className="verify-cert-row">
                  <span className="verify-cert-label">Mã chứng chỉ</span>
                  <span className="verify-cert-value verify-cert-serial">
                    {result.serialNumber}
                  </span>
                </div>
                <div className="verify-cert-row">
                  <span className="verify-cert-label">Khóa học</span>
                  <span className="verify-cert-value">{result.courseTitle}</span>
                </div>
                <div className="verify-cert-row">
                  <span className="verify-cert-label">Học viên</span>
                  <span className="verify-cert-value">{result.learnerName}</span>
                </div>
                {result.instructorName && (
                  <div className="verify-cert-row">
                    <span className="verify-cert-label">Giảng viên</span>
                    <span className="verify-cert-value">{result.instructorName}</span>
                  </div>
                )}
                <div className="verify-cert-row">
                  <span className="verify-cert-label">Ngày cấp</span>
                  <span className="verify-cert-value">
                    {formatDate(result.certificateDate || result.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="verify-cert-footer">
            <Link to="/" className="verify-cert-link">← Về trang chủ</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default VerifyCertificate
