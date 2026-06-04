/**
 * オフライン fallback (Phase 6.11 PWA)。
 *
 * Service Worker が `request.destination === 'document'` で network 失敗時に
 * このページに fall back させる。**完全静的・Server Action 呼び出し禁止**
 * (cookie / DB アクセスをするとオフライン時に死ぬため)。
 */
import type { Metadata } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'

import { buttonVariants } from '@/components/ui/button'

import { OfflineRetryButton } from './retry-button'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'オフライン | 最強TODO',
  description:
    '最強TODO のオフライン fallback 画面 (PWA SW)。ネットワーク復帰後に再読み込みしてください。',
}

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-labelledby="offline-heading"
      aria-describedby="offline-description offline-secondary"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center focus-visible:outline-none"
    >
      <h1 id="offline-heading" className="text-2xl font-bold">
        オフラインです
      </h1>
      <p id="offline-description" className="text-muted-foreground max-w-md text-sm">
        ネットワーク接続が切れています。再接続後にもう一度お試しください。
      </p>
      <p id="offline-secondary" className="text-muted-foreground max-w-md text-xs">
        最強TODO はオフラインでもアプリ自体は表示されますが、 Item の作成 /
        同期にはオンライン接続が必要です。
      </p>
      <div
        role="group"
        aria-label="復帰アクション"
        className="flex flex-wrap items-center justify-center gap-2 pt-2"
      >
        <OfflineRetryButton />
        {/* iter1492: iter1093-1151 sweep の em-dash visible-prefix convention に合わせ
            旧 () 区切から em-dash 区切に。visible "ホームに戻る" は無変更。
            iter1716: iter1714 (signup login-link) と対称な data-testid を offline page Link
            にも付与。Playwright で offline 復帰アクション 2 個 (retry-button / home-link) を
            標準 selector で発見可能に、focus order / aria-label / em-dash convention の自動
            audit を offline page にも展開できるようにする。 */}
        <Link
          href="/"
          prefetch={false}
          aria-label="ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示"
          // iter1805: iter1801 back-link / iter1803 auth cross-link と同 pattern を offline
          // home-link にも展開、retry-button と pair で offline page UX hover disclosure 完備。
          title="ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示"
          data-testid="offline-home-link"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-4')}
        >
          <span aria-hidden="true">ホームに戻る</span>
        </Link>
      </div>
    </main>
  )
}
