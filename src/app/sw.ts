/// <reference lib="webworker" />
/**
 * Service Worker (Phase 6.11 PWA)。Serwist 公式テンプレを最小化。
 *
 * - precache: Next.js build 出力 (`__SW_MANIFEST` に Serwist が注入)
 * - runtimeCaching: defaultCache を使うが、Server Action / API / Auth は素通し
 * - offline fallback: 静的 ~offline ページを表示
 *
 * 注: Supabase Auth / Realtime / Server Action POST は **キャッシュしない**。
 * - method !== 'GET' は素通し (Serwist defaultCache の navigation handler は GET のみ)
 * - /auth/*, /api/* は別途 NetworkOnly
 */
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

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
  runtimeCaching: defaultCache,
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
