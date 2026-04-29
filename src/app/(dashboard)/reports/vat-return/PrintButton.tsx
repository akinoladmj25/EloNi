'use client'

import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Print return' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-medium print:hidden"
    >
      <Printer size={14} /> {label}
    </button>
  )
}
