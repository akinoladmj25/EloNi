import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured. Add ANTHROPIC_API_KEY to your environment variables.' }, { status: 503 })
  }

  const { question, history } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  // Gather user data for context
  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

  const cur = org.default_currency

  const [{ data: invoices }, { data: clients }, { data: expenses }, { data: recurring }] = await Promise.all([
    supabase.from('invoices').select('invoice_number, status, total, currency, due_date, paid_at, client:clients(name)').eq('org_id', org.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('clients').select('name, company, email').eq('org_id', org.id),
    supabase.from('expenses').select('description, category, amount, currency, date').eq('org_id', org.id).order('date', { ascending: false }).limit(100),
    supabase.from('recurring_invoices').select('title, frequency, next_date, total, currency, active').eq('org_id', org.id),
  ])

  const inv = (invoices ?? [])
  const paid = inv.filter((i: any) => i.status === 'paid' && i.currency === cur)
  const outstanding = inv.filter((i: any) => i.status === 'sent' && i.currency === cur)
  const overdue = inv.filter((i: any) => i.status === 'overdue' && i.currency === cur)
  const exp = (expenses ?? []).filter((e: any) => e.currency === cur)

  const totalPaid = paid.reduce((s: number, i: any) => s + i.total, 0)
  const totalOut = outstanding.reduce((s: number, i: any) => s + i.total, 0)
  const totalOvd = overdue.reduce((s: number, i: any) => s + i.total, 0)
  const totalExp = exp.reduce((s: number, e: any) => s + e.amount, 0)

  // Top clients by revenue
  const clientRevenue: Record<string, number> = {}
  paid.forEach((i: any) => {
    const name = i.client?.name ?? 'Unknown'
    clientRevenue[name] = (clientRevenue[name] ?? 0) + i.total
  })
  const topClients = Object.entries(clientRevenue)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => `${name}: ${formatMoney(amount, cur)}`)

  const context = `You are EloNi's financial assistant. The user runs a business called "${org.name}".

FINANCIAL SUMMARY (${cur} only):
- Total collected: ${formatMoney(totalPaid, cur)} from ${paid.length} paid invoices
- Outstanding: ${formatMoney(totalOut, cur)} across ${outstanding.length} invoices
- Overdue: ${formatMoney(totalOvd, cur)} across ${overdue.length} invoices
- Total expenses: ${formatMoney(totalExp, cur)}
- Net profit: ${formatMoney(totalPaid - totalExp, cur)}

TOP CLIENTS BY REVENUE:
${topClients.length ? topClients.join('\n') : 'No paid invoices yet'}

CLIENTS (${(clients ?? []).length} total): ${(clients ?? []).map((c: any) => c.name + (c.company ? ` (${c.company})` : '')).join(', ')}

OVERDUE INVOICES:
${overdue.slice(0, 10).map((i: any) => `${i.invoice_number} — ${i.client?.name ?? 'No client'} — ${formatMoney(i.total, cur)} — due ${i.due_date ?? 'unknown'}`).join('\n') || 'None'}

OUTSTANDING INVOICES:
${outstanding.slice(0, 10).map((i: any) => `${i.invoice_number} — ${i.client?.name ?? 'No client'} — ${formatMoney(i.total, cur)} — due ${i.due_date ?? 'unknown'}`).join('\n') || 'None'}

RECENT EXPENSES:
${exp.slice(0, 10).map((e: any) => `${e.date} ${e.category}: ${e.description} — ${formatMoney(e.amount, cur)}`).join('\n') || 'None'}

RECURRING INVOICES:
${(recurring ?? []).map((r: any) => `${r.title} — ${r.frequency} — next: ${r.next_date} — ${formatMoney(r.total, cur)} — ${r.active ? 'active' : 'paused'}`).join('\n') || 'None'}

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

Answer questions concisely and accurately. If asked about specific data not shown, say you can see the summary. Provide actionable insights. Use ${cur} amounts.`

  const messages: any[] = [
    ...(history ?? []),
    { role: 'user', content: question },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: context,
    messages,
  })

  const answer = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ answer })
}
