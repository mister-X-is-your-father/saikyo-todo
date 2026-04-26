import type { MetadataRoute } from 'next'

/**
 * Web App Manifest (Phase 6.11 PWA)。
 * Next.js App Router の MetadataRoute.Manifest API で生成。
 *   - URL: /manifest.webmanifest
 *   - icons は /icon (192) と /apple-icon (180) を `next/og` で動的生成
 *   - 512x512 用には ?size=512 経路を持たせず、192 を maskable=any で兼用
 *     (Lighthouse PWA 監査は 192 + 512 の両方を要求するが、Next.js の icon.tsx
 *     は size 単一のため、512 サイズは別ファイル `src/app/icon-512.tsx` で出す)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '最強TODO',
    short_name: '最強TODO',
    description: 'チーム共有 AI 駆動 TODO',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    orientation: 'portrait',
    lang: 'ja',
  }
}
