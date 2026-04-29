import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Download, AlertTriangle, FileText, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { Invoice, Expense } from '@/types'
import PeriodPicker from './PeriodPicker'
import UkTaxCard from './UkTaxCard'
import ReportsNav from './ReportsNav'
import { currentTaxYearRange } from '@/lib/uk-tax'

export const metadata = { title: 'Reports' }

const EXPENSE_CATEGORIES = [
  'Software', 'Travel', 'Office', 'Marketing',
  'Equipment', 'Meals', 'Professional', 'Other',
]

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const cur = org.default_currency

  // Default range: current UK tax year
  const taxYear = currentTaxYearRange()
  const from = sp.from ?? taxYear.from
  const to   = sp.to   ?? taxYear.to
  const presetLabel = sp.preset === 'custom' ? `${formatDate(from)} – ${formatDate(to)}` : describePreset(sp.preset, from, to)

  const [{ data: rawInvoices }, { data: rawExpenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, total, subtotal, tax_amount, currency, paid_at, created_at, issue_date, client:clients(name)')
      .eq('org_id', org.id) as unknown as Promise<{ data: (Pick<Invoice, 'id' | 'status' | 'total' | 'subtotal' | 'tax_amount' | 'currency' | 'paid_at' | 'created_at' | 'issue_date'> & { client: { name: string } | null })[] | null }>,
    supabase
      .from('expenses')
      .select('amount, vat_amount, vat_reclaimable, currency, category, date')
      .eq('org_id', org.id) as unknown as Promise<{ data: (Pick<Expense, 'amount' | 'vat_amount' | 'vat_reclaimable' | 'currency' | 'category' | 'date'>)[] | null }>,
  ])

  const allInvoices = rawInvoices ?? []
  const allExpenses = rawExpenses ?? []

  // Filter to default currency for accurate P&L
  const invInPeriod = allInvoices.filter(i => {
    if (i.currency !== cur) return false
    // Income recognised when paid (cash basis) — use paid_at if paid, else issue_date for sent/overdue
    const refDate = i.status === 'paid' ? i.paid_at : i.issue_date
    if (!refDate) return false
    return refDate >= from && refDate <= to
  })
  const expInPeriod = allExpenses.filter(e => e.currency === cur && e.date >= from && e.date <= to)

  const totalInvoiced    = invInPeriod.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalPaid        = invInPeriod.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOutstanding = invInPeriod.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOverdue     = invInPeriod.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalExpenses    = expInPeriod.reduce((s, e) => s + (e.amount ?? 0), 0)
  const netProfit        = totalPaid - totalExpenses

  // VAT (paid invoices only, cash basis)
  const outputVat = invInPeriod.filter(i => i.status === 'paid').reduce((s, i) => s + (i.tax_amount ?? 0), 0)
  const inputVat  = expInPeriod.filter(e => e.vat_reclaimable !== false).reduce((s, e) => s + (e.vat_amount ?? 0), 0)
  const vatDue    = outputVat - inputVat

  // Expenses by category
  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: expInPeriod.filter(e => e.category === cat).reduce((s, e) => s + (e.amount ?? 0), 0),
    count: expInPeriod.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total)

  // Income by client (paid invoices only)
  const clientIncome: Record<string, number> = {}
  invInPeriod.filter(i => i.status === 'paid').forEach(i => {
    const name = i.client?.name ?? 'Unassigned'
    clientIncome[name] = (clientIncome[name] ?? 0) + (i.total ?? 0)
  })
  const byClient = Object.entries(clientIncome)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const hasMixed = allInvoices.some(i => i.currency !== cur) || allExpenses.some(e => e.currency !== cur)
  const businessType = (org.business_type ?? 'sole_trader') as 'sole_trader' | 'limited_company' | 'partnership'
  const vatRegistered = org.vat_registered === true

  const exportParams = `?from=${from}&to=${to}`

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Reports</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{presetLabel} · {org.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/export/invoices${exportParams}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors">
            <Download size={14} /> Export invoices
          </a>
          <a href={`/api/export/expenses${exportParams}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors">
            <Download size={14} /> Export expenses
          </a>
        </div>
      </div>

      <ReportsNav />

      <PeriodPicker />

      {hasMixed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <span>Some records use a different currency. Figures shown in <strong>{cur}</strong> only.</span>
        </div>
      )}

      {/* P&L Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard label="Income (collected)" value={formatMoney(totalPaid, cur)} sub={`${invInPeriod.filter(i => i.status === 'paid').length} paid`} icon={TrendingUp} stripe="linear-gradient(90deg,#22c55e,#4ade80)" />
        <StatCard label="Expenses" value={formatMoney(totalExpenses, cur)} sub={`${expInPeriod.length} entries`} icon={TrendingDown} stripe="linear-gradient(90deg,#fb923c,#f97316)" />
        <StatCard label="Net Profit" value={formatMoney(netProfit, cur)} sub="Income − expenses" icon={Wallet} stripe={netProfit >= 0 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#ef4444,#dc2626)'} valueClass={netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} />
        <StatCard label="Outstanding" value={formatMoney(totalOutstanding + totalOverdue, cur)} sub={totalOverdue > 0 ? `${formatMoney(totalOverdue, cur)} overdue` : 'Awaiting payment'} icon={FileText} stripe="linear-gradient(90deg,#3b82f6,#60a5fa)" />
      </div>

      {/* P&L summary line */}
      <div className="bg-white rounded-xl mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Profit &amp; Loss</p>
          <p className="text-xs text-zinc-400 mt-0.5">Cash basis · {presetLabel}</p>
        </div>
        <div className="divide-y divide-zinc-100">
          <PLRow label="Income (paid invoices)"   value={totalPaid} currency={cur} />
          <PLRow label="Less: expenses"           value={-totalExpenses} currency={cur} />
          <PLRow label="Net profit"               value={netProfit} currency={cur} bold totalRow />
        </div>
      </div>

      {/* VAT Summary (if registered) */}
      {vatRegistered && (
        <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">VAT Summary</p>
              <p className="text-xs text-zinc-400 mt-0.5">{org.vat_number ? `VAT no. ${org.vat_number}` : 'Standard rate · 20%'}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold bg-purple-50 text-purple-700">VAT registered</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Output VAT</p>
              <p className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(outputVat, cur)}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Collected on sales</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Input VAT</p>
              <p className="text-lg font-bold text-zinc-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(inputVat, cur)}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Reclaimable on purchases</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">{vatDue >= 0 ? 'VAT owed to HMRC' : 'VAT refund'}</p>
              <p className={`text-lg font-bold tracking-tight ${vatDue >= 0 ? 'text-red-600' : 'text-emerald-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(Math.abs(vatDue), cur)}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{vatDue >= 0 ? 'Output − Input' : 'Reclaimable from HMRC'}</p>
            </div>
          </div>
        </div>
      )}

      {/* UK Tax Estimate */}
      <div className="mb-6">
        <UkTaxCard netProfit={netProfit} currency={cur} defaultBusinessType={businessType} />
      </div>

      {/* Income & expense breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Income by Client */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Income by Client</p>
            <p className="text-xs text-zinc-400 mt-0.5">Top 10, paid invoices only</p>
          </div>
          {byClient.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">No income in this period</div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-zinc-50">
                {byClient.map(c => (
                  <tr key={c.name}>
                    <td className="px-5 py-3 text-sm font-medium text-zinc-700">{c.name}</td>
                    <td className="px-5 py-3 text-sm font-bold text-zinc-900 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(c.total, cur)}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400 text-right w-16">{totalPaid > 0 ? Math.round((c.total / totalPaid) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Expenses by Category</p>
            <p className="text-xs text-zinc-400 mt-0.5">{expInPeriod.length} entries</p>
          </div>
          {byCategory.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">No expenses in this period</div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-zinc-50">
                {byCategory.map(c => (
                  <tr key={c.cat}>
                    <td className="px-5 py-3 text-sm font-medium text-zinc-700">{c.cat}</td>
                    <td className="px-5 py-3 text-sm font-bold text-zinc-900 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(c.total, cur)}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400 text-right w-16">{totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 text-center">
        Income recognised on a cash basis (when paid). Tax estimates assume profit is your only income source.
      </p>
    </div>
  )
}

// ── helper components ────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, stripe, valueClass }: {
  label: string; value: string; sub: string; icon: any; stripe: string; valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="h-[3px]" style={{ background: stripe }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
          <Icon size={15} className="text-zinc-400" />
        </div>
        <p className={`text-[24px] font-bold tracking-tight leading-none ${valueClass ?? 'text-zinc-900'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        <p className="text-[11px] text-zinc-400 mt-2">{sub}</p>
      </div>
    </div>
  )
}

function PLRow({ label, value, currency, bold, totalRow }: { label: string; value: number; currency: string; bold?: boolean; totalRow?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3.5 ${totalRow ? 'bg-zinc-50/60' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>{label}</span>
      <span className={`text-sm font-bold tracking-tight ${value < 0 ? 'text-orange-700' : value > 0 && bold ? 'text-emerald-700' : 'text-zinc-900'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(value, currency)}
      </span>
    </div>
  )
}

function describePreset(preset: string | undefined, from: string, to: string): string {
  switch (preset) {
    case 'this_month':    return 'This month'
    case 'last_month':    return 'Last month'
    case 'this_quarter':  return 'This quarter'
    case 'last_quarter':  return 'Last quarter'
    case 'this_tax_year': return 'This tax year'
    case 'last_tax_year': return 'Last tax year'
    case 'this_year':     return 'This calendar year'
    case 'all':           return 'All time'
    default:              return `${formatDate(from)} – ${formatDate(to)}`
  }
}
