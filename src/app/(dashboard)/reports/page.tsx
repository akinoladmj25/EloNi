import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/utils'
import Link from 'next/link'
import { Download } from 'lucide-react'
import type { Invoice, Expense } from '@/types'

export const metadata = { title: 'Reports' }

const EXPENSE_CATEGORIES = [
  'Software', 'Travel', 'Office', 'Marketing',
  'Equipment', 'Meals', 'Professional', 'Other',
]

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/settings')

  const cur = org.default_currency

  const [{ data: rawInvoices }, { data: rawExpenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('status, total, currency, paid_at, created_at')
      .eq('org_id', org.id) as unknown as Promise<{ data: Pick<Invoice, 'status' | 'total' | 'currency' | 'paid_at' | 'created_at'>[] | null }>,
    supabase
      .from('expenses')
      .select('amount, currency, category, date')
      .eq('org_id', org.id) as unknown as Promise<{ data: Pick<Expense, 'amount' | 'currency' | 'category' | 'date'>[] | null }>,
  ])

  const invoices = rawInvoices ?? []
  const expenses = rawExpenses ?? []

  // Filter to default currency for accurate P&L
  const inv = invoices.filter(i => i.currency === cur)
  const exp = expenses.filter(e => e.currency === cur)

  const totalInvoiced    = inv.reduce((s, i) => s + (i.total ?? 0), 0)
  const totalPaid        = inv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOutstanding = inv.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalOverdue     = inv.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total ?? 0), 0)
  const totalExpenses    = exp.reduce((s, e) => s + (e.amount ?? 0), 0)
  const netProfit        = totalPaid - totalExpenses

  // Expenses by category
  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: exp.filter(e => e.category === cat).reduce((s, e) => s + (e.amount ?? 0), 0),
    count: exp.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total)

  // Invoices by status
  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', sent: 'Sent', paid: 'Paid',
    overdue: 'Overdue', cancelled: 'Cancelled',
  }
  const byStatus = Object.keys(STATUS_LABELS).map(s => ({
    status: s,
    label: STATUS_LABELS[s],
    count: inv.filter(i => i.status === s).length,
    total: inv.filter(i => i.status === s).reduce((sum, i) => sum + (i.total ?? 0), 0),
  })).filter(s => s.count > 0)

  const hasMixed = invoices.some(i => i.currency !== cur) || expenses.some(e => e.currency !== cur)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Reports</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Financial overview for {org.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/invoices"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors"
          >
            <Download size={14} /> Export invoices
          </a>
          <a
            href="/api/export/expenses"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors"
          >
            <Download size={14} /> Export expenses
          </a>
        </div>
      </div>

      {hasMixed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700">
          Some invoices or expenses use a different currency. Figures below are shown in <strong>{cur}</strong> only.
        </div>
      )}

      {/* P&L Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Invoiced',   value: totalInvoiced,    color: 'text-zinc-900' },
          { label: 'Collected',        value: totalPaid,        color: 'text-emerald-700' },
          { label: 'Outstanding',      value: totalOutstanding, color: 'text-blue-700' },
          { label: 'Overdue',          value: totalOverdue,     color: totalOverdue > 0 ? 'text-red-700' : 'text-zinc-900' },
          { label: 'Total Expenses',   value: totalExpenses,    color: 'text-orange-700' },
          { label: 'Net Profit',       value: netProfit,        color: netProfit >= 0 ? 'text-emerald-700' : 'text-red-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${color}`}>{formatMoney(value, cur)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices by Status */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Invoices by Status</p>
            <p className="text-xs text-zinc-400 mt-0.5">{cur} only</p>
          </div>
          {byStatus.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">No invoices yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-100">
                  <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-2.5">Status</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-2.5">Count</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {byStatus.map(s => (
                  <tr key={s.status}>
                    <td className="px-5 py-3 text-sm font-medium text-zinc-700 capitalize">{s.label}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400 text-right">{s.count}</td>
                    <td className="px-5 py-3 text-sm font-bold text-zinc-900 text-right">{formatMoney(s.total, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-zinc-100">
            <Link href="/invoices" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              View all invoices →
            </Link>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">Expenses by Category</p>
            <p className="text-xs text-zinc-400 mt-0.5">{cur} only</p>
          </div>
          {byCategory.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">No expenses yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-100">
                  <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-2.5">Category</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-2.5">Count</th>
                  <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-5 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {byCategory.map(c => (
                  <tr key={c.cat}>
                    <td className="px-5 py-3 text-sm font-medium text-zinc-700">{c.cat}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400 text-right">{c.count}</td>
                    <td className="px-5 py-3 text-sm font-bold text-zinc-900 text-right">{formatMoney(c.total, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-zinc-100">
            <Link href="/expenses" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              View all expenses →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
