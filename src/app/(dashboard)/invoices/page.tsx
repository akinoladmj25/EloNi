import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { Plus, Download } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import type { Invoice } from '@/types'

export const metadata = { title: 'Invoices' }

const STATUSES = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const



interface Props { searchParams: Promise<{ status?: string; q?: string }> }

export default async function InvoicesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const params = await searchParams
  const sf = params.status ?? 'all'
  const q = params.q ?? ''

  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()

  // Auto-mark sent invoices as overdue if past due date
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .eq('org_id', org?.id ?? '')
    .eq('status', 'sent')
    .lt('due_date', today)
    .not('due_date', 'is', null)

  let query = supabase
    .from('invoices')
    .select('*, client:clients(name)')
    .eq('org_id', org?.id ?? '')
    .order('created_at', { ascending: false })

  if (sf !== 'all') query = query.eq('status', sf)

  const { data } = await query as { data: (Invoice & { client: { name: string } | null })[] | null }

  const all = data ?? []
  const rows = q
    ? all.filter(i =>
        i.invoice_number.toLowerCase().includes(q.toLowerCase()) ||
        i.client?.name?.toLowerCase().includes(q.toLowerCase())
      )
    : all

  const href = (s: string) => `/invoices${s !== 'all' ? `?status=${s}` : ''}${q ? `${s !== 'all' ? '&' : '?'}q=${encodeURIComponent(q)}` : ''}`

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Invoices</h1>
        <div className="flex items-center gap-2">
          <a href="/api/export/invoices"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <Download size={14} />
            Export
          </a>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            <Plus size={14} strokeWidth={2.5} />
            New invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form method="GET" className="flex-1">
          {sf !== 'all' && <input type="hidden" name="status" value={sf} />}
          <input
            name="q" defaultValue={q} type="search"
            placeholder="Search invoices..."
            className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
        </form>

        <div className="flex gap-1 overflow-x-auto pb-1 shrink-0">
          {STATUSES.map(s => (
            <Link
              key={s}
              href={href(s)}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold capitalize transition-colors inline-flex items-center ${
                sf === s
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'
              }`} style={ sf !== s ? { boxShadow: 'var(--shadow-sm)' } : {} }
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400 mb-3">
              {q || sf !== 'all' ? 'No results found' : 'No invoices yet'}
            </p>
            {!q && sf === 'all' && (
              <Link href="/invoices/new" className="inline-flex items-center gap-1.5 text-sm text-zinc-900 font-medium hover:underline">
                <Plus size={13} /> Create your first invoice
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-zinc-100" style={{ background: '#fafafa' }}>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-5 py-3">Invoice</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Client</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Issued</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Due</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3">Status</th>
                  <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map(inv => (
                  <tr key={inv.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/70 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{inv.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-zinc-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(inv.total, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-zinc-100">
              {rows.map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-4 hover:bg-zinc-50/80 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{inv.invoice_number}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{inv.client?.name ?? 'No client'} · {formatDate(inv.issue_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-3">
                    <span className="text-sm font-medium text-zinc-900">{formatMoney(inv.total, inv.currency)}</span>
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
