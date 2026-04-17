import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendThankYouEmail } from '@/lib/email'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
    return NextResponse.json({ error: 'Email not configured. Add RESEND_API_KEY to your environment.' }, { status: 503 })
  }

  const { invoiceId } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const { data: org } = await supabase
    .from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('id', invoiceId)
    .eq('org_id', org.id)
    .eq('status', 'paid')
    .single() as { data: any }

  if (!invoice) return NextResponse.json({ error: 'Paid invoice not found' }, { status: 404 })
  if (!invoice.client?.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const receiptUrl = `${origin}/receipt/${invoice.id}/print`

  try {
    await sendThankYouEmail({
      invoiceNumber: invoice.invoice_number,
      paidAt: invoice.paid_at,
      currency: invoice.currency,
      total: invoice.total,
      org: {
        name: org.name,
        email: org.email,
        phone: org.phone,
        address: org.address,
        city: org.city,
        postcode: org.postcode,
        country: org.country,
      },
      client: {
        name: invoice.client.name,
        email: invoice.client.email,
        company: invoice.client.company,
      },
      receiptUrl,
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to send email' }, { status: 500 })
  }
}
