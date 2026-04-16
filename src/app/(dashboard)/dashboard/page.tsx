import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { Plus, ArrowUpRight, TrendingUp, AlertCircle, Clock, CheckCircle2, FileCheck2, TrendingDown, Wallet } from 'lucide-react'
import type { Invoice, Quote, Organisation } from '@/types'
import StatusBadge from '@/components/StatusBadge'

export const metadata = { title: 'Dashboard' }



export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single() as { data: Organisation | null }

  if (!org) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={22} className="text-zinc-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1">Set up your business profile</h2>
          <p className="text-sm text-zinc-400 mb-5">Add your business details to start creating invoices.</p>
          <Link href="/settings" className="inline-flex items-center h-9 px-5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
            Go to Settings
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: invoices }, { data: quotes }, { data: expenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, client:clients(name)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(20) as unknown as Promise<{ data: (Invoice & { client: { name: string } | null })[] | null }>,
    supabase
      .from('quotes')
      .select('id, status, total, currency')
      .eq('org_id', org.id) as unknown as Promise<{ data: Pick<Quote, 'id' | 'status' | 'total' | 'currency'>[] | null }>,
    supabase
      .from('expenses')
      .select('amount, currency')
      .eq('org_id', org.id) as unknown as Promise<{ data: { amount: number; currency: string }[] | null }>,
  ])

  const cur = org.default_currency
  const all = invoices ?? []
  const curInvoices = all.filter(i => i.currency === cur)
  const allQuotes = quotes ?? []
  const allExpenses = (expenses ?? []).filter(e => e.currency === cur)

  const sum = (filter?: string) =>
    curInvoices.filter(i => !filter || i.status === filter).reduce((s, i) => s + (i.total ?? 0), 0)
  const count = (filter?: string) =>
    filter ? curInvoices.filter(i => i.status === filter).length : all.length

  const pendingQuotes = allQuotes.filter(q => q.status === 'sent').length
  const acceptedQuotes = allQuotes.filter(q => q.status === 'accepted').length

  const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const totalPaid = sum('paid')
  const netProfit = totalPaid - totalExpenses

  const setupSteps = [
    { done: !!org.phone, label: "Add a phone number", href: "/settings" },
    { done: !!org.address, label: "Add your address", href: "/settings" },
    { done: !!org.logo_url, label: "Upload your logo", href: "/settings" },
  ]
  const incompleteSteps = setupSteps.filter(s => !s.done)
  const showOnboarding = incompleteSteps.length > 0 && all.length === 0

  const stats = [
    {
      label: 'Total Invoiced',
      value: formatMoney(sum(), cur),
      sub: `${count()} invoices`,
      icon: TrendingUp,
      accent: 'bg-zinc-900',
      iconColor: 'text-white',
      stripe: 'bg-zinc-900',
    },
    {
      label: 'Collected',
      value: formatMoney(totalPaid, cur),
      sub: `${count('paid')} paid`,
      icon: CheckCircle2,
      accent: 'bg-emerald-500',
      iconColor: 'text-white',
      stripe: 'bg-emerald-500',
    },
    {
      label: 'Outstanding',
      value: formatMoney(sum('sent'), cur),
      sub: `${count('sent')} awaiting payment`,
      icon: Clock,
      accent: 'bg-blue-500',
      iconColor: 'text-white',
      stripe: 'bg-blue-500',
    },
    {
      label: 'Overdue',
      value: formatMoney(sum('overdue'), cur),
      sub: `${count('overdue')} need attention`,
      icon: AlertCircle,
      accent: count('overdue') > 0 ? 'bg-red-500' : 'bg-zinc-300',
      iconColor: 'text-white',
      stripe: count('overdue') > 0 ? 'bg-red-500' : 'bg-zinc-200',
    },
  ]

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{org.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/quotes/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <FileCheck2 size={14} strokeWidth={2.5} />
            New quote
          </Link>
          <Link href="/invoices/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            <Plus size={14} strokeWidth={2.5} />
            New invoice
          </Link>
        </div>
      </div>


      {/* Onboarding prompt */}
      {showOnboarding && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-0.5">Complete your business profile</p>
            <p className="text-xs text-amber-600">
              {incompleteSteps.map((s, i) => (
                <span key={s.label}>{i > 0 ? ' · ' : ''}{s.label}</span>
              ))}
            </p>
          </div>
          <a href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors whitespace-nowrap">
            Go to settings <ArrowUpRight size={12} />
          </a>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className={`h-[3px] ${s.stripe}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{s.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.accent}`}>
                  <s.icon size={14} className={s.iconColor} />
                </div>
              </div>
              <p className="text-[26px] font-bold text-zinc-900 tracking-tight leading-none tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
              <p className="text-[11px] text-zinc-400 mt-2">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* P&L strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="h-[3px] bg-orange-400" />
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Total Expenses</p>
              <p className="text-[26px] font-bold text-zinc-900 tracking-tight leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(totalExpenses, cur)}</p>
              <Link href="/expenses" className="text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors mt-2 inline-flex items-center gap-0.5">
                View expenses <ArrowUpRight size={10} />
              </Link>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <TrendingDown size={15} className="text-white" />
            </div>
          </div>
        </div>
        <div className={`rounded-xl overflow-hidden ${netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`} style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className={`h-[3px] ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Net Profit</p>
              <p className={`text-[26px] font-bold tracking-tight leading-none ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(netProfit, cur)}</p>
              <p className="text-[11px] text-zinc-400 mt-2">Collected minus expenses</p>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
              <Wallet size={15} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quotes summary banner */}
      {(pendingQuotes > 0 || acceptedQuotes > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5 mb-6">
          <div className="flex items-center gap-3">
            <FileCheck2 size={16} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              {pendingQuotes > 0 && <span className="font-semibold">{pendingQuotes} quote{pendingQuotes > 1 ? 's' : ''} awaiting response</span>}
              {pendingQuotes > 0 && acceptedQuotes > 0 && ' · '}
              {acceptedQuotes > 0 && <span className="font-semibold">{acceptedQuotes} accepted — ready to convert</span>}
            </p>
          </div>
          <Link href="/quotes" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
            View quotes <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Recent invoices */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-zinc-100 gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Recent Invoices</p>
            <p className="text-xs text-zinc-400 mt-0.5">Latest activity across your invoices</p>
          </div>
          <Link href="/invoices"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>

        {all.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={18} className="text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-700 mb-1">No invoices yet</p>
            <p className="text-xs text-zinc-400 mb-5">Create your first invoice to get started</p>
            <Link href="/invoices/new"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors">
              <Plus size={13} /> Create invoice
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b border-zinc-100" style={{ background: '#fafafa' }}>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-5 py-3">Invoice</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3 hidden md:table-cell">Client</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Due</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Status</th>
                  <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {all.slice(0, 8).map(inv => (
                  <tr key={inv.id} className="group hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/invoices/${inv.id}`}
                        className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors group-hover:underline underline-offset-2 decoration-zinc-200">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-500 hidden md:table-cell">
                      {inv.client?.name ?? <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 hidden lg:table-cell">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold text-zinc-900">
                      {formatMoney(inv.total, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sm:hidden divide-y divide-zinc-100">
              {all.slice(0, 8).map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{inv.invoice_number}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{inv.client?.name ?? 'No client'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-3">
                    <span className="text-sm font-bold text-zinc-900">{formatMoney(inv.total, inv.currency)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
