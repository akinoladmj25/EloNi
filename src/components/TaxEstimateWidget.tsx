'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/utils'

export default function TaxEstimateWidget({ netProfit, currency }: { netProfit: number; currency: string }) {
  const [rate, setRate] = useState(20)
  const estimate = netProfit > 0 ? (netProfit * rate) / 100 : 0
  const afterTax = netProfit - estimate

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Tax Estimate</p>
          <p className="text-xs text-zinc-400 mt-0.5">Based on net profit collected to date</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-zinc-500">Rate</label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={rate}
              onChange={e => setRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-16 h-8 pr-6 pl-2.5 text-sm text-right border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-zinc-100">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Net Profit</p>
          <p className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(netProfit, currency)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Est. Tax ({rate}%)</p>
          <p className="text-lg font-bold text-red-600 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(estimate, currency)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">After Tax</p>
          <p className={`text-lg font-bold tracking-tight ${afterTax >= 0 ? 'text-emerald-700' : 'text-red-600'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(afterTax, currency)}</p>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
        <p className="text-[11px] text-zinc-400">This is an estimate only. Consult an accountant for your actual tax liability.</p>
      </div>
    </div>
  )
}
