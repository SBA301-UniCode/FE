import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { certificateApi } from '../api'

type AnyObj = Record<string, unknown>
const getCertImageUrl = (cert: AnyObj) => String(cert?.certicateUrl || cert?.certificateUrl || cert?.imageUrl || '').trim()

const MyCertificates = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [certificates, setCertificates] = useState<AnyObj[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [copiedSerial, setCopiedSerial] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true); setError('')
      try {
        const res = await certificateApi.getMyList()
        const payload = (res as { data?: { data?: unknown } })?.data?.data ?? (res as { data?: unknown })?.data
        const list = Array.isArray(payload) ? payload : Array.isArray((payload as AnyObj)?.content) ? (payload as AnyObj).content as AnyObj[] : []
        if (!cancelled) setCertificates(list as AnyObj[])
      } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; if (!cancelled) setError(err.response?.data?.message || err.message || 'Không thể tải danh sách chứng chỉ.') }
      finally { if (!cancelled) setLoading(false) }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  const formatDate = (ds: unknown) => {
    if (!ds) return '—'
    try {
      return new Date(ds as string).toLocaleString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return String(ds) }
  }

  const filteredCerts = useMemo(() => {
    let result = [...certificates]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => ((c.courseTitle as string) || '').toLowerCase().includes(q) || ((c.serialNumber as string) || '').toLowerCase().includes(q))
    }
    if (sortBy === 'date-desc') result.sort((a, b) => new Date(b.certificateDate as string || b.createdAt as string || 0).getTime() - new Date(a.certificateDate as string || a.createdAt as string || 0).getTime())
    else if (sortBy === 'date-asc') result.sort((a, b) => new Date(a.certificateDate as string || a.createdAt as string || 0).getTime() - new Date(b.certificateDate as string || b.createdAt as string || 0).getTime())
    else if (sortBy === 'name') result.sort((a, b) => ((a.courseTitle as string) || '').localeCompare((b.courseTitle as string) || ''))
    return result
  }, [certificates, searchQuery, sortBy])

  const handleCopyLink = (cert: AnyObj) => {
    const url = `${window.location.origin}/verify-certificate?code=${String(cert.serialNumber || '')}`
    navigator.clipboard.writeText(url).then(() => { setCopiedSerial(cert.serialNumber as string); setTimeout(() => setCopiedSerial(''), 2000) })
  }
  const handleShareLinkedIn = (cert: AnyObj) => {
    const url = `${window.location.origin}/verify-certificate?code=${String(cert.serialNumber || '')}`
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }
  const handleShareFacebook = (cert: AnyObj) => {
    const url = `${window.location.origin}/verify-certificate?code=${String(cert.serialNumber || '')}`
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }
  const handleDownload = (cert: AnyObj) => {
    const imgUrl = getCertImageUrl(cert)
    if (!imgUrl) return
    const a = document.createElement('a'); a.href = imgUrl; a.download = `certificate-${cert.serialNumber || 'download'}.png`; a.target = '_blank'; a.click()
  }

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />

      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#78350f_0%,#92400e_30%,#d97706_100%)] px-6 py-10 text-white text-center">
        <div className="max-w-[600px] mx-auto">
          <span className="text-[2.5rem] block mb-2">🏆</span>
          <h1 className="m-0 mb-2 text-[1.8rem] font-extrabold max-[640px]:text-[1.4rem]">My Certificates</h1>
          <p className="m-0 text-[0.95rem] text-white/80">{certificates.length > 0 ? `Bạn đã đạt được ${certificates.length} chứng chỉ. Tiếp tục phát triển kỹ năng!` : 'Hoàn thành khóa học để nhận chứng chỉ tại đây.'}</p>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-6 py-6 pb-16">
        {/* Search & Sort */}
        {!loading && !error && certificates.length > 0 && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-border-medium rounded-xl px-4 py-2.5">
              <span className="text-text-muted">🔍</span>
              <input type="text" className="flex-1 bg-transparent border-none outline-none text-text-main text-[0.92rem]" placeholder="Tìm kiếm chứng chỉ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer text-sm" onClick={() => setSearchQuery('')}>✕</button>}
            </div>
            <select className="bg-white border border-border-medium rounded-xl px-3 py-2.5 text-text-main text-[0.88rem] outline-none cursor-pointer" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date-desc">Mới nhất</option>
              <option value="date-asc">Cũ nhất</option>
              <option value="name">Tên A→Z</option>
            </select>
            <span className="text-[0.85rem] text-text-muted">{filteredCerts.length} chứng chỉ</span>
          </div>
        )}

        {loading && <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">{[1, 2, 3].map((i) => <div key={i} className="h-[280px] bg-gray-100 rounded-[14px] animate-pulse" />)}</div>}
        {!loading && error && <div className="bg-red-50 border border-red-200 rounded-[14px] p-5 text-red-600"><strong>Lỗi</strong><div>{error}</div></div>}
        {!loading && !error && certificates.length === 0 && (
          <div className="text-center py-16 px-4">
            <span className="text-5xl block mb-3">📜</span>
            <h3 className="m-0 mb-2 text-xl font-bold">Chưa có chứng chỉ nào</h3>
            <p className="m-0 mb-5 text-text-muted">Hoàn thành 100% một khóa học để nhận chứng chỉ đầu tiên!</p>
            <Link to="/my-learning" className="inline-block px-5 py-2.5 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white rounded-[10px] no-underline font-bold transition-transform hover:-translate-y-0.5">Quay lại My Learning →</Link>
          </div>
        )}

        {!loading && !error && filteredCerts.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6 max-[640px]:grid-cols-1">
            {filteredCerts.map((cert) => (
              <article key={cert.certificateId as string} className="bg-white border-2 border-amber-400 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(217,119,6,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(217,119,6,0.15)]">
                <div className="bg-[linear-gradient(135deg,#d97706,#f59e0b)] text-white px-4 py-1.5 text-[0.78rem] font-bold tracking-wide uppercase flex items-center gap-1.5">
                  <span>🎓</span> Certificate of Completion
                </div>
                {getCertImageUrl(cert) && (
                  <a href={getCertImageUrl(cert)} target="_blank" rel="noreferrer" className="block w-full">
                    <img src={getCertImageUrl(cert)} alt="Certificate" className="w-full max-h-[200px] object-cover block bg-amber-50" loading="lazy" />
                  </a>
                )}
                <div className="p-5 flex flex-col gap-2">
                  <h3 className="m-0 text-lg font-bold leading-snug">{(cert.courseTitle as string) || 'Khóa học'}</h3>
                  {!!cert.instructorName && <p className="m-0 text-[0.85rem] text-text-muted">Instructor: {String(cert.instructorName)}</p>}
                  <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border-subtle">
                    <Row label="Serial" value={<span className="font-mono text-amber-600 font-bold text-[0.82rem] tracking-wide">{(cert.serialNumber as string) || '—'}</span>} />
                    <Row label="Issued" value={formatDate(cert.certificateDate || cert.createdAt)} />
                    <Row label="Learner" value={(cert.learnerName as string) || '—'} />
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {getCertImageUrl(cert) && <a href={getCertImageUrl(cert)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.82rem] font-semibold no-underline border border-amber-200 bg-amber-600/8 text-amber-600 transition-colors hover:bg-amber-600/15">📄 View</a>}
                    {getCertImageUrl(cert) && <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.82rem] font-semibold border border-amber-200 bg-amber-600/8 text-amber-600 cursor-pointer transition-colors hover:bg-amber-600/15" onClick={() => handleDownload(cert)}>⬇ Download</button>}
                    {!!cert.serialNumber && <Link to={`/verify-certificate?code=${String(cert.serialNumber)}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.82rem] font-semibold no-underline border border-primary-500/20 bg-primary-500/6 text-primary-500 transition-colors hover:bg-primary-500/12">✓ Verify</Link>}
                  </div>
                  {/* Share buttons */}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-border-medium bg-white text-text-secondary cursor-pointer transition-colors hover:bg-bg-deep" onClick={() => handleCopyLink(cert)}>{copiedSerial === cert.serialNumber ? '✅ Đã copy!' : '🔗 Copy Link'}</button>
                    <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-[#0A66C2]/20 bg-[#0A66C2]/6 text-[#0A66C2] cursor-pointer transition-colors hover:bg-[#0A66C2]/12" onClick={() => handleShareLinkedIn(cert)}>in LinkedIn</button>
                    <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-[#1877F2]/20 bg-[#1877F2]/6 text-[#1877F2] cursor-pointer transition-colors hover:bg-[#1877F2]/12" onClick={() => handleShareFacebook(cert)}>f Facebook</button>
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

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between text-[0.85rem]">
    <span className="text-text-muted">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
)

export default MyCertificates

