import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { resolveToId, isUuid, setSlugMap } from '../utils/slug'
import ForceGraph2D from 'react-force-graph-2d'
import { mindmapApi } from '../api/mindmap'
import Header from '../components/layout/Header'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GraphRef = { centerAt: (x: number, y: number, ms: number) => void; zoom: (z: number, ms?: number) => number; zoomToFit: (ms: number, px: number) => void }
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }

const NODE_CFG: Record<string, { color: string; size: number; glow: number; icon: string; shape: string }> = {
  COURSE: { color: '#6366f1', size: 24, glow: 20, icon: '🎓', shape: 'hexagon' },
  CHAPTER: { color: '#f59e0b', size: 16, glow: 14, icon: '📖', shape: 'rounded' },
  LESSON: { color: '#22c55e', size: 12, glow: 10, icon: '📝', shape: 'circle' },
  VIDEO: { color: '#ef4444', size: 8, glow: 6, icon: '▶', shape: 'triangle' },
  DOCUMENT: { color: '#3b82f6', size: 8, glow: 6, icon: '📄', shape: 'square' },
  QUIZ: { color: '#a855f7', size: 8, glow: 6, icon: '✏️', shape: 'diamond' },
  USER_NOTE: { color: '#fbbf24', size: 10, glow: 8, icon: '💡', shape: 'star' },
  UNKNOWN: { color: '#64748b', size: 8, glow: 4, icon: '?', shape: 'circle' },
}
const LEGEND = Object.entries(NODE_CFG).filter(([k]) => k !== 'UNKNOWN')

/* ─── Shared button styles ─── */
const btn = 'px-3 py-1.5 border border-indigo-500/30 rounded-lg bg-indigo-500/10 text-indigo-300 text-[0.82rem] cursor-pointer transition-all whitespace-nowrap hover:bg-indigo-500/25 hover:border-indigo-500/50 hover:text-indigo-200 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]'
const btnSave = `${btn} !bg-green-500/15 !border-green-500/30 !text-green-300 hover:!bg-green-500/30 hover:!border-green-500/50`
const btnDanger = `${btn} !bg-red-500/10 !border-red-500/30 !text-red-300 hover:!bg-red-500/25 hover:!border-red-500/50`
const btnActive = `${btn} !bg-indigo-500/35 !border-indigo-500 !text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]`

interface GNode extends AnyObj { id: string; label: string; type: string; group?: number; x?: number; y?: number; __size?: number }
interface GLink { source: string | AnyObj; target: string | AnyObj }
interface Toast { msg: string; type: string }

