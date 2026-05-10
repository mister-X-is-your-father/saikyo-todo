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
      aria-label="再読み込みして再試行 (ページ全体を読み直して接続を回復)"
      className="h-11 px-4"
    >
      <span aria-hidden="true">再読み込みして再試行</span>
    </Button>
  )
}
