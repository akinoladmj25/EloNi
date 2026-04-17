import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await req.json()
  if (!clientId) return NextResponse.json({ items: [] })

  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ items: [] })

  // Get the most recent invoice for this client with its items
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, currency, notes, terms, tax_rate, discount')
    .eq('client_id', clientId)
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!invoice) return NextResponse.json({ items: [] })

  const { data: items } = await supabase
    .from('invoice_items')
    .select('description, quantity, unit_price, amount')
    .eq('invoice_id', invoice.id)
    .order('sort_order')

  return NextResponse.json({
    items: items ?? [],
    currency: invoice.currency,
    notes: invoice.notes,
    terms: invoice.terms,
    tax_rate: invoice.tax_rate,
    discount: invoice.discount,
  })
}
