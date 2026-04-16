'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, Check, Copy } from 'lucide-react'

interface Props {
  quoteId: string
  publicToken: string | null
}

export default function ShareQuoteButton({ quoteId, publicToken: initialToken }: Props) {
  const [token, setToken] = useState(initialToken)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [open, setOpen] = useState(false)

  const portalUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/quote/${token}`
    : null

  const enableSharing = async () => {
    if (token) { setOpen(v => !v); return }
    setGenerating(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('quotes')
      .update({ public_token: crypto.randomUUID() })
      .eq('id', quoteId)
      .select('public_token')
      .single()
    if (data?.public_token) setToken(data.public_token)
    setGenerating(false)
    setOpen(true)
  }

  const copy = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const disable = async () => {
    const supabase = createClient()
    await supabase.from('quotes').update({ public_token: null }).eq('id', quoteId)
    setToken(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={enableSharing}
        disabled={generating}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
      >
        <Link2 size={15} />
        {generating ? 'Generating…' : 'Share link'}
      </button>

      {open && token && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-80 bg-white rounded-lg border border-zinc-200 shadow-lg p-4">
            <p className="text-xs font-semibold text-zinc-700 mb-1">Client quote link</p>
            <p className="text-xs text-zinc-400 mb-3">Anyone with this link can view and accept this quote.</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={portalUrl ?? ''}
                className="flex-1 h-8 px-2 rounded border border-zinc-200 text-xs text-zinc-600 bg-zinc-50 focus:outline-none truncate"
              />
              <button
                onClick={copy}
                className="h-8 px-2.5 rounded border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={disable}
              className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Disable sharing
            </button>
          </div>
        </>
      )}
    </div>
  )
}
