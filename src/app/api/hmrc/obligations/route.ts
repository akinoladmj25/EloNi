import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken, getClientIp } from '@/lib/hmrc/server'
import { getVatObligations, fraudPreventionHeaders } from '@/lib/hmrc/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') as 'O' | 'F' | null
  const from   = url.searchParams.get('from') ?? undefined
  const to     = url.searchParams.get('to')   ?? undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const token = await ensureValidToken(supabase, org.id)
  if (!token) return NextResponse.json({ error: 'Not connected to HMRC. Reconnect from settings.' }, { status: 400 })

  try {
    const headers = fraudPreventionHeaders({
      clientIp: getClientIp(req),
      userId: user.id,
      timezone: req.headers.get('x-timezone') ?? 'UTC+00:00',
    })
    const result = await getVatObligations({
      vrn: token.vatNumber,
      accessToken: token.accessToken,
      status: status ?? 'O',
      fromDate: from,
      toDate: to,
      fraudHeaders: headers,
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
