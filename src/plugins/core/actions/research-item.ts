/**
 * Action Plugin "AI 調査": 対象 Item を Researcher Agent に調査させ、Doc として保存する。
 *
 * - `applicableTo`: 対象 Item が done 以外のとき表示
 * - `execute`: 実際の Server Action 呼び出しは UI コンテナ側で注入
 */
import type { ActionPlugin } from '@/plugins/types'

export const researchItemActionPlugin: ActionPlugin = {
  id: 'core.ai-research',
  label: 'AI 調査',
  group: 'AI',
  keywords: ['research', 'ai', 'investigate', 'doc', '調査'],
  applicableTo: (item) => item.status !== 'done',
  execute: () => {
    // pure — UI 側で researchItemAction にブリッジ
  },
}
