/**
 * AI Hints Panel — Gemini-powered coding assistant for practice exercises
 * Shows AI hints, error explanations, code reviews, and fix suggestions
 */
import { useState } from 'react'
import { askGeminiCode, type AICodeRequest } from '../services/geminiAI'

type AnyObj = Record<string, unknown>

interface AIHintsPanelProps {
  code: string
  language: string
  description: string
  testResults: AnyObj | null            // { results: [...], passed, failed }
  visible: boolean
}

const MODE_CONFIG = [
  { mode: 'hint' as const, icon: '💡', label: 'Gợi ý', desc: 'Nhận gợi ý mà không lộ đáp án' },
  { mode: 'explain_error' as const, icon: '🔍', label: 'Giải thích lỗi', desc: 'Hiểu tại sao code bị lỗi', needResults: true },
  { mode: 'review' as const, icon: '📝', label: 'Review code', desc: 'Đánh giá chất lượng code' },
  { mode: 'suggest_fix' as const, icon: '🔧', label: 'Gợi ý sửa', desc: 'Hướng tiếp cận để sửa lỗi' },
] as const

export default function AIHintsPanel({ code, language, description, testResults, visible }: AIHintsPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(true)
  const [activeMode, setActiveMode] = useState<string>('')

  if (!visible) return null

  const handleAsk = async (mode: AICodeRequest['mode']) => {
    if (loading) return
    setLoading(true)
    setError('')
    setActiveMode(mode)
    try {
      const results = testResults?.results as AnyObj[] | undefined
      const req: AICodeRequest = {
        code,
        language,
        description,
        mode,
        testResults: results?.map((r) => ({
          input: String(r.inputData || ''),
          expected: String(r.expectedOutput || ''),
          actual: String(r.actualOutput || ''),
          passed: r.status === 'PASS'
        }))
      }
      const aiResponse = await askGeminiCode(req)
      setResponses((prev) => ({ ...prev, [mode]: aiResponse }))
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || 'Lỗi khi gọi AI')
    } finally {
      setLoading(false)
    }
  }

  const hasTestResults = testResults && ((testResults.results as AnyObj[])?.length || 0) > 0

  return (
    <div className="mt-4 border border-indigo-200 rounded-2xl overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white shadow-[0_2px_12px_rgba(99,102,241,0.08)]">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-none cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-bold text-sm">AI Assistant</span>
          <span className="text-[0.72rem] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Gemini 2.0</span>
        </div>
        <span className="text-sm">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {/* Mode buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3 max-[640px]:grid-cols-1">
            {MODE_CONFIG.map((cfg) => {
              const disabled = cfg.needResults && !hasTestResults
              return (
                <button
                  key={cfg.mode}
                  type="button"
                  disabled={disabled || loading}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm border cursor-pointer transition-all
                    ${disabled ? 'opacity-40 cursor-not-allowed border-border-subtle bg-gray-50 text-text-muted' :
                      activeMode === cfg.mode && loading ? 'border-indigo-500 bg-indigo-500/8 text-indigo-600 animate-pulse' :
                      responses[cfg.mode] ? 'border-green-200 bg-green-50/50 text-green-700 hover:bg-green-50' :
                      'border-border-medium bg-white text-text-main hover:border-indigo-300 hover:bg-indigo-50/50'
                    }
                  `}
                  onClick={() => handleAsk(cfg.mode)}
                  title={disabled ? 'Cần submit code trước để sử dụng' : cfg.desc}
                >
                  <span className="text-lg shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[0.85rem]">{cfg.label}</div>
                    <div className="text-[0.72rem] text-text-muted truncate">{cfg.desc}</div>
                  </div>
                  {loading && activeMode === cfg.mode && <span className="text-[0.75rem]">⏳</span>}
                  {responses[cfg.mode] && !loading && <span className="text-[0.75rem]">✅</span>}
                </button>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600 mb-3">
              ⚠️ {error}
            </div>
          )}

          {/* AI Responses */}
          {Object.entries(responses).map(([mode, text]) => {
            const cfg = MODE_CONFIG.find((c) => c.mode === mode)
            if (!cfg || !text) return null
            return (
              <div key={mode} className="bg-white border border-border-medium rounded-xl mb-3 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-deep border-b border-border-subtle">
                  <span>{cfg.icon}</span>
                  <span className="text-sm font-bold text-text-main">{cfg.label}</span>
                  <button
                    type="button"
                    className="ml-auto text-[0.75rem] text-text-muted bg-transparent border-none cursor-pointer hover:text-red-500"
                    onClick={() => setResponses((prev) => { const n = { ...prev }; delete n[mode]; return n })}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-4 py-3 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {text.split(/```(\w*)\n([\s\S]*?)```/g).map((part, idx) => {
                    if (idx % 3 === 2) {
                      return <pre key={idx} className="bg-slate-900 text-green-400 font-mono text-[0.8rem] p-3 rounded-lg overflow-x-auto my-2">{part}</pre>
                    }
                    if (idx % 3 === 1) return null // language identifier
                    return <span key={idx}>{part.split('**').map((seg, si) =>
                      si % 2 === 1 ? <strong key={si}>{seg}</strong> : seg
                    )}</span>
                  })}
                </div>
              </div>
            )
          })}

          {/* Disclaimer */}
          <p className="m-0 text-[0.72rem] text-text-muted text-center">
            🤖 AI có thể sai — luôn kiểm tra và suy nghĩ kỹ trước khi áp dụng
          </p>
        </div>
      )}
    </div>
  )
}
