import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AskEloNi from '@/components/AskEloNi'

export const metadata = { title: 'Ask EloNi' }

export default async function AskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-8 py-5 border-b border-zinc-200/70">
        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight">Ask EloNi</h1>
        <p className="text-sm text-zinc-400 mt-0.5">AI-powered answers about your business finances</p>
      </div>
      <AskEloNi />
    </div>
  )
}
