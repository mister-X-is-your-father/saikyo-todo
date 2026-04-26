'use client'

/**
 * Service Worker 登録 (Phase 6.11 PWA)。
 *
 * - production: `navigator.serviceWorker.register('/sw.js')` を 1 度だけ呼ぶ
 * - development: 既存登録を **必ず unregister** する。これをやらないと前回 production
 *   build で開いたタブで生き残った SW が dev mode のリクエストを横取りして HMR が壊れる
 *   (HANDOFF §5.24)。
 */
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // dev: 居座っている SW を掃除して終わり (HMR と相性悪いため)
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => false))))
        .catch(() => {})
      return
    }

    let cancelled = false
    const onLoad = () => {
      if (cancelled) return
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((e) => console.warn('[sw] register failed', e))
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', onLoad)
    }
  }, [])
  return null
}
