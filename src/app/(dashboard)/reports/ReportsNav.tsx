'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Receipt, FileText, CalendarCheck, Scale, ListTree } from 'lucide-react'

const TABS = [
  { href: '/reports',                  label: 'Profit & Loss',     icon: BarChart2 },
  { href: '/reports/balance-sheet',    label: 'Balance Sheet',     icon: Scale },
  { href: '/reports/trial-balance',    label: 'Trial Balance',     icon: ListTree },
  { href: '/reports/vat-return',       label: 'VAT Return',        icon: Receipt },
  { href: '/reports/self-assessment',  label: 'Self-Assessment',   icon: FileText },
  { href: '/reports/year-end',         label: 'Year End',          icon: CalendarCheck },
]

export default function ReportsNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/reports' ? pathname === '/reports' : pathname.startsWith(href)

  return (
    <div className="border-b border-zinc-200 mb-6 -mx-4 md:-mx-8 px-4 md:px-8">
      <nav className="flex gap-1 overflow-x-auto">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 h-10 px-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
