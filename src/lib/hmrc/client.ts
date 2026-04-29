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
 * Fraud-prevention headers for WEB_APP_VIA_SERVER connection method.
 * HMRC sandbox is lenient; production requires full client fingerprint.
 * See: https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
 */
export function fraudPreventionHeaders(opts: {
  clientIp?: string
  vendorIp?: string
  userId: string
  timezone?: string
  userAgent?: string
}): Record<string, string> {
  const ip = opts.clientIp ?? '127.0.0.1'
  const vIp = opts.vendorIp ?? '127.0.0.1'
  return {
    'Gov-Client-Connection-Method':   'WEB_APP_VIA_SERVER',
    'Gov-Client-Public-IP':           ip,
    'Gov-Client-Public-IP-Timestamp': new Date().toISOString(),
    'Gov-Client-Public-Port':         '443',
    'Gov-Client-Device-ID':           opts.userId,
    'Gov-Client-User-IDs':            `eloni=${encodeURIComponent(opts.userId)}`,
    'Gov-Client-Timezone':            opts.timezone ?? 'UTC+00:00',
    'Gov-Client-Multi-Factor':        '',
    'Gov-Vendor-Version':             'eloni=1.0.0',
    'Gov-Vendor-Product-Name':        'EloNi',
    'Gov-Vendor-License-IDs':         `eloni=${opts.userId}`,
    'Gov-Vendor-Public-IP':           vIp,
    'Gov-Vendor-Forwarded':           `by=${vIp}&for=${ip}`,
  }
}

// ── VAT API endpoints ───────────────────────────────────────────────────

export interface VatObligation {
  start: string
  end:   string
  due:   string
  status: 'O' | 'F'
  periodKey: string
  received?: string
}

export async function getVatObligations(opts: {
  vrn: string
  accessToken: string
  status?: 'O' | 'F'
  fromDate?: string
  toDate?:   string
  fraudHeaders: Record<string, string>
}): Promise<{ obligations: VatObligation[] }> {
  const cfg = hmrcConfig()
  const params = new URLSearchParams()
  if (opts.fromDate) params.set('from', opts.fromDate)
  if (opts.toDate)   params.set('to',   opts.toDate)
  if (opts.status)   params.set('status', opts.status)
  const qs = params.toString()
  const url = `${cfg.baseUrl}/organisations/vat/${opts.vrn}/obligations${qs ? '?' + qs : ''}`

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${opts.accessToken}`,
      'Accept':        'application/vnd.hmrc.1.0+json',
      ...opts.fraudHeaders,
    },
  })
  if (res.status === 404) return { obligations: [] }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HMRC obligations failed: ${res.status} ${text}`)
  }
  return res.json()
}

export interface VatSubmissionResult {
  processingDate:     string
  formBundleNumber:   string
  paymentIndicator?:  string
  chargeRefNumber?:   string
}

export async function submitVatReturn(opts: {
  vrn: string
  accessToken: string
  periodKey: string
  boxes: { box1: number; box2: number; box3: number; box4: number; box5: number; box6: number; box7: number; box8: number; box9: number }
  finalised: boolean
  fraudHeaders: Record<string, string>
}): Promise<VatSubmissionResult> {
  const cfg = hmrcConfig()
  const url = `${cfg.baseUrl}/organisations/vat/${opts.vrn}/returns`

  const round2 = (n: number) => Math.round(n * 100) / 100
  const roundInt = (n: number) => Math.round(n)

  const body = {
    periodKey:                      opts.periodKey,
    vatDueSales:                    round2(opts.boxes.box1),
    vatDueAcquisitions:             round2(opts.boxes.box2),
    totalVatDue:                    round2(opts.boxes.box3),
    vatReclaimedCurrPeriod:         round2(opts.boxes.box4),
    netVatDue:                      round2(Math.abs(opts.boxes.box5)),
    totalValueSalesExVAT:           roundInt(opts.boxes.box6),
    totalValuePurchasesExVAT:       roundInt(opts.boxes.box7),
    totalValueGoodsSuppliedExVAT:   roundInt(opts.boxes.box8),
    totalAcquisitionsExVAT:         roundInt(opts.boxes.box9),
    finalised:                      opts.finalised,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.accessToken}`,
      'Accept':        'application/vnd.hmrc.1.0+json',
      'Content-Type':  'application/json',
      ...opts.fraudHeaders,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HMRC submit failed: ${res.status} ${text}`)
  }
  return res.json()
}
