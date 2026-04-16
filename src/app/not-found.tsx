import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-black text-zinc-100 select-none mb-6">404</p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Page not found</h1>
        <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
