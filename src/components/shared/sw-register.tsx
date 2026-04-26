'use client'

/**
 * Service Worker 登録 (Phase 6.11 PWA)。
 *
 * Next.js の app router は SW を自動 register しない。RootLayout に置いて
 * `useEffect` で 1 回だけ navigator.serviceWorker.register('/sw.js') を呼ぶ。
 * 開発モード (sw.js が存在しない) では fetch が 404 になるので silent fail。
 */
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((e) => console.warn('[sw] register failed', e))
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}
