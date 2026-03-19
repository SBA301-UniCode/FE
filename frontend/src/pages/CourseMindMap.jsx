import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { mindmapApi } from '../api/mindmap'
import Header from '../components/layout/Header'
import './CourseMindMap.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res

/* ── Node style config ── */
const NODE_CFG = {
  COURSE:    { color: '#6366f1', size: 24, glow: 20, icon: '🎓', shape: 'hexagon' },
  CHAPTER:   { color: '#f59e0b', size: 16, glow: 14, icon: '📖', shape: 'rounded' },
  LESSON:    { color: '#22c55e', size: 12, glow: 10, icon: '📝', shape: 'circle' },
  VIDEO:     { color: '#ef4444', size: 8,  glow: 6,  icon: '▶',  shape: 'triangle' },
  DOCUMENT:  { color: '#3b82f6', size: 8,  glow: 6,  icon: '📄', shape: 'square' },
  QUIZ:      { color: '#a855f7', size: 8,  glow: 6,  icon: '✏️', shape: 'diamond' },
  USER_NOTE: { color: '#fbbf24', size: 10, glow: 8,  icon: '💡', shape: 'star' },
  UNKNOWN:   { color: '#64748b', size: 8,  glow: 4,  icon: '?',  shape: 'circle' },
}

const LEGEND = Object.entries(NODE_CFG).filter(([k]) => k !== 'UNKNOWN')

