import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { certificateApi } from '../api'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const getCertImageUrl = (cert: AnyObj) => {
  const raw = String(cert?.certicateUrl || cert?.certificateUrl || cert?.imageUrl || '').trim()
  if (!raw) return ''
  if (/^(null|undefined|n\/a)$/i.test(raw)) return ''
  return raw
}
const isPdfUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url)

const MyCertificates = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [certificates, setCertificates] = useState<AnyObj[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [copiedSerial, setCopiedSerial] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const [previewCert, setPreviewCert] = useState<AnyObj | null>(null)
  const [previewImageBroken, setPreviewImageBroken] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true); setError('')
      try {
        const res = await certificateApi.getMyList()
        const payload = (res as { data?: { data?: unknown } })?.data?.data ?? (res as { data?: unknown })?.data
        const list = Array.isArray(payload) ? payload : Array.isArray((payload as AnyObj)?.content) ? (payload as AnyObj).content as AnyObj[] : []
        if (!cancelled) setCertificates(list as AnyObj[])
      } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } }; message?: string }; if (!cancelled) setError(err.response?.data?.message || err.message || t('certs.loadFailed')) }
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
    const url = getCertImageUrl(cert) || `${window.location.origin}/verify-certificate?code=${String(cert.serialNumber || '')}`
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
    const ext = isPdfUrl(imgUrl) ? 'pdf' : 'png'
    const a = document.createElement('a'); a.href = imgUrl; a.download = `certificate-${cert.serialNumber || 'download'}.${ext}`; a.target = '_blank'; a.click()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewCert(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />

      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#78350f_0%,#92400e_30%,#d97706_100%)] px-6 py-10 text-white text-center">
        <div className="max-w-[600px] mx-auto">
          <span className="text-[2.5rem] block mb-2">🏆</span>
          <h1 className="m-0 mb-2 text-[1.8rem] font-extrabold max-[640px]:text-[1.4rem]">{t('certs.title')}</h1>
          <p className="m-0 text-[0.95rem] text-white/80">{certificates.length > 0 ? t('certs.heroDesc', { count: certificates.length }) : t('certs.heroNoData')}</p>
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto w-full px-4 md:px-7 lg:px-10 py-6 pb-16">
        <div className="relative">
          <div className="hidden xl:block absolute -left-8 top-8 w-40 h-40 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />
          <div className="hidden xl:block absolute -right-8 bottom-8 w-48 h-48 rounded-full bg-primary-500/10 blur-2xl pointer-events-none" />
          <div className="relative bg-white/88 backdrop-blur-[1px] border border-border-subtle rounded-3xl p-4 md:p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
        {/* Search & Sort */}
        {!loading && !error && certificates.length > 0 && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-border-medium rounded-xl px-4 py-2.5">
              <span className="text-text-muted">🔍</span>
              <input type="text" className="flex-1 bg-transparent border-none outline-none text-text-main text-[0.92rem]" placeholder={t('common.search') + '...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer text-sm" onClick={() => setSearchQuery('')}>✕</button>}
            </div>
            <select className="bg-white border border-border-medium rounded-xl px-3 py-2.5 text-text-main text-[0.88rem] outline-none cursor-pointer" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date-desc">{t('certs.sortNewest')}</option>
              <option value="date-asc">{t('certs.sortOldest')}</option>
              <option value="name">{t('certs.sortName')}</option>
            </select>
            <span className="text-[0.85rem] text-text-muted">{t('certs.count', { count: filteredCerts.length })}</span>
          </div>
        )}

        {loading && <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">{[1, 2, 3].map((i) => <div key={i} className="h-[280px] bg-gray-100 rounded-[14px] animate-pulse" />)}</div>}
        {!loading && error && <div className="bg-red-50 border border-red-200 rounded-[14px] p-5 text-red-600"><strong>{t('certs.error')}</strong><div>{error}</div></div>}
        {!loading && !error && certificates.length === 0 && (
          <div className="text-center py-16 px-4">
            <span className="text-5xl block mb-3">📜</span>
            <h3 className="m-0 mb-2 text-xl font-bold">{t('certs.noCerts')}</h3>
            <p className="m-0 mb-5 text-text-muted">{t('myLearning.noCourses')}</p>
            <Link to="/my-learning" className="inline-block px-5 py-2.5 bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white rounded-[10px] no-underline font-bold transition-transform hover:-translate-y-0.5">{t('myLearning.title')} →</Link>
          </div>
        )}

        {!loading && !error && filteredCerts.length > 0 && (
          <div className="flex flex-col gap-3 max-[640px]:gap-2">
            {filteredCerts.map((cert) => {
              const certId = cert.certificateId as string
              const isExpanded = expandedId === certId
              const imgUrl = getCertImageUrl(cert)
              const isPdfAsset = isPdfUrl(imgUrl)
              const canPreview = Boolean(imgUrl)
              const hasImage = Boolean(imgUrl) && !isPdfAsset && !brokenImages[certId]
              return (
                <article key={certId} className={`bg-white border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-amber-400 shadow-[0_4px_20px_rgba(217,119,6,0.12)]' : 'border-border-medium hover:border-amber-300 hover:shadow-[0_2px_12px_rgba(217,119,6,0.06)]'}`}>
                  {/* Row header — clickable */}
                  <button type="button" className="w-full flex items-center gap-4 px-5 py-4 bg-transparent border-none cursor-pointer text-left font-[inherit] transition-colors hover:bg-amber-50/30 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-2" onClick={() => setExpandedId(isExpanded ? '' : certId)}>
                    <span className="text-2xl shrink-0">🏆</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-main text-[0.95rem] truncate">{(cert.courseTitle as string) || t('certs.courseDefault')}</div>
                      <div className="flex items-center gap-3 mt-0.5 text-[0.82rem] text-text-muted max-[640px]:flex-wrap">
                        {!!cert.instructorName && <span>{t('certs.instructor')}: {String(cert.instructorName)}</span>}
                        <span>•</span>
                        <span>{formatDate(cert.certificateDate || cert.createdAt)}</span>
                      </div>
                    </div>
                    <span className="font-mono text-amber-600 font-bold text-[0.82rem] tracking-wide shrink-0 max-[640px]:self-start">{(cert.serialNumber as string) || '—'}</span>
                    <span className={`text-text-muted text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border-subtle px-5 py-5 animate-[faqSlide_0.2s_ease]">
                      <div className="flex gap-6 max-[800px]:flex-col">
                        {/* Certificate image */}
                        <div className="w-[320px] shrink-0 max-[800px]:w-full">
                          {hasImage ? (
                            <button
                              type="button"
                              className="block w-full rounded-xl overflow-hidden border border-amber-200 shadow-[0_2px_12px_rgba(217,119,6,0.1)] hover:shadow-[0_4px_20px_rgba(217,119,6,0.15)] transition-shadow bg-white p-0 cursor-zoom-in"
                              onClick={() => { setPreviewImageBroken(false); setPreviewCert(cert) }}
                            >
                              <img src={imgUrl} alt="Certificate" className="w-full block bg-amber-50" loading="lazy" onError={() => setBrokenImages((p) => ({ ...p, [certId]: true }))} />
                            </button>
                          ) : isPdfAsset ? (
                            <button
                              type="button"
                              className="w-full rounded-xl border border-amber-200 bg-white px-5 py-10 text-center cursor-zoom-in hover:bg-amber-50/40 transition-colors"
                              onClick={() => { setPreviewImageBroken(false); setPreviewCert(cert) }}
                            >
                              <div className="text-4xl mb-2">📄</div>
                              <div className="font-semibold text-amber-700">Certificate PDF</div>
                              <div className="text-[0.78rem] text-amber-600 mt-1">Nhấn để mở xem tài liệu</div>
                            </button>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-6 bg-[linear-gradient(135deg,#fef3c7,#fde68a,#fef3c7)] border-2 border-amber-300 rounded-xl text-amber-800">
                              <div className="text-[0.65rem] uppercase tracking-[0.2em] font-bold text-amber-600 mb-2">{t('certs.certOfCompletion')}</div>
                              <div className="text-base font-extrabold text-center leading-snug mb-1">{(cert.courseTitle as string) || t('certs.courseDefault')}</div>
                              <div className="text-sm text-amber-700 mb-2">{(cert.learnerName as string) || '—'}</div>
                              <div className="w-16 h-px bg-amber-400 mb-2" />
                              <div className="font-mono text-[0.7rem] text-amber-600 tracking-wider">{(cert.serialNumber as string) || ''}</div>
                              <div className="text-[0.7rem] text-amber-500 mt-1">{formatDate(cert.certificateDate || cert.createdAt)}</div>
                              <div className="text-[0.72rem] text-amber-500/70 mt-2 italic">{t('certs.certImageNotReady')}</div>
                            </div>
                          )}
                        </div>

                        {/* Details + actions */}
                        <div className="flex-1 flex flex-col gap-3">
                          <h3 className="m-0 text-lg font-bold">{(cert.courseTitle as string) || t('certs.courseDefault')}</h3>
                          <div className="flex flex-col gap-1.5">
                            <Row label={t('certs.serial')} value={<span className="font-mono text-amber-600 font-bold text-[0.85rem] tracking-wide">{(cert.serialNumber as string) || '—'}</span>} />
                            <Row label={t('certs.issued')} value={formatDate(cert.certificateDate || cert.createdAt)} />
                            <Row label={t('certs.learner')} value={(cert.learnerName as string) || '—'} />
                            {!!cert.instructorName && <Row label={t('certs.instructor')} value={String(cert.instructorName)} />}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {canPreview && <button type="button" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[0.85rem] font-semibold border border-border-medium bg-white text-text-secondary cursor-pointer transition-colors hover:bg-bg-deep" onClick={() => { setPreviewImageBroken(false); setPreviewCert(cert) }}>{isPdfAsset ? '📄 Xem file' : '🖼 Xem ảnh'}</button>}
                            {hasImage && <a href={imgUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[0.85rem] font-semibold no-underline bg-amber-500 text-white transition-colors hover:bg-amber-600 shadow-sm">📄 {t('certs.viewCert')}</a>}
                            {hasImage && <button type="button" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[0.85rem] font-semibold border border-amber-200 bg-amber-50 text-amber-700 cursor-pointer transition-colors hover:bg-amber-100" onClick={() => handleDownload(cert)}>⬇ {t('certs.download')}</button>}
                            {!!cert.serialNumber && <Link to={`/verify-certificate?code=${String(cert.serialNumber)}`} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[0.85rem] font-semibold no-underline border border-primary-500/20 bg-primary-500/6 text-primary-500 transition-colors hover:bg-primary-500/12">✓ {t('certs.verify')}</Link>}
                          </div>

                          {/* Share */}
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-[0.82rem] text-text-muted font-semibold self-center">{t('certs.share')}:</span>
                            <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-border-medium bg-white text-text-secondary cursor-pointer transition-colors hover:bg-bg-deep" onClick={() => handleCopyLink(cert)}>{copiedSerial === cert.serialNumber ? `✅ ${t('certs.copied')}` : `🔗 ${t('certs.copyLink')}`}</button>
                            <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-[#0A66C2]/20 bg-[#0A66C2]/6 text-[#0A66C2] cursor-pointer transition-colors hover:bg-[#0A66C2]/12" onClick={() => handleShareLinkedIn(cert)}>in LinkedIn</button>
                            <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-[#1877F2]/20 bg-[#1877F2]/6 text-[#1877F2] cursor-pointer transition-colors hover:bg-[#1877F2]/12" onClick={() => handleShareFacebook(cert)}>f Facebook</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
          </div>
        </div>
      </main>
      {previewCert && (
        <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewCert(null)}>
          <div className="w-full max-w-[1320px] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="font-semibold text-text-main text-[0.95rem] truncate">{String(previewCert.courseTitle || t('certs.courseDefault'))}</div>
              <button type="button" className="border border-border-medium bg-white text-text-muted rounded-md px-3 py-1.5 text-sm cursor-pointer hover:bg-bg-page" onClick={() => setPreviewCert(null)}>Đóng</button>
            </div>

            <div className="p-4 bg-bg-page">
              {!previewImageBroken && !!getCertImageUrl(previewCert) ? (
                isPdfUrl(getCertImageUrl(previewCert)) ? (
                  <iframe
                    src={getCertImageUrl(previewCert)}
                    className="w-full h-[82vh] bg-white rounded-lg border border-border-medium"
                    title="Certificate PDF preview"
                  />
                ) : (
                  <img
                    src={getCertImageUrl(previewCert)}
                    alt="Certificate preview"
                    className="w-full max-h-[82vh] object-contain bg-white rounded-lg border border-border-medium"
                    onError={() => setPreviewImageBroken(true)}
                  />
                )
              ) : (
                <div className="w-full min-h-[260px] flex flex-col items-center justify-center text-center bg-white rounded-lg border border-border-medium px-6 py-10">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-[0.95rem] font-semibold text-text-main mb-1">Chưa hiển thị được chứng chỉ</div>
                  <div className="text-[0.82rem] text-text-muted">Link tệp chưa hợp lệ hoặc tệp tạm thời không truy cập được.</div>
                </div>
              )}

              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-[0.82rem] text-text-muted font-semibold self-center">{t('certs.share')}:</span>
                <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-border-medium bg-white text-text-secondary cursor-pointer transition-colors hover:bg-bg-deep" onClick={() => handleCopyLink(previewCert)}>{copiedSerial === previewCert.serialNumber ? `✅ ${t('certs.copied')}` : `🔗 ${t('certs.copyLink')}`}</button>
                <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-[#0A66C2]/20 bg-[#0A66C2]/6 text-[#0A66C2] cursor-pointer transition-colors hover:bg-[#0A66C2]/12" onClick={() => handleShareLinkedIn(previewCert)}>in LinkedIn</button>
                <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-[#1877F2]/20 bg-[#1877F2]/6 text-[#1877F2] cursor-pointer transition-colors hover:bg-[#1877F2]/12" onClick={() => handleShareFacebook(previewCert)}>f Facebook</button>
                <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold border border-border-medium bg-white text-text-secondary cursor-pointer transition-colors hover:bg-bg-deep" onClick={() => handleDownload(previewCert)}>⬇ {t('certs.download')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
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

