import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from 'sonner'

import { AppQueryProvider } from '@/components/shared/query-provider'
import { ServiceWorkerRegister } from '@/components/shared/sw-register'
import { ThemeProvider } from '@/components/shared/theme-provider'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '最強TODO',
  description: 'チーム共有 AI 駆動 TODO',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '最強TODO',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <NuqsAdapter>
              <AppQueryProvider>{children}</AppQueryProvider>
            </NuqsAdapter>
            <Toaster richColors position="bottom-right" closeButton />
            <ServiceWorkerRegister />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