function CourseMindMap() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const graphRef = useRef(null)

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [notes, setNotes] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [courseName, setCourseName] = useState('')

  /* ── Show toast ── */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  /* ── Load tree data ── */
  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await mindmapApi.getTree(courseId)
      let raw = unwrap(res)
      if (typeof raw === 'string') raw = JSON.parse(raw)
      const nodes = Array.isArray(raw.nodes) ? raw.nodes : []
      const rawLinks = Array.isArray(raw.links) ? raw.links : []
      // Normalize links: source/target may be objects from corrupted saves
      const links = rawLinks.map((l) => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }))
      const loadedNotes = raw.notes || {}

      // Find course name
      const courseNode = nodes.find((n) => n.type === 'COURSE')
      if (courseNode) setCourseName(courseNode.label)

      setGraphData({ nodes, links })
      setNotes(loadedNotes)
    } catch (err) {
      console.error('Failed to load mind-map:', err)
      showToast('Không tải được mind-map', 'error')
    } finally {
      setLoading(false)
    }
  }, [courseId, showToast])

  useEffect(() => { loadTree() }, [loadTree])

  /* ── Save tree ── */
  const handleSave = useCallback(async () => {
    try {
      // Sanitize: react-force-graph mutates nodes/links in-place with
      // runtime props (x, y, vx, vy, fx, fy, __size, index, etc.)
      // and converts link source/target from strings to full node objects.
      const cleanNodes = graphData.nodes.map(({ id, label, type, group, parentId, noteText }) => ({
        id, label, type, group,
        ...(parentId ? { parentId } : {}),
        ...(noteText ? { noteText } : {}),
      }))
      const cleanLinks = graphData.links.map((link) => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target,
      }))
      const payload = JSON.stringify({
        nodes: cleanNodes,
        links: cleanLinks,
        notes,
        nodePositions: {},
      })
      await mindmapApi.saveTree(courseId, payload)
      showToast('Đã lưu mind-map!')
    } catch (err) {
      console.error('Save failed:', err)
      showToast('Lưu thất bại', 'error')
    }
  }, [courseId, graphData, notes, showToast])

  /* ── Reset tree ── */
  const handleReset = useCallback(async () => {
    if (!window.confirm('Reset về cây mặc định? Ghi chú của bạn sẽ bị xóa.')) return
    try {
      await mindmapApi.resetTree(courseId)
      setSelectedNode(null)
      await loadTree()
      showToast('Đã reset mind-map!')
    } catch (err) {
      showToast('Reset thất bại', 'error')
    }
  }, [courseId, loadTree, showToast])

  /* ── Node click ── */
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
    setNoteText(notes[node.id] || '')
    // Zoom to node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400)
      graphRef.current.zoom(2.5, 400)
    }
  }, [notes])

  /* ── Save note for selected node ── */
  const handleSaveNote = useCallback(() => {
    if (!selectedNode) return
    setNotes((prev) => {
      const next = { ...prev }
      if (noteText.trim()) {
        next[selectedNode.id] = noteText
      } else {
        delete next[selectedNode.id]
      }
      return next
    })
    showToast('Đã cập nhật ghi chú')
  }, [selectedNode, noteText, showToast])

  /* ── Add user note node ── */
  const handleAddNote = useCallback(() => {
    if (!selectedNode) return
    const noteId = `note-${Date.now()}`
    const newNode = {
      id: noteId,
      label: 'Ghi chú mới',
      type: 'USER_NOTE',
      group: (selectedNode.group || 0) + 1,
    }
    const newLink = { source: selectedNode.id, target: noteId }
    setGraphData((prev) => ({
      nodes: [...prev.nodes, newNode],
      links: [...prev.links, newLink],
    }))
    setNotes((prev) => ({ ...prev, [noteId]: '' }))
    showToast('Đã thêm ghi chú')
  }, [selectedNode, showToast])

  /* ── Extract entity UUID from node id (e.g. "ls-xxx" → "xxx") ── */
  const extractId = (nodeId) => {
    if (!nodeId) return ''
    const parts = nodeId.split('-')
    return parts.length > 1 ? parts.slice(1).join('-') : nodeId
  }

  /* ── Build URL to CourseLearning for a node ── */
  const getNodeUrl = useCallback((node) => {
    if (!node || !courseId) return null
    const entityId = extractId(node.id)
    const base = `/learning/${courseId}`
    switch (node.type) {
      case 'CHAPTER': return `${base}?chapterId=${entityId}`
      case 'LESSON': return `${base}?lessonId=${entityId}`
      case 'VIDEO':
      case 'DOCUMENT':
      case 'QUIZ': return `${base}?contentId=${entityId}`
      default: return null
    }
  }, [courseId])

  /* ── Navigate to content ── */
  const handleGoToContent = useCallback(() => {
    if (!selectedNode) return
    const url = getNodeUrl(selectedNode)
    if (url) navigate(url)
  }, [selectedNode, getNodeUrl, navigate])

  /* ── Double-click → navigate directly ── */
  const handleNodeDblClick = useCallback((node) => {
    const url = getNodeUrl(node)
    if (url) navigate(url)
  }, [getNodeUrl, navigate])

  /* ── Zoom controls ── */
  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 300)
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.3, 300)
  const handleZoomFit = () => graphRef.current?.zoomToFit(400, 40)

  /* ── Custom canvas node renderer ── */
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const cfg = NODE_CFG[node.type] || NODE_CFG.UNKNOWN
    const size = cfg.size / globalScale * 1.5
    const hasNote = notes[node.id]

    // Glow
    ctx.save()
    ctx.shadowBlur = cfg.glow
    ctx.shadowColor = cfg.color
    ctx.fillStyle = cfg.color

    // Draw shape
    const x = node.x
    const y = node.y
    switch (cfg.shape) {
      case 'hexagon': {
        const a = size * 0.7
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6
          ctx.lineTo(x + a * Math.cos(angle), y + a * Math.sin(angle))
        }
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'rounded': {
        const r = size * 0.5
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2 * Math.PI)
        ctx.fill()
        // Inner ring
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 0.5
        ctx.stroke()
        break
      }
      case 'triangle': {
        const s = size * 0.6
        ctx.beginPath()
        ctx.moveTo(x, y - s)
        ctx.lineTo(x - s * 0.87, y + s * 0.5)
        ctx.lineTo(x + s * 0.87, y + s * 0.5)
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'square': {
        const s = size * 0.45
        ctx.fillRect(x - s, y - s, s * 2, s * 2)
        break
      }
      case 'diamond': {
        const s = size * 0.55
        ctx.beginPath()
        ctx.moveTo(x, y - s)
        ctx.lineTo(x + s, y)
        ctx.lineTo(x, y + s)
        ctx.lineTo(x - s, y)
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'star': {
        const outer = size * 0.55
        const inner = outer * 0.4
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2
          const innerAngle = outerAngle + Math.PI / 5
          ctx.lineTo(x + outer * Math.cos(outerAngle), y + outer * Math.sin(outerAngle))
          ctx.lineTo(x + inner * Math.cos(innerAngle), y + inner * Math.sin(innerAngle))
        }
        ctx.closePath()
        ctx.fill()
        break
      }
      default: {
        ctx.beginPath()
        ctx.arc(x, y, size * 0.4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // Note indicator ring
    if (hasNote) {
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 1.5 / globalScale
      ctx.beginPath()
      ctx.arc(x, y, size * 0.7 + 2, 0, 2 * Math.PI)
      ctx.stroke()
    }

    ctx.restore()

    // Label
    const fontSize = Math.max(10 / globalScale, 2)
    ctx.font = `${fontSize}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(226, 232, 240, 0.9)'
    const labelY = y + size * 0.6 + 2
    const label = node.label || ''
    const maxLen = 20
    const displayLabel = label.length > maxLen ? label.slice(0, maxLen) + '…' : label
    ctx.fillText(displayLabel, x, labelY)

    // Store for hit area
    node.__size = size
  }, [notes])

  /* ── Node pointer area ── */
  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    const size = (node.__size || 12) * 0.8
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  /* ── Link rendering ── */
  const linkColor = useCallback((link) => {
    const targetNode = graphData.nodes.find((n) => n.id === (link.target?.id || link.target))
    const cfg = NODE_CFG[targetNode?.type] || NODE_CFG.UNKNOWN
    return cfg.color + '55'
  }, [graphData.nodes])

  const selectedCfg = selectedNode ? (NODE_CFG[selectedNode.type] || NODE_CFG.UNKNOWN) : null

  if (loading) {
    return (
      <div className="mindmap-page">
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Đang tải mind-map...
        </div>
      </div>
    )
  }

  return (
    <div className="mindmap-page">
      <Header />

      {/* Toolbar */}
      <div className="mindmap-toolbar">
        <Link to={`/learning/${courseId}`} className="mindmap-btn mindmap-btn--back">← Quay lại</Link>
        <span className="mindmap-toolbar-title">🗺️ {courseName || 'Mind Map'}</span>
        <button className="mindmap-btn" onClick={handleZoomIn}>🔍+</button>
        <button className="mindmap-btn" onClick={handleZoomOut}>🔍−</button>
        <button className="mindmap-btn" onClick={handleZoomFit}>⊞ Fit</button>
        <button className="mindmap-btn mindmap-btn--save" onClick={handleSave}>💾 Lưu</button>
        <button className="mindmap-btn mindmap-btn--danger" onClick={handleReset}>🔄 Reset</button>
      </div>

      {/* Main */}
      <div className="mindmap-container">
        <div className="mindmap-graph">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDblClick}
            linkColor={linkColor}
            linkWidth={1.5}
            linkCurvature={0.15}
            linkDirectionalParticles={3}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleWidth={2}
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={80}
            d3VelocityDecay={0.3}
            d3AlphaDecay={0.02}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            warmupTicks={50}
          />

          {/* Legend */}
          <div className="mindmap-legend">
            {LEGEND.map(([type, cfg]) => (
              <div key={type} className="mindmap-legend-item">
                <div className="mindmap-legend-dot" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
                {cfg.icon} {type}
              </div>
            ))}
          </div>
        </div>

        {/* Note Panel */}
        <div className={`mindmap-note-panel ${!selectedNode ? 'mindmap-note-panel--collapsed' : ''}`}>
          {selectedNode ? (
            <>
              <div className="mindmap-note-header">
                <h3>{selectedNode.label}</h3>
                <span className={`mindmap-note-type mindmap-note-type--${selectedNode.type}`}>
                  {selectedCfg?.icon} {selectedNode.type}
                </span>
              </div>
              <div className="mindmap-note-body">
                <label>Ghi chú</label>
                <textarea
                  className="mindmap-note-textarea"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Viết ghi chú ở đây..."
                />
              </div>
              <div className="mindmap-note-actions">
                <button className="mindmap-btn mindmap-btn--save" onClick={handleSaveNote}>
                  📝 Lưu ghi chú
                </button>
                <button className="mindmap-btn" onClick={handleAddNote}>
                  ➕ Thêm ghi chú con
                </button>
                {getNodeUrl(selectedNode) && (
                  <button className="mindmap-btn mindmap-btn--active" onClick={handleGoToContent}>
                    📎 Xem nội dung {selectedNode.type === 'CHAPTER' ? 'chương' : selectedNode.type === 'LESSON' ? 'bài học' : selectedNode.type === 'VIDEO' ? 'video' : selectedNode.type === 'DOCUMENT' ? 'tài liệu' : selectedNode.type === 'QUIZ' ? 'bài kiểm tra' : ''}
                  </button>
                )}
                <button className="mindmap-btn" onClick={() => setSelectedNode(null)}>
                  ✕ Đóng
                </button>
              </div>
            </>
          ) : (
            <div className="mindmap-note-empty">
              Click vào một node để xem chi tiết và ghi chú
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="mindmap-statusbar">
        <span>Nodes: {graphData.nodes.length}</span>
        <span>Links: {graphData.links.length}</span>
        <span>Notes: {Object.keys(notes).length}</span>
        <span>Mode: 2D</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mindmap-toast mindmap-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default CourseMindMap
