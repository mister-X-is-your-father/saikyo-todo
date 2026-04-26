/// <reference lib="webworker" />
/**
 * Service Worker (Phase 6.11 PWA)。Serwist 公式テンプレ + Supabase / Server Action 安全策。
 *
 * - precache: Next.js build 出力 (`__SW_MANIFEST` に Serwist が注入)
 * - runtimeCaching:
 *   * 先頭に `NetworkOnly` ガード: method !== 'GET' / /auth/* / /api/* / Server Action POST
 *     - Server Action は通常 RSC POST だが、defaultCache の NavigationRoute が
 *       誤マッチする防護のため、念のため method != GET を最優先で除外する
 *   * その後 defaultCache (precache + image / static / page NetworkFirst 等)
 * - offline fallback: 静的 ~offline ページを document fetch 失敗時に表示
 *
 * 注: dev mode では next.config.ts の `disable: NODE_ENV === 'development'` により
 *      この SW は組み込まれない (HMR と相性が悪いため)。
 */
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope &
  WorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined }

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) => {
        if (request.method !== 'GET') return true
        if (url.pathname.startsWith('/auth/')) return true
        if (url.pathname.startsWith('/api/')) return true
        // Next の RSC fetch / Server Action は通常 GET でも cache せず素通しする方が安全
        if (url.searchParams.has('_rsc')) return true
        return false
      },
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
