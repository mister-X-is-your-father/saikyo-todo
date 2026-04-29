/**
 * iter412 ai-automation: workspace 横断で「いま blocked になっている Item」を返す pure helper。
 *
 * 既存資産:
 *  - `summarizeDependencyReadiness` (readiness.ts) は **1 Item 単位** の readiness を返す
 *    ItemDependencyGroup 入力。caller は ItemEditDialog 等で 1 件ずつ判定する用途。
 *  - `useWorkspaceBlocksDependencies` (hooks.ts) は workspace の `blocks` edges を返すが
 *    `{fromItemId, toItemId}` のみで「対象 Item の title / どの blocker が未完了か」は持たない。
 *
 * 本 helper は (Items + edges) を pure に組み合わせて「blocked Item の上位リスト」を返す。
 * AI 朝 brief / pm-agent prompt / dashboard widget が以下の文言を 1 関数で出せる:
 *
 *   "blocked 3 件: リリース準備 [3 件待ち] / 報告書 [1 件待ち] / 他 1 件"
 *
 * iter379 (must-overdue) / iter382 (overdue-active) / iter407 (slip-days) /
 * iter409 (stale-items) と並ぶ「title list with overflow」 substrate シリーズ
 * の dependency 軸版。formatTopWithOverflow を委譲して overflow tail を統一。
 */
import { formatTopWithOverflow, titleOrUntitled } from '@/lib/format-list'

import {
  formatPriorityBucketsLabeled,
  normalizePriority,
  type PriorityKey,
} from '@/features/item/priority'

export interface WorkspaceBlockedItem {
  itemId: string
  title: string
  /** 未完了 blocker (前提) の件数 (>= 1) */
  openBlockerCount: number
  /** 前提の総件数 (= openBlockerCount + 完了済 blocker の件数) */
  totalBlockerCount: number
  /** Item.priority を 1-4 に正規化したもの (null/未設定は 4 へ集約) */
  priority: PriorityKey
}

interface ItemFields {
  id: string
  title: string
  doneAt: Date | null
  deletedAt?: Date | null
  priority?: number | null
}

interface BlockEdge {
  fromItemId: string
  toItemId: string
}

/**
 * `items` から `blocksEdges` を辿り、「未完了 blocker が 1 件以上残っている Item」を抽出。
 *
 * 仕様:
 *  - `deletedAt != null` の Item / 自分自身が `doneAt != null` の Item は除外
 *  - blocker (fromItem) が `deletedAt != null` または `doneAt != null` なら open に数えない
 *  - `openBlockerCount === 0` (= 全 blocker 完了) は結果に含めない
 *  - 並びは `openBlockerCount desc` → `title` 昇順 (ja) で stable
 *  - 1 同 (toItemId, fromItemId) edge が複数回現れても重複加算しない (= edge は normalize 済前提)
 */
export function pickWorkspaceBlockedItems<I extends ItemFields>(
  items: readonly I[],
  blocksEdges: readonly BlockEdge[],
): WorkspaceBlockedItem[] {
  const itemMap = new Map<string, I>()
  for (const it of items) {
    if (it.deletedAt != null) continue
    itemMap.set(it.id, it)
  }

  const byTarget = new Map<string, { open: number; total: number }>()
  for (const edge of blocksEdges) {
    const target = itemMap.get(edge.toItemId)
    if (!target) continue
    if (target.doneAt != null) continue
    const blocker = itemMap.get(edge.fromItemId)
    if (!blocker) continue
    const cur = byTarget.get(edge.toItemId) ?? { open: 0, total: 0 }
    cur.total += 1
    if (blocker.doneAt == null) cur.open += 1
    byTarget.set(edge.toItemId, cur)
  }

  const result: WorkspaceBlockedItem[] = []
  for (const [toId, counts] of byTarget) {
    if (counts.open === 0) continue
    const target = itemMap.get(toId)
    if (!target) continue
    result.push({
      itemId: toId,
      title: target.title,
      openBlockerCount: counts.open,
      totalBlockerCount: counts.total,
      priority: normalizePriority(target.priority),
    })
  }
  result.sort((a, b) => {
    if (a.openBlockerCount !== b.openBlockerCount) {
      return b.openBlockerCount - a.openBlockerCount
    }
    return a.title.localeCompare(b.title, 'ja')
  })
  return result
}

