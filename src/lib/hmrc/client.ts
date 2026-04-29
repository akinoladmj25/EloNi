/**
 * HMRC MTD API client.
 *
 * Setup required (env):
 *   HMRC_CLIENT_ID         — OAuth client ID from developer.service.hmrc.gov.uk
 *   HMRC_CLIENT_SECRET     — OAuth client secret
 *   HMRC_BASE_URL          — https://test-api.service.hmrc.gov.uk (sandbox) or https://api.service.hmrc.gov.uk (prod)
 *   HMRC_REDIRECT_URI      — e.g. http://localhost:3000/api/hmrc/callback
 *
 * Sign up: https://developer.service.hmrc.gov.uk/developer/applications
 */

export const HMRC_SANDBOX_URL    = 'https://test-api.service.hmrc.gov.uk'
export const HMRC_PRODUCTION_URL = 'https://api.service.hmrc.gov.uk'

export const HMRC_SCOPES = [
  'read:vat',
  'write:vat',
].join(' ')

export function hmrcConfig() {
  const clientId     = process.env.HMRC_CLIENT_ID
  const clientSecret = process.env.HMRC_CLIENT_SECRET
  const baseUrl      = process.env.HMRC_BASE_URL ?? HMRC_SANDBOX_URL
  const redirectUri  = process.env.HMRC_REDIRECT_URI

  return { clientId, clientSecret, baseUrl, redirectUri, isConfigured: !!(clientId && clientSecret && redirectUri) }
}

export function buildAuthorizeUrl(state: string): string | null {
  const cfg = hmrcConfig()
  if (!cfg.isConfigured) return null
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     cfg.clientId!,
    redirect_uri:  cfg.redirectUri!,
    scope:         HMRC_SCOPES,
    state,
  })
  return `${cfg.baseUrl}/oauth/authorize?${params.toString()}`
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  scope: string
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const cfg = hmrcConfig()
  if (!cfg.isConfigured) throw new Error('HMRC not configured')

  const res = await fetch(`${cfg.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     cfg.clientId!,
      client_secret: cfg.clientSecret!,
      redirect_uri:  cfg.redirectUri!,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HMRC token exchange failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const cfg = hmrcConfig()
  if (!cfg.isConfigured) throw new Error('HMRC not configured')

  const res = await fetch(`${cfg.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     cfg.clientId!,
      client_secret: cfg.clientSecret!,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HMRC token refresh failed: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Minimum fraud-prevention headers for server-originated MTD requests.
 * The full HMRC spec requires more (browser fingerprint, screen size, etc.)
 * gathered client-side. For a server-only submission with manual VAT entry,
 * SERVER vendor headers + a few CLIENT proxy headers cover the basic case.
 *
 * For full compliance see:
 * https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
 */
export function fraudPreventionHeaders(opts: {
  clientIp?: string
  vendorIp?: string
  userId: string
  timezone?: string
}): Record<string, string> {
  return {
    'Gov-Client-Connection-Method':  'WEB_APP_VIA_SERVER',
    'Gov-Client-Public-IP':          opts.clientIp ?? '0.0.0.0',
    'Gov-Client-Timezone':           opts.timezone ?? 'UTC+00:00',
    'Gov-Client-User-IDs':           `eloni=${encodeURIComponent(opts.userId)}`,
    'Gov-Vendor-Version':            'eloni=1.0.0',
    'Gov-Vendor-Product-Name':       'EloNi',
    'Gov-Vendor-Public-IP':          opts.vendorIp ?? '0.0.0.0',
    'Gov-Vendor-Forwarded':          `by=${opts.vendorIp ?? '0.0.0.0'}&for=${opts.clientIp ?? '0.0.0.0'}`,
  }
}
