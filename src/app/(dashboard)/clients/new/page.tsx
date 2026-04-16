import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewClientForm from './NewClientForm'

export const metadata = { title: 'Add Client' }

export default async function NewClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/settings')

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Add Client</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Add a new client to your account</p>
      </div>
      <NewClientForm orgId={org.id} />
    </div>
  )
}
