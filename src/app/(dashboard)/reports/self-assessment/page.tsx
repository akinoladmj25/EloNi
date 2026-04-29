import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { AlertTriangle, ChevronLeft, FileText, CalendarClock } from 'lucide-react'
import type { Invoice, Expense } from '@/types'
import ReportsNav from '../ReportsNav'
import TaxYearPicker from './TaxYearPicker'
import PrintButton from '../vat-return/PrintButton'
import {
  estimateSoleTraderTax,
  currentTaxYearRange,
  selfAssessmentDates,
  TAX_YEAR_LABEL,
  SA103_CATEGORIES,
} from '@/lib/uk-tax'

export const metadata = { title: 'Self-Assessment' }

export default async function SelfAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const cur = org.default_currency
  const taxYear = currentTaxYearRange()
  const from = sp.from ?? taxYear.from
  const to   = sp.to   ?? taxYear.to

  const taxYearEndYear = parseInt(to.slice(0, 4))
  const dates = selfAssessmentDates(taxYearEndYear)
  const yearLabel = `${from.slice(2, 4)}/${to.slice(2, 4)}`

  const [{ data: rawInvoices }, { data: rawExpenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('status, total, subtotal, tax_amount, currency, paid_at')
      .eq('org_id', org.id)
      .eq('status', 'paid') as unknown as Promise<{ data: Pick<Invoice, 'status' | 'total' | 'subtotal' | 'tax_amount' | 'currency' | 'paid_at'>[] | null }>,
    supabase
      .from('expenses')
      .select('amount, vat_amount, currency, category, date')
      .eq('org_id', org.id) as unknown as Promise<{ data: Pick<Expense, 'amount' | 'vat_amount' | 'currency' | 'category' | 'date'>[] | null }>,
  ])

  const inv = (rawInvoices ?? []).filter(i =>
    i.currency === cur && i.paid_at && i.paid_at >= from && i.paid_at <= to
  )
  const exp = (rawExpenses ?? []).filter(e =>
    e.currency === cur && e.date >= from && e.date <= to
  )

  // For SA, we typically use the EX-VAT amount if VAT-registered (because output VAT isn't income)
  const isVatReg = org.vat_registered === true
  const turnover = isVatReg
    ? inv.reduce((s, i) => s + (i.subtotal ?? 0), 0)
    : inv.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalExpenses = isVatReg
    ? exp.reduce((s, e) => s + ((e.amount ?? 0) - (e.vat_amount ?? 0)), 0)
    : exp.reduce((s, e) => s + (e.amount ?? 0), 0)
  const netProfit = turnover - totalExpenses

  // Group expenses by SA103 category
  const saGroups: Record<string, { line: string; total: number; categories: string[] }> = {}
  for (const e of exp) {
    const mapping = SA103_CATEGORIES[e.category as keyof typeof SA103_CATEGORIES] ?? SA103_CATEGORIES.Other
    if (!saGroups[mapping.line]) saGroups[mapping.line] = { line: mapping.line, total: 0, categories: [] }
    const exVat = (e.amount ?? 0) - (isVatReg ? (e.vat_amount ?? 0) : 0)
    saGroups[mapping.line].total += exVat
    if (!saGroups[mapping.line].categories.includes(e.category)) {
      saGroups[mapping.line].categories.push(e.category)
    }
  }
  const saLines = Object.values(saGroups).sort((a, b) => b.total - a.total)

  const tax = estimateSoleTraderTax(Math.max(0, netProfit))

  const businessType = org.business_type ?? 'sole_trader'
  const isSoleTrader = businessType === 'sole_trader' || businessType === 'partnership'

  return (
    <div className="p-4 md:p-8">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-3 print:hidden">
        <ChevronLeft size={14} />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Self-Assessment</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Tax year {yearLabel} · {formatDate(from)} – {formatDate(to)}</p>
        </div>
        <PrintButton label="Print SA schedule" />
      </div>

      <div className="print:hidden"><ReportsNav /></div>

      {!isSoleTrader && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700 flex items-start gap-2 print:hidden">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <span>You&rsquo;re registered as a {businessType.replace('_', ' ')}. Self-Assessment applies to sole traders and partners. For limited companies, use the Year End report &amp; file CT600.</span>
        </div>
      )}

      <div className="print:hidden mb-6">
        <TaxYearPicker current={from} />
      </div>

      {/* Filing dates banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <DateBlock label="Online return deadline" date={dates.balancingPayment} icon={CalendarClock} />
        <DateBlock label="First payment on account" date={dates.firstPaymentOnAccount} icon={CalendarClock} />
        <DateBlock label="Second payment on account" date={dates.secondPaymentOnAccount} icon={CalendarClock} />
      </div>

      {/* SA103 schedule */}
      <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Self-employment income &amp; expenses (SA103)</p>
          <p className="text-xs text-zinc-400 mt-0.5">{org.name} · Tax year {yearLabel}{isVatReg ? ' · Figures exclude VAT' : ''}</p>
        </div>

        <div className="divide-y divide-zinc-100">
          <ScheduleRow label="Turnover (income from self-employment)" value={turnover} currency={cur} bold positive />

          <div className="bg-zinc-50/50 px-5 py-2.5">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Allowable business expenses</p>
          </div>

          {saLines.length === 0 && (
            <div className="px-5 py-3.5 text-sm text-zinc-400">No expenses recorded for this period</div>
          )}
          {saLines.map(line => (
            <ScheduleRow
              key={line.line}
              label={line.line}
              value={line.total}
              currency={cur}
              hint={line.categories.join(', ')}
            />
          ))}

          <ScheduleRow label="Total allowable expenses" value={totalExpenses} currency={cur} bold negative />
          <ScheduleRow label="Net profit (Turnover − Expenses)" value={netProfit} currency={cur} bold totalRow />
        </div>
      </div>

      {/* Tax computation */}
      <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Tax computation — {TAX_YEAR_LABEL}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Estimate based on this profit being your only income</p>
        </div>
        <div className="divide-y divide-zinc-100">
          <ScheduleRow label="Net profit" value={netProfit} currency={cur} bold />
          <ScheduleRow label={`Less: Personal allowance (£${tax.incomeTax.personalAllowance.toLocaleString()})`} value={-Math.min(netProfit, tax.incomeTax.personalAllowance)} currency={cur} />
          <ScheduleRow label="Taxable income" value={tax.incomeTax.taxableIncome} currency={cur} bold />

          {tax.incomeTax.basicRate.taxable > 0 && (
            <ScheduleRow label={`Basic rate 20% on ${formatMoney(tax.incomeTax.basicRate.taxable, cur)}`} value={tax.incomeTax.basicRate.tax} currency={cur} negative />
          )}
          {tax.incomeTax.higherRate.taxable > 0 && (
            <ScheduleRow label={`Higher rate 40% on ${formatMoney(tax.incomeTax.higherRate.taxable, cur)}`} value={tax.incomeTax.higherRate.tax} currency={cur} negative />
          )}
          {tax.incomeTax.additionalRate.taxable > 0 && (
            <ScheduleRow label={`Additional rate 45% on ${formatMoney(tax.incomeTax.additionalRate.taxable, cur)}`} value={tax.incomeTax.additionalRate.tax} currency={cur} negative />
          )}
          <ScheduleRow label="Income tax due" value={tax.incomeTax.total} currency={cur} bold negative />

          {tax.nationalInsurance.class4Main.ni > 0 && (
            <ScheduleRow label="Class 4 NI 6% (£12,570 – £50,270)" value={tax.nationalInsurance.class4Main.ni} currency={cur} negative />
          )}
          {tax.nationalInsurance.class4Upper.ni > 0 && (
            <ScheduleRow label="Class 4 NI 2% (above £50,270)" value={tax.nationalInsurance.class4Upper.ni} currency={cur} negative />
          )}
          {tax.nationalInsurance.total > 0 && (
            <ScheduleRow label="Class 4 NI due" value={tax.nationalInsurance.total} currency={cur} bold negative />
          )}

          <ScheduleRow label="Total tax &amp; NI due" value={tax.totalTaxAndNi} currency={cur} bold totalRow highlight="red" />
          <ScheduleRow label="Net profit after tax" value={tax.netAfterTax} currency={cur} bold highlight="green" />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-6 print:hidden">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Important:</strong> This estimate assumes self-employment is your only income source.
          If you have employment, dividend, rental, or other income, your actual tax will be different.
          File via <a href="https://www.gov.uk/log-in-file-self-assessment-tax-return" target="_blank" rel="noreferrer" className="underline">HMRC online</a> by 31 January.
          Print this page and share with your accountant.
        </p>
      </div>
    </div>
  )
}

