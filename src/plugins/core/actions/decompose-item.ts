/**
 * Action Plugin "AI 分解": 対象 Item を Researcher Agent で子タスクに分解する。
 *
 * - `applicableTo`: 対象 Item が指定されていて、既に done 状態でないとき表示する
 * - `execute`: 実際の Server Action 呼び出しは UI コンテナ側で注入 (plugin 単体は副作用なし)
 *
 * UI 側 (Day 19 後半) で `decomposeItemAction` にブリッジする。
 */
import type { ActionPlugin } from '@/plugins/types'

export const decomposeItemActionPlugin: ActionPlugin = {
  id: 'core.ai-decompose',
  label: 'AI 分解',
  group: 'AI',
  keywords: ['decompose', 'ai', 'split', 'researcher', '分解'],
  applicableTo: (item) => item.status !== 'done',
  execute: () => {
    // Plugin レジストリは pure (サーバ / クライアント両対応) なので
    // 実 Server Action 呼び出しはコマンドパレット等の UI コンテナが担う。
    // ここでは識別子と applicableTo だけを提供する。
  },
}
