import type { SupabaseClient } from '@supabase/supabase-js'
import { refreshAccessToken } from './client'

/**
 * Get a valid access token for the org, refreshing if expired.
 * Returns null if not connected or refresh fails (caller should require reconnect).
 */
export async function ensureValidToken(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ accessToken: string; vatNumber: string } | null> {
  const { data: conn } = await supabase
    .from('hmrc_connections')
    .select('access_token, refresh_token, token_expires_at, vat_number')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!conn) return null

  const expiresAt = new Date(conn.token_expires_at).getTime()
  const buffer = 60_000 // refresh if less than 1 minute remaining

  if (expiresAt - Date.now() > buffer) {
    await supabase
      .from('hmrc_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('org_id', orgId)
    return { accessToken: conn.access_token, vatNumber: conn.vat_number }
  }

  // Refresh
  try {
    const fresh = await refreshAccessToken(conn.refresh_token)
    const newExpires = new Date(Date.now() + fresh.expires_in * 1000).toISOString()
    await supabase
      .from('hmrc_connections')
      .update({
        access_token:     fresh.access_token,
        refresh_token:    fresh.refresh_token,
        token_expires_at: newExpires,
        last_used_at:     new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('org_id', orgId)
    return { accessToken: fresh.access_token, vatNumber: conn.vat_number }
  } catch (e) {
    console.error('HMRC token refresh failed:', e)
    return null
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xr = req.headers.get('x-real-ip')
  if (xr) return xr.trim()
  return '127.0.0.1'
}
