import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { quoteId } = await req.json()
    if (!quoteId) return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 })

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured. Add RESEND_API_KEY to your environment.' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
    if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

    const { data: quote } = await supabase
      .from('quotes')
      .select('*, client:clients(*), items:quote_items(*)')
      .eq('id', quoteId)
      .eq('org_id', org.id)
      .single()

    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    if (!quote.client?.email) {
      return NextResponse.json({ error: 'Client has no email address. Add one in Clients.' }, { status: 400 })
    }

    await sendQuoteEmail({
      quoteNumber: quote.quote_number,
      issueDate: quote.issue_date,
      expiryDate: quote.expiry_date,
      currency: quote.currency,
      subtotal: quote.subtotal,
      discount: quote.discount,
      taxRate: quote.tax_rate,
      taxAmount: quote.tax_amount,
      taxName: org.tax_name,
      total: quote.total,
      notes: quote.notes,
      terms: quote.terms,
      items: quote.items ?? [],
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
        name: quote.client.name,
        email: quote.client.email,
        company: quote.client.company,
        address: quote.client.address,
        city: quote.client.city,
        postcode: quote.client.postcode,
        country: quote.client.country,
      },
    })

    await supabase.from('quotes').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', quoteId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-quote error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
