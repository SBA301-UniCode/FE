import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chatApi } from '../api'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
type Msg = { role: 'user' | 'bot'; text: string }

const STORAGE_KEY = 'unicode_chat_history'
const MAX_HISTORY = 50

const loadHistory = (): Msg[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Msg[]) : []
  } catch { return [] }
}
const saveHistory = (msgs: Msg[]) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)))
}

/** Parse AI response — replace [COURSE:uuid] with clickable links */
function RenderBotText({ text }: { text: string }) {
  const parts = text.split(/(\[COURSE:[^\]]+\])/g)
  return (
    <div className="whitespace-pre-wrap leading-relaxed text-[0.88rem]">
      {parts.map((part, i) => {
        const match = part.match(/\[COURSE:([^\]]+)\]/)
        if (match) {
          const courseId = match[1].trim()
          return (
            <Link
              key={i}
              to={`/courses/${courseId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded-lg no-underline font-semibold text-[0.82rem] hover:bg-primary-500/20 transition-colors mx-0.5"
            >
              📘 Xem khóa học
            </Link>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

export default function ChatWidget() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>(loadHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    saveHistory(messages)
  }, [messages])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg: Msg = { role: 'user', text: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await chatApi.sendMessage(msg)
      const data = (res as { data?: AnyObj })?.data as AnyObj | undefined
      const aiText = (data?.data || data?.message || 'Không có phản hồi') as string
      setMessages(prev => [...prev, { role: 'bot', text: aiText }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: t('chat.error') }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white shadow-[0_6px_24px_rgba(0,86,210,0.4)] border-none cursor-pointer flex items-center justify-center text-2xl transition-all hover:scale-110 hover:shadow-[0_8px_32px_rgba(0,86,210,0.5)] active:scale-95"
        aria-label={t('chat.openChat')}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[9998] w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] border border-border-medium flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
          {/* Header */}
          <div className="bg-[linear-gradient(135deg,#0056D2,#003E99)] text-white px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
            <div className="flex-1">
              <h3 className="m-0 text-[0.95rem] font-bold">{t('chat.title')}</h3>
              <p className="m-0 text-[0.75rem] text-white/70">{t('chat.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              className="bg-white/15 border-none text-white/80 cursor-pointer text-xs px-2 py-1 rounded-lg hover:bg-white/25 hover:text-white transition-colors"
              title={t('chat.clearChat')}
            >
              🗑️
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-[#F8FAFC]">
            {messages.length === 0 && (
              <div className="text-center py-8 text-text-muted text-[0.85rem]">
                <div className="text-4xl mb-3">🎓</div>
                <p className="m-0 font-semibold text-text-secondary mb-1">{t('chat.welcomeTitle')}</p>
                <p className="m-0 text-[0.8rem]">{t('chat.welcomeHint')}</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[0.88rem] ${
                    m.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-white border border-border-medium text-text-main rounded-bl-sm shadow-[0_1px_4px_rgba(0,0,0,0.05)]'
                  }`}
                >
                  {m.role === 'user' ? m.text : <RenderBotText text={m.text} />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border-medium rounded-2xl rounded-bl-sm px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary-500/40 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary-500/40 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary-500/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border-medium px-3 py-3 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={t('chat.placeholder')}
                disabled={loading}
                className="flex-1 border border-border-medium rounded-xl px-3.5 py-2.5 text-[0.88rem] outline-none bg-bg-deep focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-primary-500 text-white border-none cursor-pointer flex items-center justify-center text-lg transition-all hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
