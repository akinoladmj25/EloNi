'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  Receipt,
  Users2,
  Wallet,
  RefreshCw,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react'

const mainNav = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/invoices',  label: 'Invoices',   icon: FileText },
  { href: '/quotes',    label: 'Quotes',     icon: FileCheck2 },
  { href: '/receipts',  label: 'Receipts',   icon: Receipt },
  { href: '/clients',   label: 'Clients',    icon: Users2 },
  { href: '/expenses',  label: 'Expenses',   icon: Wallet },
  { href: '/recurring', label: 'Recurring',  icon: RefreshCw },
  { href: '/reports',   label: 'Reports',    icon: BarChart2 },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  const active = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : 'U'

  return (
    <aside className="w-[220px] min-h-screen shrink-0 flex flex-col" style={{ background: '#111111' }}>
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[#111111] text-[10px] font-black tracking-tighter">ELN</span>
          </div>
          <span className="text-white font-bold text-[14px] tracking-tight">EloNi</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-2.5">Menu</p>
        <div className="space-y-0.5">
          {mainNav.map(({ href, label, icon: Icon }) => {
            const isActive = active(href)
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex items-center gap-2.5 h-[34px] px-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
                  isActive
                    ? 'bg-white/[0.10] text-white'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] bg-white rounded-full" />
                )}
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'}
                />
                <span className="flex-1 leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-2.5">Account</p>
        <div className="space-y-0.5">
          <Link
            href="/settings"
            className={`group relative flex items-center gap-2.5 h-[34px] px-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
              active('/settings')
                ? 'bg-white/[0.10] text-white'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
            }`}
          >
            {active('/settings') && (
              <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] bg-white rounded-full" />
            )}
            <Settings
              size={15}
              strokeWidth={active('/settings') ? 2.5 : 1.8}
              className={active('/settings') ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'}
            />
            Settings
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="group flex items-center gap-2.5 h-[34px] px-2 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-red-400 hover:bg-white/[0.04] w-full transition-all duration-100"
            >
              <LogOut size={15} strokeWidth={1.8} className="group-hover:text-red-400 transition-colors" />
              Sign out
            </button>
          </form>
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5 px-2 pt-4 mt-2 border-t border-white/[0.06]">
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            <span className="text-[9px] font-bold text-zinc-300">{initials}</span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate flex-1 leading-none">{userEmail}</p>
        </div>
      </div>
    </aside>
  )
}
