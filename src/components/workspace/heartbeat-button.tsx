'use client'

/**
 * Heartbeat 手動スキャンボタン。workspace ヘッダに置く。
 * - pending 中は disabled + 「スキャン中…」
 * - 成功時 toast (created / skipped の件数)
 */
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { unwrap } from '@/lib/result-unwrap'

import { scanHeartbeatAction } from '@/features/heartbeat/actions'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
}

export function HeartbeatButton({ workspaceId }: Props) {
  const scan = useMutation({
    mutationFn: async () => unwrap(await scanHeartbeatAction({ workspaceId })),
  })

  async function run() {
    try {
      const r = await scan.mutateAsync()
      toast.success(
        `Heartbeat: 作成 ${r.notificationsCreated} / スキップ ${r.notificationsSkipped} (評価 ${r.itemsEvaluated} 件)`,
      )
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Heartbeat スキャンに失敗')
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={scan.isPending}
      onClick={() => void run()}
      data-testid="heartbeat-btn"
      title="MUST item を 7d / 3d / 1d / overdue 段階でスキャンして通知を作成"
      aria-label={
        scan.isPending
          ? 'Heartbeat スキャンを実行中…'
          : 'Heartbeat: MUST item の期限スキャンを手動実行 (7d / 3d / 1d / overdue 段階で通知を作成)'
      }
    >
      {scan.isPending ? 'スキャン中…' : 'Heartbeat'}
    </Button>
  )
}