/**
 * AI brief / dashboard chip 用の 1 行 summary。
 *
 *   - 0 件 → `'blocked 0 件'`
 *   - 1+ 件 → `'blocked N 件: A [3 件待ち] / B [1 件待ち] / 他 K 件'`
 *   - title 欠落 (空文字) は `'(無題)'` に正規化
 *   - limit 超過は formatTopWithOverflow で `' / 他 K 件'` を append (default limit=3)
 */
export function formatBlockedItemsBriefJa(
  blocked: readonly WorkspaceBlockedItem[],
  limit: number = 3,
): string {
  if (blocked.length === 0) return 'blocked 0 件'
  const body = formatTopWithOverflow(
    blocked,
    (b) => `${titleOrUntitled(b.title)} [${b.openBlockerCount} 件待ち]`,
    limit,
  )
  return `blocked ${blocked.length} 件: ${body}`
}

/**
 * iter414 ai-automation: blocked items を priority 別 stat にバケット化する pure helper。
 *
 * iter386 (must-overdue) / iter391 (must-stuck-wip) / iter406 (must-stale) /
 * iter408 (slip-days) と並ぶ「× priority」軸 — dependency-blocked 軸版。
 * dashboard chip の aria-label / title (= SR / hover 経路) で「priority breakdown」を
 * 出すための substrate。
 *
 * 仕様:
 *  - blocked Item を `priority` (1-4) で bucket 化 (PRIORITY_ORDER 不変)
 *  - 各 bucket の `count` (= 該当 blocked Item 数) と `maxOpenBlockerCount`
 *    (= bucket 内最大の openBlockerCount、count=0 なら null)
 *  - 全 priority 0 件 / count = 0 でも全 4 bucket は必ず初期化
 */
export interface BlockedItemsPriorityStats {
  count: number
  /** 該当 priority bucket 内最大の openBlockerCount (count=0 なら null) */
  maxOpenBlockerCount: number | null
}

export type BlockedItemsByPriority = Record<PriorityKey, BlockedItemsPriorityStats>

export function computeBlockedItemsByPriority(
  blocked: readonly WorkspaceBlockedItem[],
): BlockedItemsByPriority {
  const result: BlockedItemsByPriority = {
    1: { count: 0, maxOpenBlockerCount: null },
    2: { count: 0, maxOpenBlockerCount: null },
    3: { count: 0, maxOpenBlockerCount: null },
    4: { count: 0, maxOpenBlockerCount: null },
  }
  for (const b of blocked) {
    const bucket = result[b.priority]
    bucket.count += 1
    if (bucket.maxOpenBlockerCount === null || b.openBlockerCount > bucket.maxOpenBlockerCount) {
      bucket.maxOpenBlockerCount = b.openBlockerCount
    }
  }
  return result
}

/**
 * AI prompt / dashboard chip aria-label 用の priority 別 1 行サマリ:
 *
 *   `'依存ブロック: P1 1 件 (最大 3 件待ち) / P3 2 件 (最大 1 件待ち)'`
 *
 * count=0 の bucket は省略。全 priority count=0 → `'依存ブロック 0 件'`。
 * iter386 (must-overdue) / iter408 (slip-days) と同じ '{label}: P1 ... / P3 ...'
 * 形式で SR / hover の長 label が一貫する。
 */
export function formatBlockedItemsByPriorityJa(byPriority: BlockedItemsByPriority): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, s) =>
      s.count === 0 || s.maxOpenBlockerCount === null
        ? null
        : `P${k} ${s.count} 件 (最大 ${s.maxOpenBlockerCount} 件待ち)`,
    '依存ブロック',
    '依存ブロック 0 件',
  )
}
