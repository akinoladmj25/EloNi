const CONFIG: Record<string, { dot: string; label: string; bg: string; pulse?: boolean }> = {
  draft:     { dot: 'bg-zinc-400',    label: 'text-zinc-600',   bg: 'bg-zinc-100' },
  sent:      { dot: 'bg-blue-500',    label: 'text-blue-700',   bg: 'bg-blue-50' },
  paid:      { dot: 'bg-emerald-500', label: 'text-emerald-700', bg: 'bg-emerald-50' },
  overdue:   { dot: 'bg-red-500',     label: 'text-red-700',    bg: 'bg-red-50', pulse: true },
  cancelled: { dot: 'bg-zinc-300',    label: 'text-zinc-500',   bg: 'bg-zinc-100' },
  accepted:  { dot: 'bg-emerald-500', label: 'text-emerald-700', bg: 'bg-emerald-50' },
  declined:  { dot: 'bg-red-500',     label: 'text-red-700',    bg: 'bg-red-50' },
  expired:   { dot: 'bg-zinc-300',    label: 'text-zinc-500',   bg: 'bg-zinc-100' },
  active:    { dot: 'bg-emerald-500', label: 'text-emerald-700', bg: 'bg-emerald-50' },
  paused:    { dot: 'bg-amber-400',   label: 'text-amber-700',  bg: 'bg-amber-50' },
}

export default function StatusBadge({ status }: { status: string }) {
  const c = CONFIG[status] ?? CONFIG.draft

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${c.label} ${c.bg}`}>
      <span className={`relative w-1.5 h-1.5 rounded-full shrink-0 ${c.dot} flex items-center justify-center`}>
        {c.pulse && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-75 animate-ping`} />
        )}
      </span>
      {status}
    </span>
  )
}
