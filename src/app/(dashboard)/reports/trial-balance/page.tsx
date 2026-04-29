import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import ReportsNav from '../ReportsNav'
import PrintButton from '../vat-return/PrintButton'
import AsOfDatePicker from '../balance-sheet/AsOfDatePicker'
import { computeAccountBalances, type Account, type InvoiceForAcct, type ExpenseForAcct } from '@/lib/accounting'

export const metadata = { title: 'Trial Balance' }

const TYPE_ORDER: Record<string, number> = {
  asset:     1,
  liability: 2,
  equity:    3,
  income:    4,
  expense:   5,
}

const TYPE_LABEL: Record<string, string> = {
  asset:     'Assets',
  liability: 'Liabilities',
  equity:    'Equity',
  income:    'Income',
  expense:   'Expenses',
}

export default async function TrialBalancePage({
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

  const { data: existingCoa } = await supabase
    .from('chart_of_accounts').select('id').eq('org_id', org.id).limit(1)
  if (!existingCoa || existingCoa.length === 0) {
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

  const balances = computeAccountBalances({
    accounts: rawAccounts ?? [],
    invoices: rawInvoices ?? [],
    expenses: rawExpenses ?? [],
    asOfDate,
    isVatRegistered: isVatReg,
    defaultCurrency: cur,
  }).filter(b => Math.abs(b.balance) > 0.005 || b.account.is_system)

  // Group by type
  const byType = balances.reduce<Record<string, typeof balances>>((acc, b) => {
    const t = b.account.type
    if (!acc[t]) acc[t] = []
    acc[t].push(b)
    return acc
  }, {})

  const sortedTypes = Object.keys(byType).sort((a, b) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99))

  const totalDebit  = balances.reduce((s, b) => s + b.debit, 0)
  const totalCredit = balances.reduce((s, b) => s + b.credit, 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="p-4 md:p-8">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-3 print:hidden">
        <ChevronLeft size={14} />
        Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Trial Balance</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{org.name} · As at {formatDate(asOfDate)}</p>
        </div>
        <PrintButton label="Print trial balance" />
      </div>

      <div className="print:hidden"><ReportsNav /></div>

      <div className="print:hidden mb-6">
        <AsOfDatePicker current={asOfDate} basePath="/reports/trial-balance" />
      </div>

      <div className={`mb-6 px-4 py-3 rounded-lg border flex items-start gap-2 print:hidden ${balanced ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        {balanced ? <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />}
        <div className="text-xs leading-relaxed">
          {balanced
            ? <>Trial balance is in balance. Total debits = total credits = {formatMoney(totalDebit, cur)}.</>
            : <><strong>Out of balance.</strong> Set opening balances on the <Link href="/chart-of-accounts" className="underline font-semibold">Chart of Accounts</Link> to reconcile.</>
          }
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50/70 border-b border-zinc-100">
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3 w-20">Code</th>
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Account</th>
              <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Debit</th>
              <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sortedTypes.map(t => (
              <>
                <tr key={`label-${t}`} className="bg-zinc-50/40">
                  <td colSpan={4} className="px-5 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{TYPE_LABEL[t]}</td>
                </tr>
                {byType[t].map(b => (
                  <tr key={b.account.id} className="hover:bg-zinc-50/30">
                    <td className="px-5 py-2.5 text-xs font-mono text-zinc-500">{b.account.code}</td>
                    <td className="px-5 py-2.5 text-sm text-zinc-700">{b.account.name}</td>
                    <td className="px-5 py-2.5 text-sm font-medium text-zinc-900 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{b.debit > 0 ? formatMoney(b.debit, cur) : <span className="text-zinc-300">—</span>}</td>
                    <td className="px-5 py-2.5 text-sm font-medium text-zinc-900 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{b.credit > 0 ? formatMoney(b.credit, cur) : <span className="text-zinc-300">—</span>}</td>
                  </tr>
                ))}
              </>
            ))}
            <tr className="bg-zinc-900 text-white">
              <td colSpan={2} className="px-5 py-3 text-sm font-bold">Totals</td>
              <td className="px-5 py-3 text-sm font-bold text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(totalDebit, cur)}</td>
              <td className="px-5 py-3 text-sm font-bold text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(totalCredit, cur)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
