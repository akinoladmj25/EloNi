const DOT: Record<string, string> = {
  draft:     'bg-zinc-400',
  sent:      'bg-blue-500',
  paid:      'bg-emerald-500',
  overdue:   'bg-red-500',
  cancelled: 'bg-zinc-300',
  accepted:  'bg-emerald-500',
  declined:  'bg-red-500',
  expired:   'bg-zinc-300',
}

const LABEL: Record<string, string> = {
  draft:     'text-zinc-600',
  sent:      'text-blue-700',
  paid:      'text-emerald-700',
  overdue:   'text-red-700',
  cancelled: 'text-zinc-500',
  accepted:  'text-emerald-700',
  declined:  'text-red-700',
  expired:   'text-zinc-500',
}

const BG: Record<string, string> = {
  draft:     'bg-zinc-100',
  sent:      'bg-blue-50',
  paid:      'bg-emerald-50',
  overdue:   'bg-red-50',
  cancelled: 'bg-zinc-100',
  accepted:  'bg-emerald-50',
  declined:  'bg-red-50',
  expired:   'bg-zinc-100',
}

export default function StatusBadge({ status }: { status: string }) {
  const dot   = DOT[status]   ?? DOT.draft
  const label = LABEL[status] ?? LABEL.draft
  const bg    = BG[status]    ?? BG.draft

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${label} ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {status}
    </span>
  )
}
