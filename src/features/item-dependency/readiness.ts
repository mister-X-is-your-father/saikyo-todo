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

/**
 * iter411 basics: readiness を graphical chip 用 tone (色 / icon variant key /
 * 日本語 label) に変換する pure helper。
 *
 * `sprintProgressTone` (burndown.ts) / `goalHealthTier` (okr) と対称な API。
 * 今までは `item-dependencies-panel.tsx` 内に inline ternary で書かれており
 * unicode glyph (✓/⏸/·) を直書きしていたので、graphical 波及シリーズの一貫性
 * (status-badge / must-badge / sprint-progress 同様) を持たせるべく集約。
 *
 * tone:
 *  - `blocked`: 未完了の前提 1 件以上 (= isBlocked) → amber + Pause icon
 *  - `idle`: 依存ゼロ (前提 / 後続 / 関連 すべて 0 件) → zinc + Circle icon
 *  - `ready`: 依存解決済 or 後続/関連 のみ (= 自分は着手可能) → emerald + CircleCheck icon
 */
export type DependencyReadinessTone = 'blocked' | 'idle' | 'ready'

export type DependencyReadinessIconKey = 'check' | 'pause' | 'idle'

export interface DependencyReadinessVisual {
  tone: DependencyReadinessTone
  bgClass: string
  textClass: string
  ringClass: string
  iconKey: DependencyReadinessIconKey
  /** SR / aria-label / tooltip の補助 label (日本語) */
  toneLabel: string
}

// iter1539: dependency readiness 3 tone (blocked/idle/ready) は `bg-{color}-50
// text-{color}-{700,900} ring-{color}-200` で light 固定。iter1376/1493/1512-1538 chip dark
// sweep + central feature 7 件目 (notification iter1537 / audit iter1538 と同 pattern)。
// 各 visual に dark token 併記、テストは tone/iconKey logic のみで class string check なし。
const TONE_VISUAL: Record<DependencyReadinessTone, DependencyReadinessVisual> = {
  blocked: {
    tone: 'blocked',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    textClass: 'text-amber-900 dark:text-amber-200',
    ringClass: 'ring-amber-200 dark:ring-amber-900/50',
    iconKey: 'pause',
    toneLabel: 'ブロック中',
  },
  idle: {
    tone: 'idle',
    bgClass: 'bg-zinc-50 dark:bg-zinc-900/30',
    textClass: 'text-zinc-700 dark:text-zinc-300',
    ringClass: 'ring-zinc-200 dark:ring-zinc-700/50',
    iconKey: 'idle',
    toneLabel: '依存なし',
  },
  ready: {
    tone: 'ready',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    textClass: 'text-emerald-900 dark:text-emerald-200',
    ringClass: 'ring-emerald-200 dark:ring-emerald-900/50',
    iconKey: 'check',
    toneLabel: '着手可能',
  },
}

export function dependencyReadinessTone(r: DependencyReadiness): DependencyReadinessTone {
  if (r.isBlocked) return 'blocked'
  if (r.blockedByCount === 0 && r.blockingCount === 0 && r.relatedCount === 0) return 'idle'
  return 'ready'
}

export function getDependencyReadinessVisual(r: DependencyReadiness): DependencyReadinessVisual {
  return TONE_VISUAL[dependencyReadinessTone(r)]
}
