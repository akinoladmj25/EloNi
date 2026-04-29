'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Calendar } from 'lucide-react'

interface Props {
  current: string
  basePath?: string
}

export default function AsOfDatePicker({ current, basePath = '/reports/balance-sheet' }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const presets = [
    { label: 'Today',           date: fmt(today) },
    { label: 'End of last month', date: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) },
    { label: 'End of last quarter', date: (() => {
      const q = Math.floor(today.getMonth() / 3)
      return fmt(new Date(today.getFullYear(), q * 3, 0))
    })() },
    { label: 'End of last UK tax year', date: (() => {
      const y = today.getFullYear()
      const inCurTaxYear = today >= new Date(y, 3, 6)
      return inCurTaxYear ? `${y}-04-05` : `${y - 1}-04-05`
    })() },
  ]

  const apply = (date: string) => {
    const sp = new URLSearchParams()
    sp.set('as_of', date)
    startTransition(() => router.push(`${basePath}?${sp.toString()}`))
  }

  return (
    <div className="bg-white rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-zinc-400" />
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">As at</p>
        {pending && <span className="text-[11px] text-zinc-400">Loading…</span>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map(p => (
          <button
            key={p.date}
            onClick={() => apply(p.date)}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              current === p.date ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="h-6 w-px bg-zinc-200" />
        <input
          type="date"
          defaultValue={current}
          onChange={e => e.target.value && apply(e.target.value)}
          className="h-8 px-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
        />
      </div>
    </div>
  )
}
