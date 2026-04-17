'use client'

import { useState, useRef, useEffect } from 'react'
import { SendHorizonal, Sparkles, RotateCcw } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Which client owes me the most?',
  'What was my best month this year?',
  'How much have I spent on software?',
  'Am I on track to hit £5k this month?',
  'Who are my top 3 clients by revenue?',
  'What are my total overdue invoices?',
]

export default function AskEloNi() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const ask = async (question: string) => {
    if (!question.trim() || loading) return
    setError('')
    const userMsg: Message = { role: 'user', content: question }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(false); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="max-w-xl mx-auto text-center pt-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={20} className="text-white" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Ask EloNi anything</h2>
            <p className="text-sm text-zinc-400 mb-8">Get instant answers about your invoices, clients, cash flow, and finances.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-left px-4 py-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-600 transition-colors"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                <Sparkles size={13} className="text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-zinc-900 text-white rounded-br-sm'
                : 'bg-white text-zinc-800 rounded-bl-sm'
            }`} style={m.role === 'assistant' ? { boxShadow: 'var(--shadow-card)' } : {}}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-sm text-red-500 bg-red-50 inline-block px-4 py-2 rounded-lg">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-zinc-200/70 px-4 md:px-8 py-4 bg-white">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError('') }}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0"
              title="Clear conversation"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <div className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 focus-within:border-zinc-400 focus-within:bg-white transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
              placeholder="Ask about your invoices, clients, cash flow…"
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
            />
            <button
              onClick={() => ask(input)}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-700 disabled:opacity-30 flex items-center justify-center shrink-0 transition-colors"
            >
              <SendHorizonal size={13} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
