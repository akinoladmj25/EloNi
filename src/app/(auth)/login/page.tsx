import Link from 'next/link'
import { login, loginWithGoogle } from '../actions'

interface LoginPageProps { searchParams: Promise<{ error?: string }> }
export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1 tracking-tight">Sign in</h1>
      <p className="text-[13px] text-zinc-400 mb-8">Enter your email and password to continue.</p>

      {error && (
        <p className="mb-5 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-md">
          {decodeURIComponent(error)}
        </p>
      )}

      <form action={loginWithGoogle} className="mb-4">
        <button
          type="submit"
          className="w-full h-10 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium flex items-center justify-center gap-2.5 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4069 3.78409 7.83 3.96409 7.29V4.9582H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4523 0.347727 11.8269 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.5796C10.3214 3.5796 11.5077 4.0336 12.4405 4.9255L15.0218 2.3441C13.4632 0.8918 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9582L3.96409 7.29C4.67182 5.1627 6.65591 3.5796 9 3.5796Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400 font-medium">or</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      <form action={login} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
          <input
            name="email" type="email" autoComplete="email" required
            placeholder="you@example.com"
            className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900/30 transition-colors transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-zinc-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-600">Forgot password?</Link>
          </div>
          <input
            name="password" type="password" autoComplete="current-password" required
            placeholder="••••••••"
            className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900/30 transition-colors transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors mt-1" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-500 text-center">
        No account?{' '}
        <Link href="/signup" className="text-zinc-900 font-medium hover:underline">Sign up free</Link>
      </p>
    </div>
  )
}
