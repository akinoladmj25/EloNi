'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import {
  LayoutDashboard, FileText, FileCheck2, Receipt, Users2,
  Wallet, RefreshCw, BarChart2, Settings, LogOut, Menu, X,
} from 'lucide-react'

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices',  label: 'Invoices',  icon: FileText },
  { href: '/quotes',    label: 'Quotes',    icon: FileCheck2 },
  { href: '/receipts',  label: 'Receipts',  icon: Receipt },
  { href: '/clients',   label: 'Clients',   icon: Users2 },
  { href: '/expenses',  label: 'Expenses',  icon: Wallet },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/reports',   label: 'Reports',   icon: BarChart2 },
]

export default function MobileNav({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const active = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <>
      {/* Top bar — mobile only */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <span className="text-[#0d0d0d] text-[10px] font-black tracking-tighter">ELN</span>
          </div>
          <span className="text-white font-bold text-[14px] tracking-tight">EloNi</span>
        </Link>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.07] transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 z-40 border-b border-white/[0.06] px-2.5 py-3 shadow-2xl">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2.5 mb-2">Menu</p>
            <div className="space-y-px mb-3">
              {mainNav.map(({ href, label, icon: Icon }) => {
                const isActive = active(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 h-[34px] px-2 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-white/[0.10] text-white'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                    {label}
                  </Link>
                )
              })}
            </div>
            <div className="border-t border-white/[0.05] pt-3 space-y-px">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2.5 mb-2">Account</p>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 h-[34px] px-2 rounded-lg text-[13px] font-medium transition-all ${
                  active('/settings')
                    ? 'bg-white/[0.10] text-white'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                }`}
              >
                <Settings size={15} />
                Settings
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center gap-2.5 h-[34px] px-2 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-red-400 hover:bg-white/[0.04] w-full transition-all"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </form>
              <div className="flex items-center gap-2 px-2.5 pt-3 mt-2 border-t border-white/[0.05]">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-zinc-300">
                    {userEmail ? userEmail.split('@')[0].slice(0, 2).toUpperCase() : 'U'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
