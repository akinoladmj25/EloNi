import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-zinc-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar userEmail={user.email ?? ''} />
      </div>
      {/* Mobile nav + content stacked */}
      <div className="flex flex-col flex-1 min-w-0">
        <MobileNav userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
