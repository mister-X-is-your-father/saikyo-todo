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
      const proposed = r.toolCalls.filter((c) => c.name === 'propose_child_item').length
      const created = r.toolCalls.filter((c) => c.name === 'create_item').length
      if (proposed > 0) {
        toast.success(`AI 分解完了 — ${proposed} 件の提案を確認してください (子タスクタブ)`)
      } else if (created > 0) {
        toast.success(`AI 分解完了 (子 ${created} 件作成)`)
      } else {
        toast.success('AI 分解完了')
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'AI 分解に失敗しました')
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      className="min-h-11"
      variant="outline"
      disabled={decompose.isPending || item.status === 'done'}
      aria-busy={decompose.isPending || undefined}
      onClick={(e) => {
        // 親 row の onClick / drag に伝播させない
        e.stopPropagation()
        void run()
      }}
      data-testid={`decompose-btn-${item.id}`}
      // iter1159: 旧 aria-label 3 path とも visible "AI 分解" / "分解中…" を中位置
      // ("ため **AI 分解** 不可" / "を **AI 分解中…**") に持ち voice control
      // prefix-matching「click AI 分解 / 分解中…」 match 不可 (substring 一致のみ)。
      // iter1093-1158 sweep convention に揃え visible 冒頭固定 + em-dash 区切で
      // 残り descriptive 末尾保持。
      aria-label={
        item.status === 'done'
          ? `AI 分解 — 「${item.title}」は完了済のため AI 分解不可`
          : decompose.isPending
            ? `分解中… — 「${item.title}」を AI 分解中…`
            : `AI 分解 — 「${item.title}」を AI 分解 (子タスクを 3〜5 件作成)`
      }
      /* iter2213: item-decompose-btn の state-dependent aria-label (3-path: done /
         pending / idle、item.title 含む) は browser tooltip にならず sighted は hover で
         item.title + state context disclose 不可。engineer-trigger-btn iter2211 /
         heartbeat-button iter2205 と同 title=aria-label sync pattern。 */
      title={
        item.status === 'done'
          ? `AI 分解 — 「${item.title}」は完了済のため AI 分解不可`
          : decompose.isPending
            ? `分解中… — 「${item.title}」を AI 分解中…`
            : `AI 分解 — 「${item.title}」を AI 分解 (子タスクを 3〜5 件作成)`
      }
    >
      <span aria-hidden="true">{decompose.isPending ? '分解中…' : 'AI 分解'}</span>
    </Button>
  )
}
