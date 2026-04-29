import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Body {
  period_from: string
  period_to:   string
  box1: number; box2: number; box3: number; box4: number; box5: number
  box6: number; box7: number; box8: number; box9: number
  action: 'save_draft' | 'mark_filed' | 'mark_paid'
  notes?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  if (!body.period_from || !body.period_to) {
    return NextResponse.json({ error: 'Period required' }, { status: 400 })
  }

  // Find existing record for this period
  const { data: existing } = await supabase
    .from('vat_returns')
    .select('id, status, submitted_at, paid_at')
    .eq('org_id', org.id)
    .eq('period_from', body.period_from)
    .eq('period_to',   body.period_to)
    .maybeSingle()

  const now = new Date().toISOString()
  const baseFields = {
    org_id: org.id,
    period_from: body.period_from,
    period_to:   body.period_to,
    box1: body.box1, box2: body.box2, box3: body.box3, box4: body.box4, box5: body.box5,
    box6: body.box6, box7: body.box7, box8: body.box8, box9: body.box9,
    notes: body.notes ?? null,
    updated_at: now,
  }

  let payload: Record<string, unknown> = baseFields
  if (body.action === 'save_draft') {
    payload = { ...baseFields, status: 'draft' }
  } else if (body.action === 'mark_filed') {
    payload = {
      ...baseFields,
      status: 'submitted',
      submission_method: 'manual',
      submitted_at: existing?.submitted_at ?? now,
    }
  } else if (body.action === 'mark_paid') {
    payload = {
      ...baseFields,
      status: 'paid',
      submission_method: existing ? undefined : 'manual',
      submitted_at: existing?.submitted_at ?? now,
      paid_at: now,
    }
  }

  if (existing) {
    const { error } = await supabase.from('vat_returns').update(payload).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: existing.id, status: payload.status })
  } else {
    const { data, error } = await supabase.from('vat_returns').insert(payload).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id, status: payload.status })
  }
}
