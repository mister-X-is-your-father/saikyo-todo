/**
 * オフライン fallback (Phase 6.11 PWA)。
 *
 * Service Worker が `request.destination === 'document'` で network 失敗時に
 * このページに fall back させる。**完全静的・Server Action 呼び出し禁止**
 * (cookie / DB アクセスをするとオフライン時に死ぬため)。
 */
export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">オフラインです</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        ネットワーク接続が切れています。再接続後にもう一度お試しください。
      </p>
      <p className="text-muted-foreground text-xs">
        最強TODO はオフラインでもアプリ自体は表示されますが、 Item の作成 /
        同期にはオンライン接続が必要です。
      </p>
    </main>
  )
}
