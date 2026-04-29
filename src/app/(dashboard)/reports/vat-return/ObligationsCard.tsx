'use client'

import Link from 'next/link'
import { Building2, ExternalLink } from 'lucide-react'
import type { VatObligation } from '@/lib/hmrc/client'

export default function ObligationsCard({ obligations }: { obligations: VatObligation[] }) {
  if (!obligations || obligations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 mb-6 print:hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={14} className="text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-900">HMRC obligations</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Connected</span>
        </div>
        <p className="text-xs text-zinc-400">HMRC has no open VAT obligations for your VRN. All caught up.</p>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-white rounded-xl overflow-hidden mb-6 print:hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
        <Building2 size={14} className="text-zinc-400" />
        <p className="text-sm font-semibold text-zinc-900">Open VAT obligations from HMRC</p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Live</span>
      </div>
      <div className="divide-y divide-zinc-100">
        {obligations.map(o => {
          const overdue = o.due < today
          return (
            <Link
              key={o.periodKey}
              href={`/reports/vat-return?from=${o.start}&to=${o.end}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{o.start} – {o.end}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Period key: <code className="font-mono">{o.periodKey}</code></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-xs font-semibold ${overdue ? 'text-red-600' : 'text-zinc-700'}`}>Due {o.due}</p>
                  <p className="text-[11px] text-zinc-400">{overdue ? 'Overdue' : 'Open'}</p>
                </div>
                <ExternalLink size={13} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
