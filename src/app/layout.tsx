import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'EloNi — Know the price. Send the invoice. Get paid.',
    template: '%s | EloNi',
  },
  description:
    'EloNi is professional invoicing software for freelancers, agencies, contractors, consultants, and businesses of all sizes. Create, send, and track invoices with ease.',
  keywords: ['invoicing', 'invoices', 'billing', 'freelancer', 'agency', 'accounting'],
  authors: [{ name: 'EloNi' }],
  openGraph: {
    title: 'EloNi — Know the price. Send the invoice. Get paid.',
    description:
      'Professional invoicing for freelancers, agencies, and businesses. Create beautiful invoices in minutes.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
