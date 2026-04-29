import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken, getClientIp } from '@/lib/hmrc/server'
import { getVatObligations, submitVatReturn, fraudPreventionHeaders } from '@/lib/hmrc/client'

export const dynamic = 'force-dynamic'

interface Body {
  period_from: string
  period_to:   string
  boxes: { box1: number; box2: number; box3: number; box4: number; box5: number; box6: number; box7: number; box8: number; box9: number }
  finalised: boolean   // user must confirm true
}

export async function POST(req: Request) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  if (!body.period_from || !body.period_to || !body.boxes) return NextResponse.json({ error: 'Period and boxes required' }, { status: 400 })
  if (body.finalised !== true)  return NextResponse.json({ error: 'You must confirm the return is final and accurate' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const token = await ensureValidToken(supabase, org.id)
  if (!token) return NextResponse.json({ error: 'Not connected to HMRC. Reconnect from settings.' }, { status: 400 })

  const headers = fraudPreventionHeaders({
    clientIp: getClientIp(req),
    userId: user.id,
    timezone: req.headers.get('x-timezone') ?? 'UTC+00:00',
  })

  try {
    // 1) Find matching obligation periodKey from HMRC
    const obligations = await getVatObligations({
      vrn: token.vatNumber,
      accessToken: token.accessToken,
      status: 'O',
      fraudHeaders: headers,
    })
    const match = obligations.obligations.find(o => o.start === body.period_from && o.end === body.period_to)
    if (!match) {
      return NextResponse.json({
        error: `No matching open VAT obligation for ${body.period_from} – ${body.period_to}. HMRC may not expect a return for this period (or it's already filed).`,
        availableObligations: obligations.obligations,
      }, { status: 400 })
    }

    // 2) Submit
    const result = await submitVatReturn({
      vrn:         token.vatNumber,
      accessToken: token.accessToken,
      periodKey:   match.periodKey,
      boxes:       body.boxes,
      finalised:   true,
      fraudHeaders: headers,
    })

    // 3) Persist
    const now = new Date().toISOString()
    const { data: existing } = await supabase
      .from('vat_returns')
      .select('id')
      .eq('org_id', org.id)
      .eq('period_from', body.period_from)
      .eq('period_to',   body.period_to)
      .maybeSingle()

    const record = {
      org_id: org.id,
      period_from: body.period_from,
      period_to:   body.period_to,
      ...body.boxes,
      status: 'submitted' as const,
      submission_method: 'hmrc_mtd' as const,
      hmrc_processing_date:    result.processingDate,
      hmrc_form_bundle_number: result.formBundleNumber,
      hmrc_charge_ref_number:  result.chargeRefNumber  ?? null,
      hmrc_payment_indicator:  result.paymentIndicator ?? null,
      submitted_at: now,
      updated_at:   now,
    }

    if (existing) {
      await supabase.from('vat_returns').update(record).eq('id', existing.id)
    } else {
      await supabase.from('vat_returns').insert(record)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Submission failed' }, { status: 500 })
  }
}
