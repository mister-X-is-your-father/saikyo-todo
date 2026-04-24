'use client'

/**
 * Item 1 件に対して "AI 調査" を走らせるボタン。
 * - pending 中は disabled + 「調査中…」表示
 * - 成功時 toast (作られた Doc 数)
 * - 失敗時 toast.error
 */
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useResearchItem } from '@/features/agent/hooks'
import type { Item } from '@/features/item/schema'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
  item: Item
}

export function ItemResearchButton({ workspaceId, item }: Props) {
  const research = useResearchItem()

  async function run() {
    try {
      const r = await research.mutateAsync({ workspaceId, itemId: item.id })
      const docCount = r.toolCalls.filter((c) => c.name === 'create_doc').length
      toast.success(`AI 調査完了 (Doc ${docCount} 件)`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'AI 調査に失敗しました')
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={research.isPending || item.status === 'done'}
      onClick={(e) => {
        e.stopPropagation()
        void run()
      }}
      data-testid={`research-btn-${item.id}`}
    >
      {research.isPending ? '調査中…' : 'AI 調査'}
    </Button>
  )
}
