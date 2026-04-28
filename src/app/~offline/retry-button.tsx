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
      aria-label="ページを再読み込みして接続を再試行"
    >
      再読み込みして再試行
    </Button>
  )
}
