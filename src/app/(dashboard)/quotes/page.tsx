import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { Plus, Download } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import type { Quote } from '@/types'

export const metadata = { title: 'Quotes' }

const STATUSES = ['all', 'draft', 'sent', 'accepted', 'declined', 'expired'] as const

interface Props { searchParams: Promise<{ status?: string; q?: string }> }

export default async function QuotesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const params = await searchParams
  const sf = params.status ?? 'all'
  const q = params.q ?? ''

  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()

  // Auto-expire sent quotes past expiry date
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('quotes')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('org_id', org?.id ?? '')
    .eq('status', 'sent')
    .lt('expiry_date', today)
    .not('expiry_date', 'is', null)

  let query = supabase
    .from('quotes')
    .select('*, client:clients(name)')
    .eq('org_id', org?.id ?? '')
    .order('created_at', { ascending: false })

  if (sf !== 'all') query = query.eq('status', sf)

  const { data } = await query as { data: (Quote & { client: { name: string } | null })[] | null }

  const all = data ?? []
  const rows = q
    ? all.filter(i =>
        i.quote_number.toLowerCase().includes(q.toLowerCase()) ||
        i.client?.name?.toLowerCase().includes(q.toLowerCase())
      )
    : all

  const href = (s: string) => `/quotes${s !== 'all' ? `?status=${s}` : ''}${q ? `${s !== 'all' ? '&' : '?'}q=${encodeURIComponent(q)}` : ''}`

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Quotes</h1>
        <div className="flex items-center gap-2">
          <a href="/api/export/quotes"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium transition-colors">
            <Download size={14} />
            Export
          </a>
          <Link href="/quotes/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors">
            <Plus size={14} strokeWidth={2.5} />
            New quote
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form method="GET" className="flex-1">
          {sf !== 'all' && <input type="hidden" name="status" value={sf} />}
          <input name="q" defaultValue={q} type="search"
            placeholder="Search quotes..."
            className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors" />
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1 shrink-0">
          {STATUSES.map(s => (
            <Link key={s} href={href(s)}
              className={`h-9 px-3 rounded-md text-[13px] font-medium capitalize transition-colors inline-flex items-center ${
                sf === s
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
              }`}>
              {s}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400 mb-3">
              {q || sf !== 'all' ? 'No results found' : 'No quotes yet'}
            </p>
            {!q && sf === 'all' && (
              <Link href="/quotes/new" className="inline-flex items-center gap-1.5 text-sm text-zinc-900 font-medium hover:underline">
                <Plus size={13} /> Create your first quote
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#fafafa]">
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-5 py-2.5">Quote</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2.5">Client</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2.5">Issued</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2.5">Expires</th>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2.5">Status</th>
                  <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-5 py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map(q => (
                  <tr key={q.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/quotes/${q.id}`} className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{q.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(q.issue_date)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{q.expiry_date ? formatDate(q.expiry_date) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-zinc-900">{formatMoney(q.total, q.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-zinc-100">
              {rows.map(q => (
                <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{q.quote_number}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{q.client?.name ?? 'No client'} · {formatDate(q.issue_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-3">
                    <span className="text-sm font-medium text-zinc-900">{formatMoney(q.total, q.currency)}</span>
                    <StatusBadge status={q.status} />
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
