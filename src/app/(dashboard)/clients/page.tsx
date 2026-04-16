import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'
import type { Client } from '@/types'
import DeleteClientButton from './DeleteClientButton'

export const metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()
  const { data: clients } = await supabase
    .from('clients').select('*').eq('org_id', org?.id ?? '').order('name') as { data: Client[] | null }

  const all = clients ?? []

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Clients</h1>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add client
        </Link>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {all.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400 mb-3">No clients yet</p>
            <Link href="/clients/new" className="inline-flex items-center gap-1.5 text-sm text-zinc-900 font-medium hover:underline">
              <Plus size={13} /> Add your first client
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50/50">
              <div className="col-span-4 text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Name</div>
              <div className="col-span-4 text-[11px] font-medium text-zinc-400 uppercase tracking-wide hidden sm:block">Email</div>
              <div className="col-span-4 text-[11px] font-medium text-zinc-400 uppercase tracking-wide hidden md:block">Company</div>
            </div>
            <div className="divide-y divide-zinc-50">
              {all.map(client => (
                <div key={client.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-600 text-[11px] font-semibold uppercase">
                      {client.name.charAt(0)}
                    </div>
                    <Link href={`/clients/${client.id}`} className="text-sm font-medium text-zinc-900 hover:text-zinc-600 hover:underline truncate transition-colors">{client.name}</Link>
                  </div>
                  <div className="col-span-4 text-sm text-zinc-500 truncate hidden sm:block">
                    {client.email ?? <span className="text-zinc-300">—</span>}
                  </div>
                  <div className="col-span-3 text-sm text-zinc-400 truncate hidden md:block">
                    {client.company ?? <span className="text-zinc-300">—</span>}
                  </div>
                  <div className="col-span-8 sm:col-span-4 md:col-span-1 flex items-center justify-end gap-2">
                    <Link
                      href={`/clients/${client.id}/edit`}
                      className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <DeleteClientButton clientId={client.id} clientName={client.name} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
