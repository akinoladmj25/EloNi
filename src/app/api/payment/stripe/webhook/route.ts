import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  // Find the org by matching secret key (we need to verify the event)
  // Since we use per-org keys, we need to find which org's key to use
  // We'll verify the metadata and trust it (no webhook secret per org setup)
  // Production: store stripe_webhook_secret per org and verify signature

  let event: Stripe.Event

  try {
    // Try to parse the event — for now without signature verification
    // (full sig verification requires storing webhook secret per org)
    event = JSON.parse(body) as Stripe.Event
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const invoiceId = session.metadata?.invoice_id
  if (!invoiceId) return NextResponse.json({ received: true })

  const supabase = await createClient()

  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      payment_reference: session.payment_intent as string ?? session.id,
    })
    .eq('id', invoiceId)
    .neq('status', 'paid')

  return NextResponse.json({ received: true })
}
