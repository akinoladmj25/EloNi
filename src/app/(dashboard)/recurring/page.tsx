import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, formatDate } from '@/lib/utils'
import { Plus, RefreshCw, ChevronRight } from 'lucide-react'
import type { RecurringInvoice, Client } from '@/types'
import GenerateInvoiceButton from './GenerateInvoiceButton'

export const metadata = { title: 'Recurring Invoices' }

const FREQ_LABEL: Record<string, string> = {
  weekly:    'Weekly',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  annually:  'Annually',
}

const FREQ_COLOR: Record<string, string> = {
  weekly:    'text-violet-700 bg-violet-50',
  monthly:   'text-blue-700 bg-blue-50',
  quarterly: 'text-amber-700 bg-amber-50',
  annually:  'text-teal-700 bg-teal-50',
}

export default async function RecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: org } = await supabase
    .from('organisations')
    .select('id,default_currency')
    .eq('user_id', user.id)
    .single()

  const { data } = await supabase
    .from('recurring_invoices')
    .select('*, client:clients(name)')
    .eq('org_id', org?.id ?? '')
    .order('next_date', { ascending: true }) as {
      data: (RecurringInvoice & { client: Pick<Client, 'name'> | null })[] | null
    }

  const rows = data ?? []
  const activeRows = rows.filter(r => r.active)
  const pausedRows = rows.filter(r => !r.active)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Recurring Invoices</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Invoice templates that generate on a schedule</p>
        </div>
        <Link href="/recurring/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors">
          <Plus size={14} strokeWidth={2.5} />
          New template
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={20} className="text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700 mb-1">No recurring templates yet</p>
          <p className="text-xs text-zinc-400 mb-5">Set up a template for retainer clients or regular work</p>
          <Link href="/recurring/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors">
            <Plus size={13} /> Create your first template
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRows.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Active · {activeRows.length}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeRows.map(r => (
                  <RecurringCard key={r.id} r={r} orgId={org?.id ?? ''} />
                ))}
              </div>
            </section>
          )}
          {pausedRows.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                Paused · {pausedRows.length}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                {pausedRows.map(r => (
                  <RecurringCard key={r.id} r={r} orgId={org?.id ?? ''} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function RecurringCard({
  r,
  orgId,
}: {
  r: RecurringInvoice & { client: Pick<Client, 'name'> | null }
  orgId: string
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col gap-4 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/recurring/${r.id}/edit`}
            className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-1"
          >
            {r.title}
          </Link>
          {r.client?.name && (
            <p className="text-xs text-zinc-400 mt-0.5">{r.client.name}</p>
          )}
        </div>
        <span className={`inline-block shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold ${FREQ_COLOR[r.frequency] ?? 'text-zinc-500 bg-zinc-100'}`}>
          {FREQ_LABEL[r.frequency]}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-zinc-400 mb-0.5">Per invoice</p>
          <p className="text-xl font-bold text-zinc-900 tracking-tight">
            {formatMoney(r.total, r.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-zinc-400 mb-0.5">Next invoice</p>
          <p className="text-sm font-medium text-zinc-700">{formatDate(r.next_date)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <GenerateInvoiceButton recurringId={r.id} orgId={orgId} />
        <Link
          href={`/recurring/${r.id}/edit`}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Edit <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
