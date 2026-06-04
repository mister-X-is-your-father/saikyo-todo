'use client'

import { Button } from '@/components/ui/button'

export function OfflineRetryButton() {
  return (
    <Button
      type="button"
      variant="default"
      onClick={() => {
        if (typeof window !== 'undefined') window.location.reload()
      }}
      /* iter1492: iter1093-1151 sweep の em-dash visible-prefix convention に合わせ
         旧 () 区切から em-dash 区切に。visible "再読み込みして再試行" は無変更、
         voice control prefix-matching は維持しつつ codebase aria-label style と統一。
         iter1716: login/page.tsx (data-testid="signup-link") / signup/page.tsx (iter1714
         data-testid="login-link") と対称な data-testid を offline 復帰アクションにも付与。
         Playwright で offline page の focus order / aria-label / 44x44 tap target / em-dash
         convention を自動 audit する際に標準 selector で発見可能になる。 */
      aria-label="再読み込みして再試行 — ページ全体を読み直して接続を回復"
      // iter1805: iter1803 auth cross-link / iter1801 back-link と同 pattern を offline
      // 復帰アクション にも展開、offline page UX hover disclosure 完備。
      title="再読み込みして再試行 — ページ全体を読み直して接続を回復"
      data-testid="offline-retry-button"
      className="h-11 px-4"
    >
      <span aria-hidden="true">再読み込みして再試行</span>
    </Button>
  )
}
