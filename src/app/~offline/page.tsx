/**
 * オフライン fallback (Phase 6.11 PWA)。
 *
 * Service Worker が `request.destination === 'document'` で network 失敗時に
 * このページに fall back させる。**完全静的・Server Action 呼び出し禁止**
 * (cookie / DB アクセスをするとオフライン時に死ぬため)。
 */
import type { Metadata } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'

import { OfflineRetryButton } from './retry-button'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'オフライン | 最強TODO',
}

export default function OfflinePage() {
  return (
    <main
      aria-labelledby="offline-heading"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 id="offline-heading" className="text-2xl font-bold">
        オフラインです
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        ネットワーク接続が切れています。再接続後にもう一度お試しください。
      </p>
      <p className="text-muted-foreground max-w-md text-xs">
        最強TODO はオフラインでもアプリ自体は表示されますが、 Item の作成 /
        同期にはオンライン接続が必要です。
      </p>
      <div
        role="group"
        aria-label="復帰アクション"
        className="flex flex-wrap items-center justify-center gap-2 pt-2"
      >
        <OfflineRetryButton />
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          ホームに戻る
        </Link>
      </div>
    </main>
  )
}
