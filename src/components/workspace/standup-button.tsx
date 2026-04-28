'use client'

/**
 * ヘッダに置く PM Stand-up 起動ボタン。
 * - pending 中は disabled + 「Stand-up 実行中…」
 * - 成功時 toast.success (text を短く表示)
 * - 失敗時 toast.error
 * Day 25 で cron 化されるので、MVP はこのボタン経由の手動起動。
 */
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { unwrap } from '@/lib/result-unwrap'

import { runStandupAction } from '@/features/agent/actions'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
}

export function StandupButton({ workspaceId }: Props) {
  const standup = useMutation({
    mutationFn: async () => unwrap(await runStandupAction({ workspaceId })),
  })

  async function run() {
    try {
      const r = await standup.mutateAsync()
      const head = r.text.slice(0, 120).replace(/\s+/g, ' ')
      toast.success(`PM Stand-up 完了: ${head || '(本文空)'}`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Stand-up に失敗しました')
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={standup.isPending}
      onClick={() => void run()}
      data-testid="pm-standup-btn"
      title="PM Agent が in_progress / overdue / yesterday-done を要約して Stand-up Doc を生成"
      aria-label={
        standup.isPending
          ? 'PM Stand-up を実行中…'
          : 'PM Stand-up: 朝会サマリー Doc を生成 (PM Agent が in_progress / overdue / yesterday-done を要約)'
      }
    >
      {standup.isPending ? 'Stand-up 実行中…' : 'PM Stand-up'}
    </Button>
  )
}
