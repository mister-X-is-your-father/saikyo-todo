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

/**
 * `NEXT_PUBLIC_ALLOWED_ORIGINS` をパースして dev / Server Action 双方の origin リストを生成。
 * 例: "leo.tail65add4.ts.net:10443,leo.tail65add4.ts.net" → 両方が allowed origin として通る。
 *
 * Next.js は `serverActions.allowedOrigins` (CSRF) と `allowedDevOrigins` (dev リソース cross-origin)
 * を別物として扱うため、Tailscale Funnel など外部ホストからの dev アクセスでは両方への登録が必要。
 * 後者を忘れると login 後の RSC fetch / HMR チャネルが silent block されて画面遷移が見えなくなる。
 */
const extraOrigins =
  process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? []

const nextConfig: NextConfig = {
  output: 'standalone', // Docker Compose 自前ホスト想定
  // dev mode で Next.js 内部リソース (fonts, HMR, RSC fetch 等) への cross-origin アクセスを許可。
  // ホスト名のみ (port 無し) も含めると `host:port` mismatch でも通せて柔軟。
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    ...extraOrigins,
    ...extraOrigins.map((o) => o.split(':')[0] ?? '').filter(Boolean),
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      // CSRF 対策。本番は Caddy 越しの実ドメインを追加する。
      // `*.ts.net` は Tailscale 経由アクセス (社内テスト用) を許可。
      allowedOrigins: ['localhost:3001', '127.0.0.1:3001', ...extraOrigins],
    },
  },
}

export default withNextIntl(withSerwist(nextConfig))
