import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { watermarkApi } from '../api'

type AnyObj = Record<string, unknown>

const formatSize = (bytes: number) => { if (!bytes) return ''; if (bytes < 1024) return bytes + ' B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / (1024 * 1024)).toFixed(1) + ' MB' }
const getConfidenceLevel = (c: number) => c >= 0.8 ? 'high' : c >= 0.5 ? 'medium' : 'low'
const formatMethod = (m: string) => ({ direct_extraction: 'Trích xuất trực tiếp (LSB/QIM)', fingerprint_matching: 'Đối chiếu fingerprint', none: 'Không phát hiện', error: 'Lỗi xử lý' }[m] || m)

const VerifyContent = () => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnyObj | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const d = e.dataTransfer.files[0]; if (d) { setFile(d); setResult(null); setError('') } }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const s = e.target.files?.[0]; if (s) { setFile(s); setResult(null); setError('') } }
  const removeFile = () => { setFile(null); setResult(null); setError(''); if (fileInputRef.current) fileInputRef.current.value = '' }

  const handleVerify = async () => {
    if (!file) { setError('Vui lòng chọn file để xác minh.'); return }; setLoading(true); setError(''); setResult(null)
    try { const res = await watermarkApi.verify(file); const data = (res as { data?: { data?: unknown } })?.data?.data ?? (res as { data?: unknown })?.data; setResult(data as AnyObj) } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra.') } finally { setLoading(false) }
  }

  const Row = ({ label, value, cls }: { label: string; value: string; cls?: string }) => <div className="flex justify-between items-center text-sm"><span className="text-text-muted font-medium">{label}</span><span className={`text-text-main text-right ${cls || ''}`}>{value}</span></div>

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <main className="flex justify-center px-6 py-8 pb-16">
        <div className="max-w-[700px] w-full">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-2">🛡️</div>
            <h1 className="text-[2rem] font-bold text-text-main m-0 mb-2">Xác minh nội dung</h1>
            <p className="text-text-muted m-0 max-w-[480px] mx-auto leading-relaxed">Upload file ảnh hoặc PDF nghi bị chia sẻ trái phép. Hệ thống sẽ kiểm tra watermark ẩn và đối chiếu fingerprint để truy vết nguồn gốc.</p>
          </div>

          {/* Upload */}
          <div className="mb-6">
            <div className={`border-2 border-dashed rounded-[14px] px-6 py-10 text-center cursor-pointer transition-all bg-white ${dragging ? 'border-primary-500 bg-[rgba(0,86,210,0.03)]' : 'border-border-medium hover:border-primary-500 hover:bg-[rgba(0,86,210,0.03)]'}`} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
              <div className="text-[2.5rem] mb-3">📁</div>
              <p className="text-text-muted m-0">Kéo thả file vào đây hoặc <span className="text-primary-500 underline cursor-pointer">chọn file</span></p>
              <p className="text-[0.8rem] text-text-muted mt-2">Hỗ trợ: PNG, JPG, BMP, PDF</p>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
            </div>

            {file && <div className="flex items-center justify-between bg-bg-deep rounded-[10px] px-4 py-3 mt-3 border border-border-subtle"><div><span className="text-text-main text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</span><span className="text-text-muted text-[0.8rem] ml-2 whitespace-nowrap">({formatSize(file.size)})</span></div><button className="bg-transparent border-none text-red-600 cursor-pointer text-base p-1" onClick={removeFile}>✕</button></div>}

            <button className="w-full py-3.5 rounded-[10px] border-none bg-primary-500 text-white text-base font-semibold cursor-pointer transition-all mt-4 hover:bg-primary-600 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,86,210,0.25)] disabled:opacity-60 disabled:cursor-not-allowed" onClick={handleVerify} disabled={!file || loading}>{loading ? '⏳ Đang phân tích...' : '🔍 Kiểm tra Watermark'}</button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-[10px] px-5 py-4 text-red-600 flex items-center gap-2.5 mb-6"><span>❌</span> {error}</div>}

          {result && (
            <div className={`bg-white rounded-[14px] overflow-hidden mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border ${result.found ? 'border-red-200' : 'border-emerald-200'}`}>
              <div className={`flex items-center gap-2.5 px-6 py-4 border-b border-border-subtle ${result.found ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <span className="text-xl">{result.found ? '🚨' : '✅'}</span>
                <h2 className={`text-lg font-semibold m-0 ${result.found ? 'text-red-600' : 'text-green-600'}`}>{result.found ? 'Phát hiện watermark — Nội dung có nguồn gốc!' : 'Không phát hiện watermark'}</h2>
              </div>
              <div className="px-6 py-5 flex flex-col gap-3">
                <Row label="Phương pháp" value={formatMethod((result.method || '') as string)} cls="text-primary-500" />
                {!!result.found && <>
                  <Row label="Độ tin cậy" value={`${((result.confidence as number) * 100).toFixed(0)}%`} />
                  <div className="w-full h-1.5 bg-gray-200 rounded-sm overflow-hidden mt-1"><div className={`h-full rounded-sm transition-all duration-500 ${getConfidenceLevel(result.confidence as number) === 'high' ? 'bg-red-500' : getConfidenceLevel(result.confidence as number) === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${(result.confidence as number) * 100}%` }} /></div>
                  {result.email && <Row label="Email người tải" value={result.email as string} cls="font-mono text-red-600 font-semibold tracking-wide" />}
                  {result.userId && <Row label="User ID" value={result.userId as string} />}
                  {result.timestamp && <Row label="Thời gian tải" value={result.timestamp as string} />}
                  {result.matchedUserEmail && <Row label="Email người tải" value={result.matchedUserEmail as string} cls="font-mono text-red-600 font-semibold tracking-wide" />}
                  {result.matchedDocumentTitle && <Row label="Tài liệu gốc" value={result.matchedDocumentTitle as string} />}
                  {result.matchedDownloadedAt && <Row label="Thời gian tải" value={new Date(result.matchedDownloadedAt as string).toLocaleString('vi-VN')} />}
                </>}
              </div>
            </div>
          )}

          <div className="text-center mt-4"><Link to="/" className="text-primary-500 no-underline text-sm hover:underline">← Về trang chủ</Link></div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default VerifyContent
