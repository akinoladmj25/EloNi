'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  periodFrom: string
  periodTo: string
  boxes: { box1: number; box2: number; box3: number; box4: number; box5: number; box6: number; box7: number; box8: number; box9: number }
}

export default function HmrcSubmitButton({ periodFrom, periodTo, boxes }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ formBundleNumber: string; chargeRefNumber?: string } | null>(null)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/hmrc/submit-vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_from: periodFrom, period_to: periodTo, boxes, finalised: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Submission failed')
        setBusy(false)
        return
      }
      setSuccess({ formBundleNumber: data.formBundleNumber, chargeRefNumber: data.chargeRefNumber })
      setShowConfirm(false)
      startTransition(() => router.refresh())
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 print:hidden">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">VAT return submitted to HMRC</p>
            <p className="text-xs text-emerald-800 mt-1">Form bundle: <code className="bg-white px-1 rounded font-mono">{success.formBundleNumber}</code></p>
            {success.chargeRefNumber && (
              <p className="text-xs text-emerald-800 mt-0.5">Charge reference: <code className="bg-white px-1 rounded font-mono">{success.chargeRefNumber}</code></p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        <Send size={13} /> Submit to HMRC
      </button>

      {error && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-2.5 rounded-md print:hidden">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Submission failed</p>
            <p className="mt-0.5 break-all">{error}</p>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900 mb-2">Confirm VAT submission</h2>
            <p className="text-sm text-zinc-600 mb-4">You are about to submit this VAT return to HMRC under Making Tax Digital.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>This is final.</strong> By submitting, you confirm that the information given on this return is true and complete. False submissions can lead to penalties.
              </p>
            </div>
            <ul className="text-xs text-zinc-600 space-y-1 mb-5">
              <li>Box 1 — VAT due on sales: <strong className="text-zinc-900">{boxes.box1.toFixed(2)}</strong></li>
              <li>Box 4 — VAT reclaimed: <strong className="text-zinc-900">{boxes.box4.toFixed(2)}</strong></li>
              <li>Box 5 — Net VAT: <strong className="text-zinc-900">{Math.abs(boxes.box5).toFixed(2)}</strong> {boxes.box5 >= 0 ? 'to pay' : 'to reclaim'}</li>
              <li>Period: <strong className="text-zinc-900">{periodFrom} – {periodTo}</strong></li>
            </ul>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} disabled={busy}
                className="h-9 px-4 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submit} disabled={busy}
                className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {busy ? 'Submitting…' : 'Confirm & submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && <p className="text-[11px] text-zinc-400 mt-2 print:hidden">Refreshing…</p>}
    </>
  )
}
