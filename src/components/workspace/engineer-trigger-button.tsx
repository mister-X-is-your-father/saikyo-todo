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
    <div
      className="flex items-center gap-2"
      role="group"
      /* iter1550: 旧 `「${title}」を Engineer Agent に投入 (...)` は ' を' 助詞接続で
         iter1093-1549 sweep の em-dash 区切と divergent。内部 button (line 97) は既に em-dash
         convention (`Engineer に実装させる — ...`) で、group landmark も convention 合わせる。 */
      aria-label={`「${item.title}」 — Engineer Agent に投入 (PR 自動起票 toggle / 実装起動)`}
    >
      <label className="flex min-h-11 items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={autoPr}
          onChange={(e) => setAutoPr(e.target.checked)}
          data-testid="engineer-auto-pr"
          aria-label={
            autoPr
              ? 'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'
              : 'PR 自動起票が OFF: Engineer 起動時は commit のみ、PR は人間が後で push — クリックで ON'
          }
        />
        <span className="text-muted-foreground" aria-hidden="true">
          PR 自動起票
        </span>
      </label>
      <Button
        type="button"
        size="sm"
        className="min-h-11"
        variant="secondary"
        disabled={trigger.isPending}
        // iter334: pending 中の SR 通知を「disabled」だけでなく「busy」にも伝達
        // (disabled は禁止状態、aria-busy は処理進行中の意味で異なる、両方付ければ
        // SR は適切に状態区別できる)。
        aria-busy={trigger.isPending || undefined}
        onClick={() => void handleClick()}
        data-testid="engineer-trigger-btn"
        // iter1036: visible "🛠 Engineer に実装させる" (= "Engineer に実装させる" 部分が
        // voice-control 用) を accessible name の prefix 固定で WCAG 2.5.3 satisfy。
        // 旧 aria-label "Engineer Agent に「title」を実装させる" は "Engineer" と
        // "に実装させる" 間に "Agent に「title」を" が入り literal substring 不一致。
        aria-label={
          trigger.isPending
            ? `起動中… — Engineer Agent に「${item.title}」を投入中`
            : `Engineer に実装させる — Engineer Agent に「${item.title}」を投入${autoPr ? ' (PR 自動起票)' : ''}`
        }
      >
        {trigger.isPending ? (
          <span aria-hidden="true">起動中…</span>
        ) : (
          <span aria-hidden="true">🛠 Engineer に実装させる</span>
        )}
      </Button>
    </div>
  )
}
