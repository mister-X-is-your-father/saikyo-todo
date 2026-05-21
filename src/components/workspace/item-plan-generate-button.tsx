'use client'

/**
 * AI 担当 Item の「実行計画 (Plan)」を生成するボタン。
 *
 * - canGeneratePlan で表示 gate (status='done' 除外 + AI assignee 必須) を判定
 * - pending 中は disabled + 「Plan 生成中…」表示 (Researcher は数秒〜30s かかる)
 * - 成功時 toast + comments query invalidate (hooks 側、コメントタブで 🤖 marker plan が見える)
 * - 失敗時 toast.error
 *
 * P0「AI 自動実行モード」 scope A 完結 (iter513): iter506-512 の substrate を結線。
 */
import { BotIcon } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useGeneratePlan } from '@/features/agent/hooks'
import { canGeneratePlan } from '@/features/item/ai-assignee'
import type { AssigneeRef } from '@/features/item/repository'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
  item: Item
  assignees: readonly AssigneeRef[]
}

export function ItemPlanGenerateButton({ workspaceId, item, assignees }: Props) {
  const generate = useGeneratePlan()
  const enabled = canGeneratePlan({ status: item.status, assignees })

  if (!enabled) return null

  async function run() {
    try {
      await generate.mutateAsync({ workspaceId, itemId: item.id })
      toast.success('実行計画 (案) をコメントに投下しました — 確認してください')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Plan 生成に失敗しました')
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      className="min-h-11"
      variant="outline"
      disabled={generate.isPending}
      aria-busy={generate.isPending || undefined}
      onClick={(e) => {
        e.stopPropagation()
        void run()
      }}
      data-testid={`generate-plan-btn-${item.id}`}
      // iter1037: visible "Plan を生成" / "Plan 生成中…" を aria-label の prefix に
      // 固定し WCAG 2.5.3 Label in Name satisfy (旧 aria-label は "実行計画" と
      // "Plan を生成" の synonym 化で literal substring 不一致だった)。
      aria-label={
        generate.isPending
          ? `Plan 生成中… — 「${item.title}」の Plan を生成中`
          : `Plan を生成 — 「${item.title}」の AI 担当が実行計画を comment に投下します`
      }
    >
      <BotIcon className="size-4" aria-hidden="true" />
      <span aria-hidden="true">{generate.isPending ? 'Plan 生成中…' : 'Plan を生成'}</span>
    </Button>
  )
}
