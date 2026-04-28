/**
 * iter297 ai-automation: ある Item の依存関係から「着手可能か」を summarize する pure helper。
 *
 * iter279 computeUrgency / iter287 getDueProximity / iter294 status group と並ぶ
 * AI substrate シリーズ。AI brief / pm-agent prompt / Item 詳細 UI / dashboard
 * widget が「依存ブロックの状態」を 1 関数で数値化できる。今までは
 *   - listForItem (service.ts) → ItemDependencyGroup を返すが「未完了の blocker は何件か」は caller 側で再 filter
 *   - dependencies-tab (component) で同様のロジックが view 内 inline
 * と 2 系統で書かれていた。本関数は pure (DB / hook 不参照)。
 *
 * 仕様:
 *  - `blockedBy` のうち `ref.doneAt === null` を「open (未完了の前提)」と数える
 *  - `blocking` のうち `ref.doneAt === null` を「open (未完了の後続)」と数える
 *  - `related` は単純カウントのみ (relates_to は順序を持たないので open 概念なし)
 *  - `isBlocked = openBlockedByCount > 0`
 *  - `isReady` は反対概念 (`isBlocked === false`) — caller が「着手可能?」を否定文なしで読める用
 *  - すべて pure: ItemDependencyGroup 1 つで決まる
 */
import type { ItemDependencyGroup } from './schema'

export interface DependencyReadiness {
  /** open 前提 1 件以上 = ブロック中 */
  isBlocked: boolean
  /** ブロックゼロ = 着手可能 (`!isBlocked` の sugar) */
  isReady: boolean
  /** 自分の前提条件 (blockedBy) のうち未完了の件数 */
  openBlockedByCount: number
  /** 前提条件の総件数 (= blockedBy.length) */
  blockedByCount: number
  /** 自分の後続 (blocking) のうち未完了の件数 */
  openBlockingCount: number
  /** 後続の総件数 (= blocking.length) */
  blockingCount: number
  /** related 関連の総件数 */
  relatedCount: number
}

export function summarizeDependencyReadiness(group: ItemDependencyGroup): DependencyReadiness {
  const blockedByCount = group.blockedBy.length
  const openBlockedByCount = group.blockedBy.filter((e) => e.ref.doneAt === null).length
  const blockingCount = group.blocking.length
  const openBlockingCount = group.blocking.filter((e) => e.ref.doneAt === null).length
  const relatedCount = group.related.length
  const isBlocked = openBlockedByCount > 0
  return {
    isBlocked,
    isReady: !isBlocked,
    openBlockedByCount,
    blockedByCount,
    openBlockingCount,
    blockingCount,
    relatedCount,
  }
}

/**
 * AI prompt 行 / UI badge 用の 1 行 summary。
 *
 * 例:
 *  - 依存ゼロ + blocking ゼロ → "依存なし"
 *  - 全 blocker 完了 + blocking 2 件 → "依存解決済み / 後続 2 件"
 *  - blocker 1 件残り + 後続 0 件 → "前提 1 件未完了 (3 件中)"
 *  - blocker 残り + 後続 + 関連 → "前提 1 件未完了 (3 件中) / 後続 2 件 / 関連 1 件"
 *
 * count=0 の section は省略 (= AI prompt の bloat 防止)。
 */
export function formatDependencyReadiness(r: DependencyReadiness): string {
  const parts: string[] = []
  if (r.blockedByCount === 0) {
    if (r.blockingCount === 0 && r.relatedCount === 0) return '依存なし'
  } else if (r.openBlockedByCount > 0) {
    parts.push(`前提 ${r.openBlockedByCount} 件未完了 (${r.blockedByCount} 件中)`)
  } else {
    parts.push('依存解決済み')
  }
  if (r.blockingCount > 0) {
    if (r.openBlockingCount === r.blockingCount) {
      // 全部 open: シンプルに "後続 N 件"
      parts.push(`後続 ${r.blockingCount} 件`)
    } else if (r.openBlockingCount === 0) {
      // 全部 done: "後続 N 件 (全完了)"
      parts.push(`後続 ${r.blockingCount} 件 (全完了)`)
    } else {
      // 一部 open: "後続 K 件未完了 (N 件中)"
      parts.push(`後続 ${r.openBlockingCount} 件未完了 (${r.blockingCount} 件中)`)
    }
  }
  if (r.relatedCount > 0) {
    parts.push(`関連 ${r.relatedCount} 件`)
  }
  return parts.length === 0 ? '依存なし' : parts.join(' / ')
}
