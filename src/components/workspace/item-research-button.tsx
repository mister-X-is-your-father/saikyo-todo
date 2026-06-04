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
      className="min-h-11"
      variant="outline"
      disabled={research.isPending || item.status === 'done'}
      aria-busy={research.isPending || undefined}
      onClick={(e) => {
        e.stopPropagation()
        void run()
      }}
      data-testid={`research-btn-${item.id}`}
      // iter1160: 旧 aria-label 3 path とも visible "AI 調査" / "調査中…" を中位置
      // ("ため **AI 調査** 不可" / "を **AI 調査中…**") に持ち voice control
      // prefix-matching「click AI 調査 / 調査中…」 match 不可 (substring 一致のみ)。
      // iter1159 item-decompose-button と同 sweep。visible 冒頭固定 + em-dash 区切。
      aria-label={
        item.status === 'done'
          ? `AI 調査 — 「${item.title}」は完了済のため AI 調査不可`
          : research.isPending
            ? `調査中… — 「${item.title}」を AI 調査中…`
            : `AI 調査 — 「${item.title}」を AI 調査して Doc を作成`
      }
      /* iter2231: item-research-button の aria-label は state-dependent 3-path
         (done / pending / idle、item.title + AI 調査用途含む) で SR には full context を
         渡すが browser tooltip にならず sighted は hover で同 context disclose 不可。
         item-decompose-btn iter2213 / engineer-trigger-btn iter2211 と同 state-dependent
         title=aria-label sync pattern、AI action 系 button 3 element 完成 (decompose /
         engineer / research)。 */
      title={
        item.status === 'done'
          ? `AI 調査 — 「${item.title}」は完了済のため AI 調査不可`
          : research.isPending
            ? `調査中… — 「${item.title}」を AI 調査中…`
            : `AI 調査 — 「${item.title}」を AI 調査して Doc を作成`
      }
    >
      <span aria-hidden="true">{research.isPending ? '調査中…' : 'AI 調査'}</span>
    </Button>
  )
}
