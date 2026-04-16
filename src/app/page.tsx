import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  FileText,
  FileCheck2,
  Receipt,
  Zap,
  Globe,
  Shield,
  BarChart2,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Professional Invoices',
    description: 'Create polished, branded invoices in minutes. Add your logo and look the part every time.',
  },
  {
    icon: FileCheck2,
    title: 'Quotes & Proposals',
    description: 'Send professional quotes, track responses, and convert accepted quotes to invoices in one click.',
  },
  {
    icon: Receipt,
    title: 'Automatic Receipts',
    description: 'Every paid invoice instantly becomes a downloadable receipt for you and your client.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description: 'Invoice in GBP, USD, EUR, NGN, GHS, KES and more. Built for international freelancers.',
  },
  {
    icon: Clock,
    title: 'Track What You\'re Owed',
    description: 'See outstanding, overdue, and paid at a glance. Invoices auto-mark overdue when the due date passes.',
  },
  {
    icon: BarChart2,
    title: 'Business Insights',
    description: 'Dashboard stats show total invoiced, collected, outstanding, and overdue so you always know where you stand.',
  },
  {
    icon: Zap,
    title: 'Fast and Intuitive',
    description: 'No training needed. From zero to a sent invoice in under two minutes.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Row-level security means only you can see your invoices, quotes, and client data.',
  },
]

const pricing = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 5 invoices per month',
      'Quotes & receipts',
      'Unlimited clients',
      'Multi-currency',
      'PDF export',
    ],
    cta: 'Get Started Free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '£9',
    period: 'per month',
    description: 'For active freelancers and small agencies',
    features: [
      'Unlimited invoices & quotes',
      'Unlimited clients',
      'Custom branding',
      'Invoice analytics',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '£25',
    period: 'per month',
    description: 'For growing teams and agencies',
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      'Shared client database',
      'Role-based access',
      'Priority phone support',
    ],
    cta: 'Contact Sales',
    href: '/signup?plan=business',
    highlight: false,
  },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[10px] tracking-tighter">ELN</span>
            </div>
            <span className="text-[15px] font-bold text-zinc-900 tracking-tight">EloNi</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 text-center bg-gradient-to-b from-zinc-50 to-white">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-full text-xs font-semibold mb-6">
            <CheckCircle2 size={12} />
            Free to start — no credit card required
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-zinc-900 leading-tight tracking-tight mb-6">
            Know the price.<br />
            Send the invoice.<br />
            <span className="text-zinc-400">Get paid.</span>
          </h1>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed">
            EloNi is the fastest way for freelancers, agencies, and consultants to send quotes, create professional invoices, and get paid on time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-zinc-900 text-white text-base font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center w-full sm:w-auto justify-center px-8 py-3.5 border border-zinc-200 text-zinc-700 text-base font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-5 text-xs text-zinc-400">
            Trusted by freelancers, agencies, and consultants across retail, tech, creative, and more.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">Everything you need to invoice professionally</h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              All the tools you need, without the complexity you don&apos;t.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(feature => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all bg-white"
              >
                <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon size={16} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{feature.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Start free. Upgrade when you&apos;re ready. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border ${
                  plan.highlight
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-200'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <h3 className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-zinc-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? 'text-zinc-400' : 'text-zinc-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        size={14}
                        className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-zinc-400' : 'text-zinc-900'}`}
                      />
                      <span className={plan.highlight ? 'text-zinc-300' : 'text-zinc-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-zinc-900 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get paid faster?</h2>
          <p className="text-zinc-400 mb-8">Join professionals who trust EloNi to handle their invoicing and quotes.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-zinc-900 text-base font-semibold rounded-xl hover:bg-zinc-100 transition-colors"
          >
            Get Started Free — No Card Required <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[8px] tracking-tighter">ELN</span>
            </div>
            <span className="text-sm font-semibold text-zinc-700">EloNi</span>
          </div>
          <p className="text-xs text-zinc-400">
            Know the price. Send the invoice. Get paid. &copy; {new Date().getFullYear()} EloNi.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <Link href="/privacy" className="hover:text-zinc-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
