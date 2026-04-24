/**
 * 例 ActionPlugin: コマンドパレットから "再読み込み" を叩く。
 * レジストリが機能していることを証明する最小スモークとして配置。
 * ItemsBoard の refetch とのブリッジは呼び出し側で行う (Day 9 以降で統合)。
 */
import type { ActionPlugin } from '@/plugins/types'

export const reloadItemsAction: ActionPlugin = {
  id: 'core.reload-items',
  label: '再読み込み',
  group: 'ビュー',
  keywords: ['reload', 'refresh'],
  execute: () => {
    // 実際の refetch は CommandPalette 経由で注入される handler で行う。
    // ActionPlugin 単体では副作用を持たない (= サーバ/クライアント両対応)。
  },
}
