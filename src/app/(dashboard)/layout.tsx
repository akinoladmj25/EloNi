import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ background: '#eaecf2' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0 sticky top-0 h-screen">
        <Sidebar userEmail={user.email ?? ''} />
      </div>
      {/* Mobile nav + content stacked */}
      <div className="flex flex-col flex-1 min-w-0">
        <MobileNav userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-auto page-bg">
          {children}
        </main>
        <footer className="shrink-0 px-6 py-3 border-t border-zinc-200/70 flex items-center justify-between">
          <p className="text-[11px] text-zinc-400">© {new Date().getFullYear()} EloNi</p>
          <p className="text-[11px] text-zinc-400">Professional invoicing made simple</p>
        </footer>
      </div>
    </div>
  )
}
