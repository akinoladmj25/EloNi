'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Calendar } from 'lucide-react'

interface Props {
  current: string
  basePath?: string
}

function buildTaxYears(count = 4) {
  const years: { from: string; to: string; label: string }[] = []
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  // Find current tax year start
  let currentStart = m > 3 || (m === 3 && d >= 6) ? y : y - 1
  for (let i = 0; i < count; i++) {
    const startYear = currentStart - i
    const endYear = startYear + 1
    years.push({
      from: `${startYear}-04-06`,
      to:   `${endYear}-04-05`,
      label: `${startYear.toString().slice(2)}/${endYear.toString().slice(2)}`,
    })
  }
  return years
}

export default function TaxYearPicker({ current, basePath = '/reports/self-assessment' }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const years = buildTaxYears(4)

  const apply = (from: string, to: string) => {
    const sp = new URLSearchParams()
    sp.set('from', from)
    sp.set('to', to)
    startTransition(() => router.push(`${basePath}?${sp.toString()}`))
  }

  return (
    <div className="bg-white rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-zinc-400" />
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tax Year</p>
        {pending && <span className="text-[11px] text-zinc-400">Loading…</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {years.map((y, i) => {
          const active = y.from === current
          return (
            <button
              key={y.from}
              onClick={() => apply(y.from, y.to)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-zinc-900'}`}>{y.label}</p>
              <p className={`text-[11px] mt-0.5 ${active ? 'text-zinc-300' : 'text-zinc-400'}`}>{i === 0 ? 'Current' : `${i} year${i > 1 ? 's' : ''} ago`}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
