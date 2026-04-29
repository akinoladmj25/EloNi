import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { error } = await supabase
    .from('hmrc_connections')
    .delete()
    .eq('org_id', org.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
