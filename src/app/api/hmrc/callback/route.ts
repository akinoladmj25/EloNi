import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForToken } from '@/lib/hmrc/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?hmrc_error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/settings?hmrc_error=no_code`)
  }

  // Verify state matches the cookie we set in /api/hmrc/auth
  const stateCookie = req.headers.get('cookie')?.match(/hmrc_oauth_state=([^;]+)/)?.[1]
  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${baseUrl}/settings?hmrc_error=state_mismatch`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${baseUrl}/login`)

  const { data: org } = await supabase
    .from('organisations').select('id, vat_number').eq('user_id', user.id).single()
  if (!org) return NextResponse.redirect(`${baseUrl}/onboarding`)
  if (!org.vat_number) {
    return NextResponse.redirect(`${baseUrl}/settings?hmrc_error=no_vat_number`)
  }

  let token
  try {
    token = await exchangeCodeForToken(code)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token_exchange_failed'
    return NextResponse.redirect(`${baseUrl}/settings?hmrc_error=${encodeURIComponent(msg)}`)
  }

  const expires = new Date(Date.now() + token.expires_in * 1000).toISOString()

  // Upsert connection
  const { error: dbError } = await supabase
    .from('hmrc_connections')
    .upsert({
      org_id: org.id,
      vat_number: org.vat_number,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: expires,
      scope: token.scope,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' })

  if (dbError) {
    return NextResponse.redirect(`${baseUrl}/settings?hmrc_error=${encodeURIComponent(dbError.message)}`)
  }

  const res = NextResponse.redirect(`${baseUrl}/settings?hmrc_connected=1`)
  res.cookies.delete('hmrc_oauth_state')
  return res
}
