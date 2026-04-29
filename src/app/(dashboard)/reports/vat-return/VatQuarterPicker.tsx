'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  quarters: { label: string; from: string; to: string; due: string }[]
  current: string
}

export default function VatQuarterPicker({ quarters, current }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const apply = (from: string, to: string) => {
    const sp = new URLSearchParams()
    sp.set('from', from)
    sp.set('to', to)
    startTransition(() => router.push(`/reports/vat-return?${sp.toString()}`))
  }

  return (
    <div className="bg-white rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-zinc-400" />
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">VAT Quarter</p>
        {pending && <span className="text-[11px] text-zinc-400">Loading…</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {quarters.map(q => {
          const active = q.from === current
          return (
            <button
              key={q.from}
              onClick={() => apply(q.from, q.to)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-zinc-900'}`}>{q.label}</p>
              <p className={`text-[11px] mt-0.5 ${active ? 'text-zinc-300' : 'text-zinc-400'}`}>Due {formatDate(q.due)}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
