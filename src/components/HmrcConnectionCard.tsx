'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, Link2, Unlink, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  connection: {
    vat_number: string
    connected_at: string
    token_expires_at: string
    last_used_at: string | null
  } | null
  hmrcConfigured: boolean
  hasVatNumber: boolean
}

export default function HmrcConnectionCard({ connection, hmrcConfigured, hasVatNumber }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  const error     = params.get('hmrc_error')
  const connected = params.get('hmrc_connected') === '1'

  const disconnect = async () => {
    if (!confirm('Disconnect from HMRC? You will need to re-authorise to file VAT returns via MTD.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/hmrc/disconnect', { method: 'POST' })
      if (res.ok) startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-sm font-semibold text-zinc-900">HMRC — Making Tax Digital</h2>
        {connection && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={11} /> Connected
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-400 mb-5">Submit VAT returns directly to HMRC under Making Tax Digital.</p>

      {/* Banners */}
      {connected && (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-md">
          <CheckCircle2 size={13} />
          Successfully connected to HMRC.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-2.5 rounded-md">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">HMRC connection failed</p>
            <p className="mt-0.5 break-all">{error}</p>
          </div>
        </div>
      )}

      {!hmrcConfigured && (
        <div className="rounded-lg border border-zinc-200 p-4 bg-zinc-50/50">
          <p className="text-sm font-medium text-zinc-900 mb-1">Set up HMRC credentials</p>
          <p className="text-xs text-zinc-600 leading-relaxed mb-3">
            Sign up at the HMRC Developer Hub, create a new application, and add the client ID, secret and redirect URL to your environment:
          </p>
          <ul className="text-[11px] text-zinc-500 space-y-0.5 ml-4 list-disc mb-3">
            <li><code className="bg-zinc-100 px-1 rounded">HMRC_CLIENT_ID</code></li>
            <li><code className="bg-zinc-100 px-1 rounded">HMRC_CLIENT_SECRET</code></li>
            <li><code className="bg-zinc-100 px-1 rounded">HMRC_REDIRECT_URI</code> &mdash; e.g. <code className="bg-zinc-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/hmrc/callback</code></li>
            <li><code className="bg-zinc-100 px-1 rounded">HMRC_BASE_URL</code> &mdash; sandbox or production URL</li>
          </ul>
          <a href="https://developer.service.hmrc.gov.uk/developer/applications" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-600">
            Open HMRC Developer Hub →
          </a>
        </div>
      )}

      {hmrcConfigured && !hasVatNumber && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">Add your VAT number above before connecting to HMRC.</p>
        </div>
      )}

      {hmrcConfigured && hasVatNumber && !connection && (
        <div className="flex items-start gap-3">
          <Building2 size={28} className="text-zinc-400 shrink-0 mt-1" />
          <div className="flex-1">
            <p className="text-sm text-zinc-700 mb-3">Connect your HMRC account to enable direct submission of VAT returns under MTD.</p>
            <a href="/api/hmrc/auth"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors">
              <Link2 size={13} /> Connect to HMRC
            </a>
          </div>
        </div>
      )}

      {connection && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <Field label="VAT number" value={connection.vat_number} />
            <Field label="Connected" value={new Date(connection.connected_at).toLocaleDateString()} />
            <Field label="Token expires" value={new Date(connection.token_expires_at).toLocaleString()} />
          </div>
          <button
            onClick={disconnect}
            disabled={busy || pending}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 rounded-lg px-3 py-2.5">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-zinc-900 mt-0.5 truncate">{value}</p>
    </div>
  )
}
