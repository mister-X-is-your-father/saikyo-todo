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
      className="min-h-11"
      disabled={scan.isPending}
      aria-busy={scan.isPending || undefined}
      onClick={() => void run()}
      data-testid="heartbeat-btn"
      title="MUST item を 7d / 3d / 1d / overdue 段階でスキャンして通知を作成"
      // iter1100: pending state で visible "スキャン中…" が aria-label "Heartbeat スキャンを実行中…"
      // の literal substring に含まれない (ン と 中 の間に "を実行" が挿入されて連続不一致) =
      // WCAG 2.5.3 違反 + voice control「click スキャン中…」 matching 不可。
      // iter1093-1099 sweep convention に合わせ visible 冒頭固定。
      // iter1504: default path に colon convention `'Heartbeat:`' が iter1226 / iter1498
      // em-dash sweep (visible-prefix colon → em-dash migration) からこぼれて残存していた。
      // pending path は既に em-dash convention で satisfy 済、default のみ migration。
      aria-label={
        scan.isPending
          ? 'スキャン中… — Heartbeat MUST スキャン実行中'
          : 'Heartbeat — MUST item の期限スキャンを手動実行 (7d / 3d / 1d / overdue 段階で通知を作成)'
      }
    >
      <span aria-hidden="true">{scan.isPending ? 'スキャン中…' : 'Heartbeat'}</span>
    </Button>
  )
}
