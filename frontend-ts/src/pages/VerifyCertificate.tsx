import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { certificateApi } from '../api'

interface CertResult {
  serialNumber: string
  courseTitle: string
  learnerName: string
  instructorName?: string
  certificateDate?: string
  createdAt?: string
}

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CertResult | null>(null)
  const [error, setError] = useState('')

  const handleVerify = async (serialToVerify?: string) => {
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
      setResult(data as CertResult)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string; errorCode?: string } }; message?: string }
      if (err?.response?.status === 404) {
        setError('Không tìm thấy chứng chỉ với mã này. Vui lòng kiểm tra lại.')
      } else {
        setError(err?.response?.data?.message || err?.response?.data?.errorCode || err?.message || 'Có lỗi xảy ra khi xác minh.')
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="flex justify-center px-6 py-8 pb-16">
        <div className="max-w-[600px] w-full">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-2">🔍</div>
            <h1 className="text-3xl font-bold text-text-main mb-2">Xác minh Chứng chỉ</h1>
            <p className="text-text-muted">Nhập mã chứng chỉ (Serial Number) để xác minh tính hợp lệ.</p>
          </div>

          {/* Form */}
          <div className="mb-6">
            <div className="flex gap-2 max-[480px]:flex-col">
              <input
                id="serial-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: UC-2026-A8F921"
                className="flex-1 px-4 py-3 rounded-[10px] border border-border-medium bg-white text-text-main text-base font-mono tracking-wide outline-none transition-colors focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)] placeholder:text-text-muted"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button
                id="verify-btn"
                type="button"
                onClick={() => handleVerify()}
                disabled={loading}
                className="px-5 py-3 rounded-[10px] border-none bg-primary-500 text-white text-[0.95rem] font-semibold cursor-pointer whitespace-nowrap transition-all hover:bg-primary-600 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,86,210,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xác minh...' : 'Xác minh'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 text-red-600 flex items-center gap-2.5 mb-6">
              <span className="text-lg">❌</span>
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-white border border-emerald-300 rounded-[14px] overflow-hidden mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2.5 px-6 py-4 bg-emerald-50 border-b border-emerald-300">
                <span className="text-xl">✅</span>
                <h2 className="text-lg font-semibold text-green-600 m-0">Chứng chỉ hợp lệ</h2>
              </div>
              <div className="px-6 py-5 flex flex-col gap-3">
                <Row label="Mã chứng chỉ">
                  <span className="font-mono text-primary-500 font-semibold tracking-wide">{result.serialNumber}</span>
                </Row>
                <Row label="Khóa học"><span>{result.courseTitle}</span></Row>
                <Row label="Học viên"><span>{result.learnerName}</span></Row>
                {result.instructorName && <Row label="Giảng viên"><span>{result.instructorName}</span></Row>}
                <Row label="Ngày cấp"><span>{formatDate(result.certificateDate || result.createdAt)}</span></Row>
              </div>
            </div>
          )}

          <div className="text-center mt-4">
            <Link to="/" className="text-primary-500 no-underline text-sm transition-colors hover:underline">
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between items-center text-[0.92rem]">
    <span className="text-text-muted font-medium">{label}</span>
    <span className="text-text-main text-right">{children}</span>
  </div>
)

export default VerifyCertificate
