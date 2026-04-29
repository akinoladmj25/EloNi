import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Expense } from '@/types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to   = url.searchParams.get('to')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('org_id', org.id)
    .order('date', { ascending: false })

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)

  const { data } = await query as unknown as { data: Expense[] | null }

  const rows = data ?? []

  const headers = ['Date', 'Description', 'Category', 'Amount', 'VAT Amount', 'VAT Reclaimable', 'Currency', 'Notes']

  const escape = (val: string | number | null | undefined) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.join(','),
    ...rows.map(e => [
      e.date,
      e.description,
      e.category,
      e.amount,
      e.vat_amount ?? 0,
      e.vat_reclaimable === false ? 'No' : 'Yes',
      e.currency,
      e.notes ?? '',
    ].map(escape).join(',')),
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
