'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileCheck, CreditCard, Loader2, AlertCircle } from 'lucide-react'
import HmrcSubmitButton from './HmrcSubmitButton'

interface Props {
  periodFrom: string
  periodTo: string
  boxes: { box1: number; box2: number; box3: number; box4: number; box5: number; box6: number; box7: number; box8: number; box9: number }
  existing: {
    id: string
    status: 'draft' | 'submitted' | 'paid'
    submitted_at: string | null
    paid_at: string | null
  } | null
  hmrcConnected?: boolean
  hasOpenObligation?: boolean
}

export default function SaveActions({ periodFrom, periodTo, boxes, existing, hmrcConnected, hasOpenObligation }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async (action: 'save_draft' | 'mark_filed' | 'mark_paid') => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/vat-returns/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_from: periodFrom, period_to: periodTo, ...boxes, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setBusy(false)
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  const status = existing?.status

  return (
    <div className="bg-white rounded-xl p-5 mb-6 print:hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Submission status</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {status === 'paid'      && `Paid${existing?.paid_at ? ` on ${new Date(existing.paid_at).toLocaleDateString()}` : ''}`}
            {status === 'submitted' && `Filed${existing?.submitted_at ? ` on ${new Date(existing.submitted_at).toLocaleDateString()}` : ''}, awaiting payment`}
            {status === 'draft'     && 'Saved as draft — not yet filed'}
            {!status                && 'Not saved yet'}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {/* HMRC submission takes precedence if connected & period is an open obligation */}
        {hmrcConnected && hasOpenObligation && status !== 'submitted' && status !== 'paid' && (
          <HmrcSubmitButton periodFrom={periodFrom} periodTo={periodTo} boxes={boxes} />
        )}

        {!status && (
          <ActionBtn onClick={() => send('save_draft')} busy={busy} icon={FileCheck} label="Save as draft" />
        )}
        {(!status || status === 'draft') && !hasOpenObligation && (
          <ActionBtn onClick={() => send('mark_filed')} busy={busy} icon={CheckCircle2} label="Mark as filed (manual)" primary />
        )}
        {(!status || status === 'draft') && hasOpenObligation && hmrcConnected && (
          <ActionBtn onClick={() => send('mark_filed')} busy={busy} icon={CheckCircle2} label="Mark as filed manually" />
        )}
        {status === 'submitted' && (
          <ActionBtn onClick={() => send('mark_paid')} busy={busy} icon={CreditCard} label="Mark as paid" primary />
        )}
        {status === 'paid' && (
          <p className="text-xs text-zinc-400 italic">No further action needed for this period.</p>
        )}
      </div>

      {hmrcConnected && !hasOpenObligation && status !== 'submitted' && status !== 'paid' && (
        <p className="text-[11px] text-zinc-400 mt-3">
          HMRC has no open obligation for this period. To submit via MTD, pick one of the open obligations above.
        </p>
      )}

      {pending && <p className="text-[11px] text-zinc-400 mt-2">Refreshing…</p>}
    </div>
  )
}

function ActionBtn({ onClick, busy, icon: Icon, label, primary }: {
  onClick: () => void; busy: boolean; icon: any; label: string; primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
        primary
          ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
          : 'border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
      }`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  )
}

function StatusBadge({ status }: { status?: 'draft' | 'submitted' | 'paid' }) {
  if (!status) return <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-500">Not saved</span>
  if (status === 'draft')     return <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-700">Draft</span>
  if (status === 'submitted') return <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">Filed</span>
  if (status === 'paid')      return <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">Paid</span>
  return null
}
