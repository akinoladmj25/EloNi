import Link from 'next/link'

export const metadata = { title: 'Terms of Service — EloNi' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 h-14 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <span className="text-white font-black text-[10px] tracking-tighter">ELN</span>
          </div>
          <span className="font-bold text-zinc-900 text-sm">EloNi</span>
        </Link>
        <Link href="/signup" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Back to sign up</Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: April 2026</p>

        <div className="prose prose-zinc max-w-none space-y-8 text-sm leading-relaxed text-zinc-600">
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using EloNi, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">2. Description of Service</h2>
            <p>EloNi is an invoicing platform that allows freelancers, consultants, and small businesses to create, send, and manage invoices, quotes, and receipts. We reserve the right to modify or discontinue the service at any time with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You are responsible for all activity that occurs under your account.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">4. Your Data</h2>
            <p>You retain ownership of all data you enter into EloNi. We do not sell your data to third parties. We store your data securely using industry-standard practices. You may export or delete your data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">5. Acceptable Use</h2>
            <p>You agree not to use EloNi for any unlawful purpose, to send spam or unsolicited communications, or to misrepresent yourself or your business to your clients. We reserve the right to suspend accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">6. Payments and Billing</h2>
            <p>Paid plans are billed monthly or annually as chosen at signup. All fees are non-refundable unless required by law. We reserve the right to change pricing with 30 days notice. Downgrading your plan will take effect at the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">7. Limitation of Liability</h2>
            <p>EloNi is provided &ldquo;as is&rdquo; without warranties of any kind. We are not responsible for any financial decisions made based on data within the platform. Our liability is limited to the amount you paid us in the last 12 months.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">8. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:support@eloni.app" className="text-zinc-900 underline hover:no-underline">support@eloni.app</a>.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
