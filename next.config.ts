import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

import withSerwistInit from '@serwist/next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * Service Worker (Phase 6.11 PWA)。dev では HMR と相性が悪いので disable。
 * 出力は public/sw.js (Serwist 既定)。
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: true,
})

const nextConfig: NextConfig = {
  output: 'standalone', // Docker Compose 自前ホスト想定
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      // CSRF 対策。本番は Caddy 越しの実ドメインを追加する。
      // `*.ts.net` は Tailscale 経由アクセス (社内テスト用) を許可。
      allowedOrigins: [
        'localhost:3001',
        '127.0.0.1:3001',
        ...(process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? []),
      ],
    },
  },
}

export default withNextIntl(withSerwist(nextConfig))
