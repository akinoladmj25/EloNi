import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types'
import EditClientForm from './EditClientForm'

export const metadata = { title: 'Edit Client' }

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) redirect('/settings')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('org_id', org.id)
    .single() as { data: Client | null }

  if (!client) notFound()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Edit Client</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Update client details</p>
      </div>
      <EditClientForm client={client} />
    </div>
  )
}
