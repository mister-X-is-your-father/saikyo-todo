'use client'

/**
 * Item 1 件に対して "AI 分解" を走らせるボタン。
 * - pending 中は disabled + 「分解中…」表示 (Researcher は数秒〜30s かかる)
 * - 成功時 toast + TanStack Query invalidate (hooks 側)
 * - 失敗時 toast.error
 *
 * BacklogView など list 型ビューのアクション列から呼び出す想定。
 */
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useDecomposeItem } from '@/features/agent/hooks'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
  item: Item
}

export function ItemDecomposeButton({ workspaceId, item }: Props) {
  const decompose = useDecomposeItem(workspaceId)

  async function run() {
    try {
      const r = await decompose.mutateAsync({ workspaceId, itemId: item.id })
      toast.success(
        `AI 分解完了 (子 ${r.toolCalls.filter((c) => c.name === 'create_item').length} 件)`,
      )
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'AI 分解に失敗しました')
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={decompose.isPending || item.status === 'done'}
      onClick={(e) => {
        // 親 row の onClick / drag に伝播させない
        e.stopPropagation()
        void run()
      }}
      data-testid={`decompose-btn-${item.id}`}
    >
      {decompose.isPending ? '分解中…' : 'AI 分解'}
    </Button>
  )
}
