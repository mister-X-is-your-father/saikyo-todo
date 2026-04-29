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
import { formatTopWithOverflow } from '@/lib/format-list'

export interface WorkspaceBlockedItem {
  itemId: string
  title: string
  /** 未完了 blocker (前提) の件数 (>= 1) */
  openBlockerCount: number
  /** 前提の総件数 (= openBlockerCount + 完了済 blocker の件数) */
  totalBlockerCount: number
}

interface ItemFields {
  id: string
  title: string
  doneAt: Date | null
  deletedAt?: Date | null
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
    (b) => {
      const title = b.title.length > 0 ? b.title : '(無題)'
      return `${title} [${b.openBlockerCount} 件待ち]`
    },
    limit,
  )
  return `blocked ${blocked.length} 件: ${body}`
}
