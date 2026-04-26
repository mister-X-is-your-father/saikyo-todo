'use client'

/**
 * Engineer Agent 起動ボタン (Phase 6.12)。
 *
 * Item から Engineer を起動 → pg-boss queue に enqueue。
 * 非同期: 結果は agent_invocations 経由で監視 (worker 必須)。
 *
 * **危険操作のため confirm + autoPr は明示的 opt-in**:
 *   - autoPr=false (default) → commit のみ。PR は人間が後で push
 *   - autoPr=true             → 起動時に gh pr create --draft も走らせる
 */
import { useState } from 'react'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { unwrap } from '@/lib/result-unwrap'

import { triggerEngineerAgentAction } from '@/features/agent/engineer-actions'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

interface Props {
  item: Item
}

export function EngineerTriggerButton({ item }: Props) {
  const [autoPr, setAutoPr] = useState(false)
  const trigger = useMutation({
    mutationFn: async () =>
      unwrap(
        await triggerEngineerAgentAction({
          itemId: item.id,
          autoPr,
        }),
      ),
  })

  async function handleClick() {
    const ok = window.confirm(
      `Engineer Agent をこの Item で起動します。\n\n` +
        `* git worktree を作成し、Claude が自動でコードを書きます\n` +
        `* ${autoPr ? 'PR (Draft) も自動起票します' : 'commit のみ。push / PR は人間が後で実行'}\n` +
        `* 進捗は agent_invocations に記録されます\n\n` +
        `続行しますか?`,
    )
    if (!ok) return
    try {
      const r = await trigger.mutateAsync()
      toast.success(`Engineer に投入しました (jobId=${r.jobId ?? 'inline'})`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '起動に失敗しました')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={autoPr}
          onChange={(e) => setAutoPr(e.target.checked)}
          data-testid="engineer-auto-pr"
        />
        <span className="text-muted-foreground">PR 自動起票</span>
      </label>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={trigger.isPending}
        onClick={() => void handleClick()}
        data-testid="engineer-trigger-btn"
      >
        {trigger.isPending ? '起動中…' : '🛠 Engineer に実装させる'}
      </Button>
    </div>
  )
}
