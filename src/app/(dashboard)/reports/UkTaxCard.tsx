'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/utils'
import { estimateSoleTraderTax, calculateCorporationTax, TAX_YEAR_LABEL } from '@/lib/uk-tax'
import { Briefcase, Building2, Info } from 'lucide-react'

interface Props {
  netProfit: number
  currency: string
  defaultBusinessType?: 'sole_trader' | 'limited_company' | 'partnership'
}

const TYPE_OPTIONS = [
  { id: 'sole_trader',     label: 'Sole trader',      icon: Briefcase },
  { id: 'limited_company', label: 'Limited company',  icon: Building2 },
] as const

type BusinessType = typeof TYPE_OPTIONS[number]['id']

export default function UkTaxCard({ netProfit, currency, defaultBusinessType }: Props) {
  const initial: BusinessType = defaultBusinessType === 'limited_company' ? 'limited_company' : 'sole_trader'
  const [type, setType] = useState<BusinessType>(initial)
  const profit = Math.max(0, netProfit)

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">UK Tax Estimate</p>
          <p className="text-xs text-zinc-400 mt-0.5">Tax year {TAX_YEAR_LABEL} · Based on collected profit in this period</p>
        </div>
        <div className="flex bg-zinc-100 rounded-lg p-0.5">
          {TYPE_OPTIONS.map(opt => {
            const Icon = opt.icon
            const active = type === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setType(opt.id)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors ${
                  active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon size={12} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {type === 'sole_trader' ? <SoleTraderView profit={profit} currency={currency} /> : <LimitedCompanyView profit={profit} currency={currency} />}

      <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-start gap-2">
        <Info size={12} className="text-zinc-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Estimate only. Assumes this is your only income and you&rsquo;re England/Wales/NI resident. Scotland tax bands differ. Consult an accountant for accurate liability.
        </p>
      </div>
    </div>
  )
}

function SoleTraderView({ profit, currency }: { profit: number; currency: string }) {
  const r = estimateSoleTraderTax(profit)

  return (
    <div>
      {/* Top summary */}
      <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-100">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Profit</p>
          <p className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.profit, currency)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">HMRC takes</p>
          <p className="text-lg font-bold text-red-600 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.totalTaxAndNi, currency)}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Income tax + Class 4 NI</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">You keep</p>
          <p className="text-lg font-bold text-emerald-700 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.netAfterTax, currency)}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="px-5 py-4 space-y-2.5">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Income tax breakdown</p>
        <Row label={`Personal allowance (£${r.incomeTax.personalAllowance.toLocaleString()})`} value={'£0'} hint="0%" />
        {r.incomeTax.basicRate.taxable > 0 && (
          <Row label={`Basic rate on ${formatMoney(r.incomeTax.basicRate.taxable, currency)}`} value={formatMoney(r.incomeTax.basicRate.tax, currency)} hint="20%" />
        )}
        {r.incomeTax.higherRate.taxable > 0 && (
          <Row label={`Higher rate on ${formatMoney(r.incomeTax.higherRate.taxable, currency)}`} value={formatMoney(r.incomeTax.higherRate.tax, currency)} hint="40%" />
        )}
        {r.incomeTax.additionalRate.taxable > 0 && (
          <Row label={`Additional rate on ${formatMoney(r.incomeTax.additionalRate.taxable, currency)}`} value={formatMoney(r.incomeTax.additionalRate.tax, currency)} hint="45%" />
        )}
        <div className="flex justify-between text-sm pt-2 border-t border-zinc-100">
          <span className="font-semibold text-zinc-700">Total income tax</span>
          <span className="font-bold text-zinc-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.incomeTax.total, currency)}</span>
        </div>

        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pt-3">Class 4 National Insurance</p>
        {r.nationalInsurance.class4Main.profits > 0 && (
          <Row label={`On ${formatMoney(r.nationalInsurance.class4Main.profits, currency)} (£12,570 – £50,270)`} value={formatMoney(r.nationalInsurance.class4Main.ni, currency)} hint="6%" />
        )}
        {r.nationalInsurance.class4Upper.profits > 0 && (
          <Row label={`On ${formatMoney(r.nationalInsurance.class4Upper.profits, currency)} (above £50,270)`} value={formatMoney(r.nationalInsurance.class4Upper.ni, currency)} hint="2%" />
        )}
        {r.nationalInsurance.total === 0 && (
          <p className="text-xs text-zinc-400">Profit below £12,570 — no Class 4 NI due.</p>
        )}
        {r.nationalInsurance.total > 0 && (
          <div className="flex justify-between text-sm pt-2 border-t border-zinc-100">
            <span className="font-semibold text-zinc-700">Total NI</span>
            <span className="font-bold text-zinc-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.nationalInsurance.total, currency)}</span>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-zinc-100 bg-blue-50/50">
        <p className="text-[11px] text-blue-700">
          <strong>Self-Assessment due:</strong> 31 January (balance + first payment on account), 31 July (second payment on account).
        </p>
      </div>
    </div>
  )
}

function LimitedCompanyView({ profit, currency }: { profit: number; currency: string }) {
  const r = calculateCorporationTax(profit)
  const bandLabel = r.band === 'small' ? 'Small profits rate' : r.band === 'main' ? 'Main rate' : 'Marginal rate'

  return (
    <div>
      <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-100">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Profit</p>
          <p className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.profit, currency)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Corporation tax</p>
          <p className="text-lg font-bold text-red-600 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.total, currency)}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Effective {(r.effectiveRate * 100).toFixed(2)}%</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Retained</p>
          <p className="text-lg font-bold text-emerald-700 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.profit - r.total, currency)}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{bandLabel}</p>
        {r.band === 'small' && (
          <p className="text-xs text-zinc-500 leading-relaxed">Profit is at or below £50,000, so the small profits rate of <strong>19%</strong> applies.</p>
        )}
        {r.band === 'main' && (
          <p className="text-xs text-zinc-500 leading-relaxed">Profit is at or above £250,000, so the main rate of <strong>25%</strong> applies on the full amount.</p>
        )}
        {r.band === 'marginal' && (
          <>
            <p className="text-xs text-zinc-500 leading-relaxed">Profit between £50,000 and £250,000 — marginal relief applies.</p>
            <Row label={`Main rate (25% × ${formatMoney(r.profit, currency)})`} value={formatMoney(r.profit * 0.25, currency)} hint="25%" />
            <Row label="Less marginal relief" value={`− ${formatMoney(r.marginalRelief, currency)}`} hint="3/200" />
            <div className="flex justify-between text-sm pt-2 border-t border-zinc-100">
              <span className="font-semibold text-zinc-700">Net Corporation Tax</span>
              <span className="font-bold text-zinc-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.total, currency)}</span>
            </div>
          </>
        )}
      </div>

      <div className="px-5 py-3 border-t border-zinc-100 bg-blue-50/50">
        <p className="text-[11px] text-blue-700">
          <strong>Corporation Tax due:</strong> 9 months and 1 day after the end of your accounting period.
          <br />
          Note: this estimate excludes director&rsquo;s salary, dividends, and other allowable deductions.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-600">{label}</span>
      <span className="text-zinc-900 font-medium flex items-center gap-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {hint && <span className="text-[10px] text-zinc-400 font-normal">{hint}</span>}
        {value}
      </span>
    </div>
  )
}