function ScheduleRow({ label, value, currency, bold, negative, positive, totalRow, highlight, hint }: {
  label: string; value: number; currency: string;
  bold?: boolean; negative?: boolean; positive?: boolean;
  totalRow?: boolean; highlight?: 'red' | 'green'; hint?: string
}) {
  const sign = negative && value > 0 ? '−' : ''
  const valueColor =
    highlight === 'red' ? 'text-red-700' :
    highlight === 'green' ? 'text-emerald-700' :
    negative ? 'text-orange-700' :
    positive ? 'text-emerald-700' :
    'text-zinc-900'
  return (
    <div className={`flex items-start justify-between gap-4 px-5 py-3.5 ${totalRow ? 'bg-zinc-50/60' : ''}`}>
      <div className="min-w-0">
        <p className={`text-sm leading-relaxed ${bold ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>{label}</p>
        {hint && <p className="text-[11px] text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      <span className={`text-sm font-bold tracking-tight whitespace-nowrap ${valueColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {sign}{formatMoney(Math.abs(value), currency)}
      </span>
    </div>
  )
}

function DateBlock({ label, date, icon: Icon }: { label: string; date: string; icon: any }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-blue-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] text-blue-700 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-sm font-bold text-blue-900">{formatDate(date)}</p>
      </div>
    </div>
  )
}
