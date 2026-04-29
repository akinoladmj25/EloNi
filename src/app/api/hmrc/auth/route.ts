import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl, hmrcConfig } from '@/lib/hmrc/client'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cfg = hmrcConfig()
  if (!cfg.isConfigured) {
    return NextResponse.json({
      error: 'HMRC integration is not configured. Set HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, and HMRC_REDIRECT_URI in environment.',
      setup: 'https://developer.service.hmrc.gov.uk/developer/applications',
    }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))

  const state = randomUUID()
  const authUrl = buildAuthorizeUrl(state)
  if (!authUrl) return NextResponse.json({ error: 'Could not build auth URL' }, { status: 500 })

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('hmrc_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
