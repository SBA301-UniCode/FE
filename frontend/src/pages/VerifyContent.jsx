import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { watermarkApi } from '../api'
import './VerifyContent.css'

const VerifyContent = () => {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setResult(null)
      setError('')
    }
  }

  const handleFileSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      setError('')
    }
  }

  const removeFile = () => {
    setFile(null)
    setResult(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleVerify = async () => {
    if (!file) {
      setError('Vui lòng chọn file để xác minh.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await watermarkApi.verify(file)
      const data = res?.data?.data ?? res?.data
      setResult(data)
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        e?.message ||
        'Có lỗi xảy ra khi xác minh.'
      )
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return 'high'
    if (confidence >= 0.5) return 'medium'
    return 'low'
  }

  const formatMethod = (method) => {
    const map = {
      direct_extraction: 'Trích xuất trực tiếp (LSB/QIM)',
      fingerprint_matching: 'Đối chiếu fingerprint',
      none: 'Không phát hiện',
      error: 'Lỗi xử lý',
    }
    return map[method] || method
  }

  return (
    <div className="verify-content">
      <Header />
      <main className="verify-content-main">
        <div className="verify-content-container">
          <div className="verify-content-hero">
            <div className="verify-content-icon">🛡️</div>
            <h1>Xác minh nội dung</h1>
            <p>
              Upload file ảnh hoặc PDF nghi bị chia sẻ trái phép.
              Hệ thống sẽ kiểm tra watermark ẩn và đối chiếu fingerprint
              để truy vết nguồn gốc.
            </p>
          </div>

          {/* Upload Zone */}
          <div className="verify-content-upload">
            <div
              className={`verify-content-dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="verify-content-dropzone-icon">📁</div>
              <p>
                Kéo thả file vào đây hoặc{' '}
                <span className="verify-content-browse">chọn file</span>
              </p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Hỗ trợ: PNG, JPG, BMP, PDF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {file && (
              <div className="verify-content-file-info">
                <div>
                  <span className="verify-content-file-name">{file.name}</span>
                  <span className="verify-content-file-size">
                    ({formatSize(file.size)})
                  </span>
                </div>
                <button className="verify-content-remove-btn" onClick={removeFile}>
                  ✕
                </button>
              </div>
            )}

            <button
              className="verify-content-submit-btn"
              onClick={handleVerify}
              disabled={!file || loading}
            >
              {loading ? '⏳ Đang phân tích...' : '🔍 Kiểm tra Watermark'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="verify-content-error">
              <span>❌</span> {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`verify-content-result ${result.found ? 'found' : 'not-found'}`}>
              <div className={`verify-content-result-header ${result.found ? 'found' : 'not-found'}`}>
                <span style={{ fontSize: '1.3rem' }}>
                  {result.found ? '🚨' : '✅'}
                </span>
                <h2>
                  {result.found
                    ? 'Phát hiện watermark — Nội dung có nguồn gốc!'
                    : 'Không phát hiện watermark'}
                </h2>
              </div>
              <div className="verify-content-result-body">
                <div className="verify-content-row">
                  <span className="verify-content-label">Phương pháp</span>
                  <span className="verify-content-value method">
                    {formatMethod(result.method)}
                  </span>
                </div>

                {result.found && (
                  <>
                    <div className="verify-content-row">
                      <span className="verify-content-label">Độ tin cậy</span>
                      <span className="verify-content-value">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="verify-content-confidence-bar">
                      <div
                        className={`verify-content-confidence-fill ${getConfidenceLevel(result.confidence)}`}
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>

                    {/* Direct extraction details */}
                    {result.email && (
                      <div className="verify-content-row">
                        <span className="verify-content-label">Email người tải</span>
                        <span className="verify-content-value email">
                          {result.email}
                        </span>
                      </div>
                    )}
                    {result.userId && (
                      <div className="verify-content-row">
                        <span className="verify-content-label">User ID</span>
                        <span className="verify-content-value">{result.userId}</span>
                      </div>
                    )}
                    {result.timestamp && (
                      <div className="verify-content-row">
                        <span className="verify-content-label">Thời gian tải</span>
                        <span className="verify-content-value">{result.timestamp}</span>
                      </div>
                    )}

                    {/* Fingerprint match details */}
                    {result.matchedUserEmail && (
                      <div className="verify-content-row">
                        <span className="verify-content-label">Email người tải</span>
                        <span className="verify-content-value email">
                          {result.matchedUserEmail}
                        </span>
                      </div>
                    )}
                    {result.matchedDocumentTitle && (
                      <div className="verify-content-row">
                        <span className="verify-content-label">Tài liệu gốc</span>
                        <span className="verify-content-value">
                          {result.matchedDocumentTitle}
                        </span>
                      </div>
                    )}
                    {result.matchedDownloadedAt && (
                      <div className="verify-content-row">
                        <span className="verify-content-label">Thời gian tải</span>
                        <span className="verify-content-value">
                          {new Date(result.matchedDownloadedAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="verify-content-footer">
            <Link to="/" className="verify-content-link">← Về trang chủ</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default VerifyContent