function CourseMindMap() {
  const { courseSlug } = useParams()
  const [courseId, setCourseId] = useState(resolveToId(courseSlug || ''))
  const navigate = useNavigate()
  const { t } = useTranslation()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: GNode[]; links: GLink[] }>({ nodes: [], links: [] })
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [selectedNode, setSelectedNode] = useState<GNode | null>(null)
  const [noteText, setNoteText] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [loading, setLoading] = useState(true)
  const [courseName, setCourseName] = useState('')

  const showToast = useCallback((msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }, [])

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await mindmapApi.getTree(courseId!)
      let raw = unwrap(res) as AnyObj; if (typeof raw === 'string') raw = JSON.parse(raw)
      const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []) as GNode[]
      const rawLinks = (Array.isArray(raw.links) ? raw.links : []) as AnyObj[]
      const links = rawLinks.map((l) => ({ source: typeof l.source === 'object' ? (l.source as AnyObj).id as string : l.source as string, target: typeof l.target === 'object' ? (l.target as AnyObj).id as string : l.target as string }))
      const cn = nodes.find((n) => n.type === 'COURSE'); if (cn) setCourseName(cn.label)
      setGraphData({ nodes, links }); setNotes((raw.notes || {}) as Record<string, string>)
    } catch { showToast(t('mindmap.loadFailed'), 'error') }
    finally { setLoading(false) }
  }, [courseId, showToast])

  useEffect(() => {
    if (!courseSlug || isUuid(courseSlug)) return
    const resolved = resolveToId(courseSlug)
    if (isUuid(resolved)) { setCourseId(resolved); return }
    import('../api').then(({ courseApi }) => {
      courseApi.getAll(0, 200).then((res: unknown) => {
        type AO = Record<string, unknown>
        const unwrapLocal = (r: unknown) => { const rr = r as { data?: { data?: unknown } }; return rr?.data?.data ?? rr?.data ?? r }
        const list = Array.isArray(unwrapLocal(res)) ? unwrapLocal(res) as AO[] : ((unwrapLocal(res) as AO)?.content as AO[]) || []
        setSlugMap(list.map((x) => ({ id: String(x.courseId || x.id), title: String(x.title || '') })))
        const realId = resolveToId(courseSlug)
        if (isUuid(realId)) setCourseId(realId)
      }).catch(() => {})
    })
  }, [courseSlug])

  useEffect(() => { loadTree() }, [loadTree])

  const handleSave = useCallback(async () => {
    try {
      const cleanNodes = graphData.nodes.map(({ id, label, type, group, parentId, noteText: nt }) => ({ id, label, type, group, ...(parentId ? { parentId } : {}), ...(nt ? { noteText: nt } : {}) }))
      const cleanLinks = graphData.links.map((l) => ({ source: typeof l.source === 'object' ? (l.source as AnyObj).id : l.source, target: typeof l.target === 'object' ? (l.target as AnyObj).id : l.target }))
      await mindmapApi.saveTree(courseId!, { nodes: cleanNodes, links: cleanLinks, notes, nodePositions: {} } as unknown as Parameters<typeof mindmapApi.saveTree>[1])
      showToast(t('mindmap.saved'))
    } catch { showToast(t('mindmap.saveFailed'), 'error') }
  }, [courseId, graphData, notes, showToast])

  const handleReset = useCallback(async () => { if (!window.confirm(t('mindmap.confirmReset'))) return; try { await mindmapApi.resetTree(courseId!); setSelectedNode(null); await loadTree(); showToast(t('mindmap.resetSuccess')) } catch { showToast(t('mindmap.resetFailed'), 'error') } }, [courseId, loadTree, showToast, t])

  const handleNodeClick = useCallback((node: GNode) => { setSelectedNode(node); setNoteText(notes[node.id] || ''); if (graphRef.current) { graphRef.current.centerAt(node.x, node.y, 400); graphRef.current.zoom(2.5, 400) } }, [notes])
  const handleSaveNote = useCallback(() => { if (!selectedNode) return; setNotes((p) => { const n = { ...p }; noteText.trim() ? (n[selectedNode.id] = noteText) : delete n[selectedNode.id]; return n }); showToast(t('mindmap.noteUpdated')) }, [selectedNode, noteText, showToast, t])
  const handleAddNote = useCallback(() => { if (!selectedNode) return; const id = `note-${Date.now()}`; setGraphData((p) => ({ nodes: [...p.nodes, { id, label: t('mindmap.newNote'), type: 'USER_NOTE', group: (selectedNode.group || 0) + 1 }], links: [...p.links, { source: selectedNode.id, target: id }] })); setNotes((p) => ({ ...p, [id]: '' })); showToast(t('mindmap.noteAdded')) }, [selectedNode, showToast, t])

  const extractId = (nid: string) => { const p = nid.split('-'); return p.length > 1 ? p.slice(1).join('-') : nid }
  const getNodeUrl = useCallback((node: GNode) => { if (!node || !courseId) return null; const eid = extractId(node.id); const b = `/learning/${courseSlug || courseId}`; switch (node.type) { case 'CHAPTER': return `${b}?chapterId=${eid}`; case 'LESSON': return `${b}?lessonId=${eid}`; case 'VIDEO': case 'DOCUMENT': case 'QUIZ': return `${b}?contentId=${eid}`; default: return null } }, [courseId, courseSlug])
  const handleGoToContent = useCallback(() => { if (!selectedNode) return; const u = getNodeUrl(selectedNode); if (u) navigate(u) }, [selectedNode, getNodeUrl, navigate])


  const handleZoomIn = () => graphRef.current?.zoom((graphRef.current as GraphRef).zoom(0) * 1.3, 300)
  const handleZoomOut = () => graphRef.current?.zoom((graphRef.current as GraphRef).zoom(0) / 1.3, 300)
  const handleZoomFit = () => graphRef.current?.zoomToFit(400, 40)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const cfg = NODE_CFG[node.type] || NODE_CFG.UNKNOWN; const size = cfg.size / globalScale * 1.5; const hasNote = notes[node.id]; ctx.save(); ctx.shadowBlur = cfg.glow; ctx.shadowColor = cfg.color; ctx.fillStyle = cfg.color
    const x = node.x as number; const y = node.y as number
    switch (cfg.shape) {
      case 'hexagon': { const a = size * 0.7; ctx.beginPath(); for (let i = 0; i < 6; i++) { const ang = (Math.PI / 3) * i - Math.PI / 6; ctx.lineTo(x + a * Math.cos(ang), y + a * Math.sin(ang)) }; ctx.closePath(); ctx.fill(); break }
      case 'rounded': { ctx.beginPath(); ctx.arc(x, y, size * 0.5, 0, 2 * Math.PI); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5; ctx.stroke(); break }
      case 'triangle': { const s = size * 0.6; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.87, y + s * 0.5); ctx.lineTo(x + s * 0.87, y + s * 0.5); ctx.closePath(); ctx.fill(); break }
      case 'square': { const s = size * 0.45; ctx.fillRect(x - s, y - s, s * 2, s * 2); break }
      case 'diamond': { const s = size * 0.55; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); break }
      case 'star': { const o = size * 0.55; const inn = o * 0.4; ctx.beginPath(); for (let i = 0; i < 5; i++) { const oa = (Math.PI * 2 * i) / 5 - Math.PI / 2; const ia = oa + Math.PI / 5; ctx.lineTo(x + o * Math.cos(oa), y + o * Math.sin(oa)); ctx.lineTo(x + inn * Math.cos(ia), y + inn * Math.sin(ia)) }; ctx.closePath(); ctx.fill(); break }
      default: { ctx.beginPath(); ctx.arc(x, y, size * 0.4, 0, 2 * Math.PI); ctx.fill() }
    }
    if (hasNote) { ctx.shadowBlur = 0; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5 / globalScale; ctx.beginPath(); ctx.arc(x, y, size * 0.7 + 2, 0, 2 * Math.PI); ctx.stroke() }
    ctx.restore()
    const fs = Math.max(10 / globalScale, 2); ctx.font = `${fs}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(226,232,240,0.9)'; const ly = y + size * 0.6 + 2; const lab = node.label || ''; ctx.fillText(lab.length > 20 ? lab.slice(0, 20) + '…' : lab, x, ly); node.__size = size
  }, [notes])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => { const s = (node.__size || 12) * 0.8; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(node.x, node.y, s, 0, 2 * Math.PI); ctx.fill() }, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkColor = useCallback((link: any) => { const tn = graphData.nodes.find((n) => n.id === (link.target?.id || link.target)); return (NODE_CFG[tn?.type || ''] || NODE_CFG.UNKNOWN).color + '55' }, [graphData.nodes])

  const selectedCfg = selectedNode ? NODE_CFG[selectedNode.type] || NODE_CFG.UNKNOWN : null
  const typeColors: Record<string, string> = { COURSE: 'bg-indigo-500/20 text-indigo-300', CHAPTER: 'bg-amber-500/20 text-amber-200', LESSON: 'bg-green-500/20 text-green-300', VIDEO: 'bg-red-500/20 text-red-300', DOCUMENT: 'bg-blue-500/20 text-blue-300', QUIZ: 'bg-purple-500/20 text-purple-300', USER_NOTE: 'bg-yellow-500/20 text-yellow-200' }

  if (loading) return <div className="min-h-screen bg-[radial-gradient(ellipse_at_50%_30%,#111639_0%,#0a0e27_70%)] text-slate-200 flex flex-col"><Header /><div className="flex-1 flex items-center justify-center text-slate-500">{t('mindmap.loading')}</div></div>

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_50%_30%,#111639_0%,#0a0e27_70%)] text-slate-200 font-[Inter,'Segoe_UI',sans-serif] flex flex-col">
      <Header />
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-[rgba(17,22,57,0.85)] backdrop-blur-2xl border-b border-indigo-500/20 z-10 shrink-0">
        <Link to={`/learning/${courseSlug || courseId}`} className={`${btn} no-underline inline-flex items-center gap-1`}>{t('mindmap.back')}</Link>
        <span className="text-base font-semibold text-indigo-200 mr-auto whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">🗺️ {courseName || 'Mind Map'}</span>
        <button className={btn} onClick={handleZoomIn}>🔍+</button>
        <button className={btn} onClick={handleZoomOut}>🔍−</button>
        <button className={btn} onClick={handleZoomFit}>⊞ Fit</button>
        <button className={btnSave} onClick={handleSave}>{t('mindmap.save')}</button>
        <button className={btnDanger} onClick={handleReset}>{t('mindmap.reset')}</button>
      </div>

      {/* Main */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative">
          <ForceGraph2D ref={graphRef} graphData={graphData} nodeCanvasObject={nodeCanvasObject} nodePointerAreaPaint={nodePointerAreaPaint} onNodeClick={handleNodeClick as (node: object) => void} linkColor={linkColor} linkWidth={1.5} linkCurvature={0.15} linkDirectionalParticles={3} linkDirectionalParticleSpeed={0.004} linkDirectionalParticleWidth={2} backgroundColor="rgba(0,0,0,0)" cooldownTicks={80} d3VelocityDecay={0.3} d3AlphaDecay={0.02} enableNodeDrag enableZoomInteraction warmupTicks={50} />
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 px-3 py-2 bg-[rgba(17,22,57,0.8)] backdrop-blur-lg rounded-lg border border-indigo-500/15 z-[5]">
            {LEGEND.map(([type, cfg]) => <div key={type} className="flex items-center gap-1 text-[0.7rem] text-slate-400"><div className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />{cfg.icon} {type}</div>)}
          </div>
        </div>

        {/* Note Panel */}
        <div className={`bg-[rgba(17,22,57,0.85)] backdrop-blur-2xl border-l border-indigo-500/20 shadow-[-4px_0_24px_rgba(99,102,241,0.08)] flex flex-col shrink-0 transition-all duration-300 overflow-y-auto ${selectedNode ? 'w-80' : 'w-0 border-l-0 overflow-hidden'}`}>
          {selectedNode ? (
            <>
              <div className="p-4 border-b border-indigo-500/15"><h3 className="m-0 mb-1 text-[0.95rem] text-indigo-200">{selectedNode.label}</h3><span className={`inline-block px-2 py-px rounded text-[0.72rem] font-semibold uppercase tracking-wider ${typeColors[selectedNode.type] || ''}`}>{selectedCfg?.icon} {selectedNode.type}</span></div>
              <div className="p-4 flex-1"><label className="block text-[0.78rem] text-slate-400 mb-1.5 uppercase tracking-wider">{t('mindmap.noteLabel')}</label><textarea className="w-full min-h-[150px] p-2.5 border border-indigo-500/20 rounded-lg bg-[rgba(15,23,42,0.6)] text-slate-200 font-mono text-[0.82rem] leading-relaxed resize-y outline-none transition-border focus:border-indigo-500/50 focus:shadow-[0_0_8px_rgba(99,102,241,0.15)]" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={t('mindmap.notePlaceholder')} /></div>
              <div className="p-3 border-t border-indigo-500/10 flex flex-col gap-2">
                <button className={`${btnSave} w-full text-center`} onClick={handleSaveNote}>{t('mindmap.saveNote')}</button>
                <button className={`${btn} w-full text-center`} onClick={handleAddNote}>{t('mindmap.addChildNote')}</button>
                {getNodeUrl(selectedNode) && <button className={`${btnActive} w-full text-center`} onClick={handleGoToContent}>{t('mindmap.viewContent')}</button>}
                <button className={`${btn} w-full text-center`} onClick={() => setSelectedNode(null)}>{t('mindmap.close')}</button>
              </div>
            </>
          ) : <div className="p-6 text-center text-slate-600 text-[0.85rem]">{t('mindmap.clickNode')}</div>}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-5 py-1.5 bg-[rgba(10,14,39,0.9)] border-t border-indigo-500/10 text-[0.72rem] text-slate-600 shrink-0">{['Nodes', 'Links', 'Notes', 'Mode'].map((l, i) => <span key={l} className="flex items-center gap-1">{l}: {i === 0 ? graphData.nodes.length : i === 1 ? graphData.links.length : i === 2 ? Object.keys(notes).length : '2D'}</span>)}</div>

      {/* Toast */}
      {toast && <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-lg text-[0.84rem] z-[100] animate-[slideUp_0.3s_ease] pointer-events-none ${toast.type === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-300' : 'bg-red-500/20 border border-red-500/40 text-red-300'}`}>{toast.msg}</div>}
    </div>
  )
}

export default CourseMindMap
