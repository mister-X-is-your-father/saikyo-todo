import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone', // Docker Compose 自前ホスト想定
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      // CSRF 対策。本番デプロイ時に Caddy 越しの実ドメインを追加する想定。
      allowedOrigins: ['localhost:3001'],
    },
  },
}

export default withNextIntl(nextConfig)
