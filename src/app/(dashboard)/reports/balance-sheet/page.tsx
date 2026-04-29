import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Invoice, Expense } from '@/types'
import ReportsNav from '../ReportsNav'
import PrintButton from '../vat-return/PrintButton'
import AsOfDatePicker from './AsOfDatePicker'
import { buildBalanceSheet, computeAccountBalances, type Account, type InvoiceForAcct, type ExpenseForAcct } from '@/lib/accounting'

export const metadata = { title: 'Balance Sheet' }

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ as_of?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const cur = org.default_currency
  const asOfDate = sp.as_of ?? new Date().toISOString().slice(0, 10)
  const isVatReg = org.vat_registered === true

  // Ensure CoA is seeded
  const { data: existing } = await supabase
    .from('chart_of_accounts').select('id').eq('org_id', org.id).limit(1)
  if (!existing || existing.length === 0) {
    await supabase.rpc('seed_chart_of_accounts', { p_org_id: org.id })
  }

  const [{ data: rawAccounts }, { data: rawInvoices }, { data: rawExpenses }] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, type, subtype, opening_balance, is_system, is_active')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('code') as unknown as Promise<{ data: Account[] | null }>,
    supabase
      .from('invoices')
      .select('status, total, subtotal, tax_amount, currency, paid_at, issue_date')
      .eq('org_id', org.id)
      .neq('status', 'draft')
      .neq('status', 'cancelled') as unknown as Promise<{ data: InvoiceForAcct[] | null }>,
    supabase
      .from('expenses')
      .select('amount, vat_amount, currency, category, date')
      .eq('org_id', org.id) as unknown as Promise<{ data: ExpenseForAcct[] | null }>,
  ])

  const accounts = rawAccounts ?? []
  const balances = computeAccountBalances({
    accounts,
    invoices: rawInvoices ?? [],
    expenses: rawExpenses ?? [],
    asOfDate,
    isVatRegistered: isVatReg,
    defaultCurrency: cur,
  })
  const bs = buildBalanceSheet(balances, asOfDate)

  return (
    <div className="p-4 md:p-8">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-3 print:hidden">
        <ChevronLeft size={14} />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{org.name} · As at {formatDate(asOfDate)}</p>
        </div>
        <PrintButton label="Print balance sheet" />
      </div>

      <div className="print:hidden"><ReportsNav /></div>

      <div className="print:hidden mb-6">
        <AsOfDatePicker current={asOfDate} />
      </div>

      <div className={`mb-6 px-4 py-3 rounded-lg border flex items-start gap-2 print:hidden ${bs.isBalanced ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        {bs.isBalanced ? <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />}
        <div className="text-xs leading-relaxed">
          {bs.isBalanced ? (
            <>The balance sheet balances. Assets equal Liabilities + Equity ({formatMoney(bs.totalAssets, cur)}).</>
          ) : (
            <>
              <strong>Out of balance by {formatMoney(bs.totalAssets - bs.totalLiabilitiesAndEquity, cur)}.</strong> This usually means opening balances need adjusting.
              Set them in <Link href="/chart-of-accounts" className="underline font-semibold">Chart of Accounts</Link>.
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ASSETS */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Assets</p>
            <p className="text-xs text-zinc-400 mt-0.5">What the business owns</p>
          </div>
          <div className="divide-y divide-zinc-100">
            {bs.currentAssets.length > 0 && <SectionLabel label="Current Assets" />}
            {bs.currentAssets.map(b => <BSRow key={b.account.id} balance={b} currency={cur} />)}
            {bs.fixedAssets.length > 0 && <SectionLabel label="Fixed Assets" />}
            {bs.fixedAssets.map(b => <BSRow key={b.account.id} balance={b} currency={cur} />)}
            <TotalRow label="Total Assets" value={bs.totalAssets} currency={cur} highlight="black" />
          </div>
        </div>

        {/* LIABILITIES + EQUITY */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Liabilities &amp; Equity</p>
            <p className="text-xs text-zinc-400 mt-0.5">What the business owes + owners&rsquo; stake</p>
          </div>
          <div className="divide-y divide-zinc-100">
            {bs.currentLiabilities.length > 0 && <SectionLabel label="Current Liabilities" />}
            {bs.currentLiabilities.map(b => <BSRow key={b.account.id} balance={b} currency={cur} />)}
            {bs.longTermLiabilities.length > 0 && <SectionLabel label="Long-term Liabilities" />}
            {bs.longTermLiabilities.map(b => <BSRow key={b.account.id} balance={b} currency={cur} />)}
            <TotalRow label="Total Liabilities" value={bs.totalLiabilities} currency={cur} />

            {bs.equity.length > 0 && <SectionLabel label="Equity" />}
            {bs.equity.map(b => <BSRow key={b.account.id} balance={b} currency={cur} />)}
            <TotalRow label="Total Equity" value={bs.totalEquity} currency={cur} />

            <TotalRow label="Total Liabilities + Equity" value={bs.totalLiabilitiesAndEquity} currency={cur} highlight="black" />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-6 print:hidden">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Note:</strong> This balance sheet is derived from your invoice and expense records on a cash basis.
          To make it complete and audit-ready, set <Link href="/chart-of-accounts" className="underline font-semibold">opening balances</Link> for bank, capital, and any prior-period figures.
          Bills/supplier invoices, fixed asset depreciation, and manual journal entries are not yet supported &mdash; coming next.
        </p>
      </div>
    </div>
  )
}

function BSRow({ balance, currency }: { balance: { account: Account; balance: number }; currency: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] font-mono text-zinc-400 w-10 shrink-0">{balance.account.code}</span>
        <span className="text-sm text-zinc-700 truncate">{balance.account.name}</span>
      </div>
      <span className={`text-sm font-medium tracking-tight whitespace-nowrap ${balance.balance < 0 ? 'text-red-700' : 'text-zinc-900'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(balance.balance, currency)}
      </span>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="bg-zinc-50/60 px-5 py-2">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}

function TotalRow({ label, value, currency, highlight }: { label: string; value: number; currency: string; highlight?: 'black' }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 ${highlight === 'black' ? 'bg-zinc-900 text-white' : 'bg-zinc-50/60'}`}>
      <span className={`text-sm font-bold ${highlight === 'black' ? 'text-white' : 'text-zinc-900'}`}>{label}</span>
      <span className="text-sm font-bold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(value, currency)}</span>
    </div>
  )
}
