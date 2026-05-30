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
         voice control prefix-matching は維持しつつ codebase aria-label style と統一。 */
      aria-label="再読み込みして再試行 — ページ全体を読み直して接続を回復"
      className="h-11 px-4"
    >
      <span aria-hidden="true">再読み込みして再試行</span>
    </Button>
  )
}
