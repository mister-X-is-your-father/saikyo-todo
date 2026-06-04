import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { AppQueryProvider } from '@/components/shared/query-provider'
import { ServiceWorkerRegister } from '@/components/shared/sw-register'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { ThemedToaster } from '@/components/shared/themed-toaster'

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
  // 社内チーム利用・社外非公開 (CLAUDE.md): search engine 全 page 不可視 default。
  // 公開する page を将来追加する場合は当該 page の metadata で override する。
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  colorScheme: 'light dark',
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
        {/*
         * iter389: keyboard user 用の skip-to-main link。Tab で最初に focus が当たり、
         * Enter で `#main-content` (各 page の <main>) にスキップ。focus 時のみ可視化、
         * 通常時は sr-only で SR のみが認識。WCAG 2.4.1 Bypass Blocks 対応。
         * 各 page の <main> 要素に `id="main-content"` を付与する必要がある。
         * iter1728: data-testid 付与で Playwright が `[data-testid="skip-to-main"]` で
         * 標準 selector 経路で発見可能、WCAG 2.4.1 (Bypass Blocks) の Tab-1 focus / Enter
         * 押下 → main へジャンプの E2E test を全 page 一律 pattern で書ける。
         */}
        <a
          href="#main-content"
          data-testid="skip-to-main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11 focus:min-w-11 focus:items-center focus:justify-center"
        >
          メインコンテンツへスキップ
        </a>
        <noscript>
          <div
            className="bg-destructive text-destructive-foreground p-4 text-center text-sm"
            role="alert"
          >
            最強TODO は JavaScript を必要とします。ブラウザで JavaScript を有効にしてください。
          </div>
        </noscript>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <NuqsAdapter>
              <AppQueryProvider>{children}</AppQueryProvider>
            </NuqsAdapter>
            <ThemedToaster
              richColors
              position="bottom-right"
              closeButton
              containerAriaLabel="通知"
              toastOptions={{ closeButtonAriaLabel: '通知を閉じる' }}
            />
            <ServiceWorkerRegister />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
