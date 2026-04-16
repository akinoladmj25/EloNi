import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { invoiceId } = await req.json()
    if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured. Add RESEND_API_KEY to your environment.' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
    if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('id', invoiceId)
      .eq('org_id', org.id)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (!invoice.client?.email) {
      return NextResponse.json({ error: 'Client has no email address. Add one in Clients.' }, { status: 400 })
    }

    await sendInvoiceEmail({
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxRate: invoice.tax_rate,
      taxAmount: invoice.tax_amount,
      taxName: org.tax_name,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms,
      items: invoice.items ?? [],
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
        address: invoice.client.address,
        city: invoice.client.city,
        postcode: invoice.client.postcode,
        country: invoice.client.country,
      },
    })

    await supabase.from('invoices').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', invoiceId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-invoice error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
