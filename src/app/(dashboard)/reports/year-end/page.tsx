import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, Circle } from 'lucide-react'
import type { Invoice, Expense } from '@/types'
import ReportsNav from '../ReportsNav'
import TaxYearPicker from '../self-assessment/TaxYearPicker'
import PrintButton from '../vat-return/PrintButton'
import {
  estimateSoleTraderTax,
  calculateCorporationTax,
  currentTaxYearRange,
  selfAssessmentDates,
  TAX_YEAR_LABEL,
} from '@/lib/uk-tax'

export const metadata = { title: 'Year End' }

interface YearTotals {
  income: number
  expenses: number
  profit: number
  outputVat: number
  inputVat: number
  invoiceCount: number
  expenseCount: number
  topClient: { name: string; total: number } | null
}

export default async function YearEndPage({
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

  // Compute previous year range for comparison
  const prevFromYear = parseInt(from.slice(0, 4)) - 1
  const prevToYear   = parseInt(to.slice(0, 4)) - 1
  const prevFrom = `${prevFromYear}-04-06`
  const prevTo   = `${prevToYear}-04-05`

  const yearLabel = `${from.slice(2, 4)}/${to.slice(2, 4)}`
  const prevYearLabel = `${prevFrom.slice(2, 4)}/${prevTo.slice(2, 4)}`

  const [{ data: rawInvoices }, { data: rawExpenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('status, total, subtotal, tax_amount, currency, paid_at, client:clients(name)')
      .eq('org_id', org.id)
      .eq('status', 'paid') as unknown as Promise<{ data: (Pick<Invoice, 'status' | 'total' | 'subtotal' | 'tax_amount' | 'currency' | 'paid_at'> & { client: { name: string } | null })[] | null }>,
    supabase
      .from('expenses')
      .select('amount, vat_amount, vat_reclaimable, currency, date')
      .eq('org_id', org.id) as unknown as Promise<{ data: Pick<Expense, 'amount' | 'vat_amount' | 'vat_reclaimable' | 'currency' | 'date'>[] | null }>,
  ])

  const invAll = rawInvoices ?? []
  const expAll = rawExpenses ?? []
  const isVatReg = org.vat_registered === true

  const computeYear = (fromD: string, toD: string): YearTotals => {
    const inv = invAll.filter(i => i.currency === cur && i.paid_at && i.paid_at >= fromD && i.paid_at <= toD)
    const exp = expAll.filter(e => e.currency === cur && e.date >= fromD && e.date <= toD)
    const income   = isVatReg ? inv.reduce((s, i) => s + (i.subtotal ?? 0), 0) : inv.reduce((s, i) => s + (i.total ?? 0), 0)
    const expenses = isVatReg
      ? exp.reduce((s, e) => s + ((e.amount ?? 0) - (e.vat_amount ?? 0)), 0)
      : exp.reduce((s, e) => s + (e.amount ?? 0), 0)
    const outputVat = inv.reduce((s, i) => s + (i.tax_amount ?? 0), 0)
    const inputVat  = exp.filter(e => e.vat_reclaimable !== false).reduce((s, e) => s + (e.vat_amount ?? 0), 0)
    const profit = income - expenses
    // Top client
    const byClient: Record<string, number> = {}
    inv.forEach(i => {
      const name = i.client?.name ?? 'Unassigned'
      byClient[name] = (byClient[name] ?? 0) + (i.total ?? 0)
    })
    const sorted = Object.entries(byClient).sort((a, b) => b[1] - a[1])
    const topClient = sorted[0] ? { name: sorted[0][0], total: sorted[0][1] } : null
    return {
      income, expenses, profit, outputVat, inputVat,
      invoiceCount: inv.length, expenseCount: exp.length, topClient,
    }
  }

  const cur_y = computeYear(from, to)
  const prev_y = computeYear(prevFrom, prevTo)
  const hasPrev = prev_y.invoiceCount > 0 || prev_y.expenseCount > 0

  const businessType = org.business_type ?? 'sole_trader'
  const isLtd = businessType === 'limited_company'

  const tax = isLtd
    ? calculateCorporationTax(Math.max(0, cur_y.profit))
    : estimateSoleTraderTax(Math.max(0, cur_y.profit))
  const taxOwed = isLtd ? (tax as ReturnType<typeof calculateCorporationTax>).total : (tax as ReturnType<typeof estimateSoleTraderTax>).totalTaxAndNi

  const taxYearEndYear = parseInt(to.slice(0, 4))
  const saDates = selfAssessmentDates(taxYearEndYear)
  const ctDueDate = `${taxYearEndYear + 1}-01-01` // 9 months and 1 day after year end (simplified for April year-end)

  // Filing checklist
  const checklist = isLtd ? [
    { label: 'File Corporation Tax (CT600)', date: ctDueDate, hint: '12 months after year-end' },
    { label: 'Pay Corporation Tax', date: ctDueDate, hint: '9 months & 1 day after year-end' },
    { label: 'File Annual Accounts (Companies House)', date: `${taxYearEndYear + 1}-01-05`, hint: '9 months after year-end' },
    { label: 'File Confirmation Statement', date: '', hint: 'Annually on accounting reference date' },
  ] : [
    { label: 'File Self-Assessment online', date: saDates.balancingPayment, hint: '31 January after tax year end' },
    { label: 'Pay tax balance + 1st payment on account', date: saDates.firstPaymentOnAccount, hint: '31 January' },
    { label: 'Pay 2nd payment on account', date: saDates.secondPaymentOnAccount, hint: '31 July' },
    ...(isVatReg ? [{ label: 'File final VAT return for the year', date: '', hint: 'Quarterly under MTD' }] : []),
  ]

  return (
    <div className="p-4 md:p-8">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-3 print:hidden">
        <ChevronLeft size={14} />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Year End — {yearLabel}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{org.name} · {formatDate(from)} – {formatDate(to)}</p>
        </div>
        <PrintButton label="Print summary" />
      </div>

      <div className="print:hidden"><ReportsNav /></div>

      <div className="print:hidden mb-6">
        <TaxYearPicker current={from} basePath="/reports/year-end" />
      </div>

      {/* Headline numbers + YoY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <YoyCard label="Income"     value={cur_y.income}   prev={hasPrev ? prev_y.income   : null} currency={cur} icon={TrendingUp} positive />
        <YoyCard label="Expenses"   value={cur_y.expenses} prev={hasPrev ? prev_y.expenses : null} currency={cur} icon={TrendingDown} positive={false} />
        <YoyCard label="Net Profit" value={cur_y.profit}   prev={hasPrev ? prev_y.profit   : null} currency={cur} icon={TrendingUp} positive emphasise />
        <YoyCard label={isLtd ? 'Corp. Tax' : 'Tax + NI'}  value={taxOwed}        prev={null}                          currency={cur} icon={TrendingDown} positive={false} />
      </div>

      {/* Margin + key stats */}
      <div className="bg-white rounded-xl p-5 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-sm font-semibold text-zinc-900 mb-4">Key metrics</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Metric
            label="Profit margin"
            value={cur_y.income > 0 ? `${((cur_y.profit / cur_y.income) * 100).toFixed(1)}%` : '—'}
            sub={hasPrev && prev_y.income > 0 ? `vs ${((prev_y.profit / prev_y.income) * 100).toFixed(1)}% last year` : 'Profit ÷ income'}
          />
          <Metric
            label="Effective tax rate"
            value={cur_y.profit > 0 ? `${((taxOwed / cur_y.profit) * 100).toFixed(1)}%` : '—'}
            sub="Tax ÷ profit"
          />
          <Metric
            label="Avg invoice value"
            value={cur_y.invoiceCount > 0 ? formatMoney(cur_y.income / cur_y.invoiceCount, cur) : '—'}
            sub={`${cur_y.invoiceCount} invoices`}
          />
          <Metric
            label="Top client"
            value={cur_y.topClient?.name ?? '—'}
            sub={cur_y.topClient ? formatMoney(cur_y.topClient.total, cur) : 'No income recorded'}
          />
        </div>
      </div>

      {/* P&L summary */}
      <div className="bg-white rounded-xl mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Profit &amp; Loss summary</p>
          <p className="text-[11px] text-zinc-400">{isVatReg ? 'Net of VAT' : 'Gross figures'}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-100">
          <PLCol label="Income" value={cur_y.income} currency={cur} count={`${cur_y.invoiceCount} invoices`} />
          <PLCol label="Expenses" value={cur_y.expenses} currency={cur} count={`${cur_y.expenseCount} entries`} negative />
          <PLCol label="Net Profit" value={cur_y.profit} currency={cur} count={cur_y.profit >= 0 ? 'Profit' : 'Loss'} highlight={cur_y.profit >= 0 ? 'green' : 'red'} bold />
        </div>
      </div>

      {/* Tax owed card */}
      <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">{isLtd ? 'Corporation Tax' : 'Self-Assessment Tax'} — {TAX_YEAR_LABEL}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Estimated for tax year {yearLabel}</p>
          </div>
          <span className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded bg-zinc-100 text-zinc-600 tracking-wide">
            {isLtd ? 'Limited Company' : businessType.replace('_', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-100">
          <PLCol label="Profit" value={cur_y.profit} currency={cur} count="Pre-tax" />
          <PLCol label="HMRC takes" value={taxOwed} currency={cur} count={isLtd ? 'Corporation Tax' : 'Income tax + NI'} highlight="red" bold />
          <PLCol label="You keep" value={cur_y.profit - taxOwed} currency={cur} count="After tax" highlight="green" bold />
        </div>
      </div>

      {/* VAT summary if registered */}
      {isVatReg && (
        <div className="bg-white rounded-xl mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">VAT for the year</p>
            <p className="text-xs text-zinc-400 mt-0.5">Total across all VAT periods in {yearLabel}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            <PLCol label="Output VAT" value={cur_y.outputVat} currency={cur} count="Charged on sales" />
            <PLCol label="Input VAT" value={cur_y.inputVat} currency={cur} count="Reclaimed on purchases" />
            <PLCol label="Net VAT" value={cur_y.outputVat - cur_y.inputVat} currency={cur} count="Paid to HMRC" highlight={cur_y.outputVat - cur_y.inputVat >= 0 ? 'red' : 'green'} bold />
          </div>
        </div>
      )}

      {/* Filing checklist */}
      <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Filing checklist</p>
          <p className="text-xs text-zinc-400 mt-0.5">Key deadlines for {yearLabel} — confirm with your accountant</p>
        </div>
        <ul className="divide-y divide-zinc-100">
          {checklist.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-start gap-3 min-w-0">
                <Circle size={14} className="text-zinc-400 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{item.hint}</p>
                </div>
              </div>
              {item.date && (
                <span className="text-sm font-semibold text-zinc-700 whitespace-nowrap">{formatDate(item.date)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-6 print:hidden">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Note:</strong> All figures are estimates from your invoice and expense records.
          Actual filings depend on capital allowances, depreciation, allowable deductions, and other factors not tracked here.
          Always review with a qualified accountant before submitting to HMRC or Companies House.
        </p>
      </div>
    </div>
  )
}

function YoyCard({ label, value, prev, currency, icon: Icon, positive, emphasise }: {
  label: string; value: number; prev: number | null; currency: string;
  icon: any; positive: boolean; emphasise?: boolean
}) {
  const change = prev !== null && prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null
  const goodChange = change !== null && (positive ? change >= 0 : change <= 0)
  const ChangeIcon = change === null ? Minus : change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus

  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
        <Icon size={14} className="text-zinc-400" />
      </div>
      <p className={`text-[22px] font-bold tracking-tight leading-none ${emphasise ? (value >= 0 ? 'text-emerald-700' : 'text-red-700') : 'text-zinc-900'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(value, currency)}
      </p>
      {change !== null && (
        <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${goodChange ? 'text-emerald-700' : 'text-red-700'}`}>
          <ChangeIcon size={11} />
          {Math.abs(change).toFixed(1)}% YoY
        </div>
      )}
      {change === null && prev === null && (
        <p className="text-[11px] text-zinc-400 mt-2">No prior year data</p>
      )}
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{sub}</p>
    </div>
  )
}

function PLCol({ label, value, currency, count, highlight, bold, negative }: {
  label: string; value: number; currency: string; count: string;
  highlight?: 'red' | 'green'; bold?: boolean; negative?: boolean
}) {
  const valueColor =
    highlight === 'red' ? 'text-red-700' :
    highlight === 'green' ? 'text-emerald-700' :
    negative ? 'text-orange-700' : 'text-zinc-900'
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className={`text-lg ${bold ? 'font-bold' : 'font-semibold'} tracking-tight ${valueColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(value, currency)}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{count}</p>
    </div>
  )
}
