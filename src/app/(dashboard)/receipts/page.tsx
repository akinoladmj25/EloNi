import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { Printer } from 'lucide-react'
import type { Invoice } from '@/types'

export const metadata = { title: 'Receipts' }

interface Props { searchParams: Promise<{ q?: string }> }

export default async function ReceiptsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { q = '' } = await searchParams
  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()

  const { data } = await supabase
    .from('invoices')
    .select('*, client:clients(name)')
    .eq('org_id', org?.id ?? '')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false }) as { data: (Invoice & { client: { name: string } | null })[] | null }

  const all = data ?? []
  const rows = q
    ? all.filter(i =>
        i.invoice_number.toLowerCase().includes(q.toLowerCase()) ||
        i.client?.name?.toLowerCase().includes(q.toLowerCase())
      )
    : all

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Receipts</h1>
          <p className="text-sm text-zinc-400 mt-0.5">All paid invoices with downloadable receipts</p>
        </div>
      </div>

      <div className="mb-5">
        <form method="GET">
          <input name="q" defaultValue={q} type="search"
            placeholder="Search receipts..."
            className="w-full sm:w-72 h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors" />
        </form>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400 mb-1">No paid invoices yet</p>
            <p className="text-xs text-zinc-300">Receipts appear here once an invoice is marked as paid</p>
          </div>
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-5 py-2.5">Receipt / Invoice</th>
                  <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-4 py-2.5">Client</th>
                  <th className="text-left text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-4 py-2.5">Paid On</th>
                  <th className="text-right text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-4 py-2.5">Amount</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
                        {inv.invoice_number}
                      </Link>
                      <p className="text-xs text-zinc-400 mt-0.5">Receipt</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{inv.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">{formatMoney(inv.total, inv.currency)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/receipt/${inv.id}/print`} target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                        <Printer size={13} /> Receipt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-zinc-100">
              {rows.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3.5">
                  <Link href={`/invoices/${inv.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{inv.invoice_number}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{inv.client?.name ?? 'No client'} · {inv.paid_at ? formatDate(inv.paid_at) : '—'}</p>
                  </Link>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className="text-sm font-medium text-zinc-900">{formatMoney(inv.total, inv.currency)}</span>
                    <Link href={`/receipt/${inv.id}/print`} target="_blank"
                      className="text-zinc-400 hover:text-zinc-700 transition-colors">
                      <Printer size={15} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
