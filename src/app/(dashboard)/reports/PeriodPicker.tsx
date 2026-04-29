'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Calendar } from 'lucide-react'

const PRESETS = [
  { id: 'this_tax_year',   label: 'This tax year' },
  { id: 'last_tax_year',   label: 'Last tax year' },
  { id: 'this_month',      label: 'This month' },
  { id: 'last_month',      label: 'Last month' },
  { id: 'this_quarter',    label: 'This quarter' },
  { id: 'last_quarter',    label: 'Last quarter' },
  { id: 'this_year',       label: 'This calendar year' },
  { id: 'all',             label: 'All time' },
] as const

type PresetId = typeof PRESETS[number]['id']

function rangeForPreset(id: PresetId): { from: string; to: string } {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const fmt = (date: Date) => date.toISOString().slice(0, 10)
  const taxYearStart = new Date(y, 3, 6)
  const inCurTaxYear = today >= taxYearStart
  const curTaxYearFrom = inCurTaxYear ? new Date(y, 3, 6)     : new Date(y - 1, 3, 6)
  const curTaxYearTo   = inCurTaxYear ? new Date(y + 1, 3, 5) : new Date(y, 3, 5)

  switch (id) {
    case 'this_month':
      return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) }
    case 'last_month':
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) }
    case 'this_quarter': {
      const qStart = m - (m % 3)
      return { from: fmt(new Date(y, qStart, 1)), to: fmt(new Date(y, qStart + 3, 0)) }
    }
    case 'last_quarter': {
      const qStart = m - (m % 3) - 3
      return { from: fmt(new Date(y, qStart, 1)), to: fmt(new Date(y, qStart + 3, 0)) }
    }
    case 'this_tax_year':
      return { from: fmt(curTaxYearFrom), to: fmt(curTaxYearTo) }
    case 'last_tax_year':
      return {
        from: fmt(new Date(curTaxYearFrom.getFullYear() - 1, 3, 6)),
        to:   fmt(new Date(curTaxYearTo.getFullYear()   - 1, 3, 5)),
      }
    case 'this_year':
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    case 'all':
      return { from: '2000-01-01', to: fmt(new Date(y, m, d)) }
  }
}

export default function PeriodPicker() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [showCustom, setShowCustom] = useState(false)

  const currentPreset = (params.get('preset') as PresetId | 'custom' | null) ?? 'this_tax_year'
  const customFrom = params.get('from') ?? ''
  const customTo   = params.get('to') ?? ''

  const apply = (preset: PresetId) => {
    const r = rangeForPreset(preset)
    const sp = new URLSearchParams()
    sp.set('preset', preset)
    sp.set('from', r.from)
    sp.set('to', r.to)
    startTransition(() => router.push(`/reports?${sp.toString()}`))
  }

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const from = String(fd.get('from') ?? '')
    const to   = String(fd.get('to')   ?? '')
    if (!from || !to) return
    const sp = new URLSearchParams()
    sp.set('preset', 'custom')
    sp.set('from', from)
    sp.set('to', to)
    startTransition(() => router.push(`/reports?${sp.toString()}`))
  }

  return (
    <div className="bg-white rounded-xl p-4 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-zinc-400" />
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Period</p>
        {pending && <span className="text-[11px] text-zinc-400">Loading…</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => apply(p.id)}
            className={`h-8 px-3 rounded-lg text-[12px] font-medium transition-colors ${
              currentPreset === p.id
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(s => !s)}
          className={`h-8 px-3 rounded-lg text-[12px] font-medium transition-colors ${
            currentPreset === 'custom' || showCustom
              ? 'bg-zinc-900 text-white'
              : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          Custom
        </button>
      </div>

      {(showCustom || currentPreset === 'custom') && (
        <form onSubmit={applyCustom} className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">From</label>
            <input type="date" name="from" defaultValue={customFrom} required
              className="h-8 px-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">To</label>
            <input type="date" name="to" defaultValue={customTo} required
              className="h-8 px-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
          </div>
          <button type="submit"
            className="h-8 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold">
            Apply
          </button>
        </form>
      )}
    </div>
  )
}
