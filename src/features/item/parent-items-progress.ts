/**
 * iter419 ai-automation: workspace 内「子を持つ未完了 parent」の進捗 list を返す pure helper。
 *
 * iter417 で追加した `summarizeDescendantsProgress` (1 parent 単位) を全 workspace に
 * scale up した workspace-axis 版。AI 朝 brief / pm-agent prompt / dashboard widget が
 * 「いま動いている案件 (= parent task with children) の進捗 list」を 1 関数で出せる。
 *
 *   '進行中: A 30% (3/10) / B 60% (6/10) / 他 2 件'
 *
 * iter379 (must-overdue) / iter382 (overdue-active) / iter407 (slip-days) / iter409
 * (stale-items) / iter412 (blocked-items) と並ぶ「title list with overflow」 substrate
 * シリーズの **parent-items-progress 軸** (= 6 軸目)。formatTopWithOverflow を委譲。
 *
 * 仕様:
 *  - 「parent」 = 子 (descendants) を 1 件以上持つ item (= total >= 1)
 *  - 「未完了」 = isComplete === false (= まだ全 done に達していない)
 *  - parent 自身が `deletedAt != null` または `doneAt != null` でも、子孫の進捗は
 *    集計対象 (parent done でも残子孫があれば「親は done だが子孫は未完了」を見せたい)
 *  - 並び: pctDone 昇順 (= 進捗が遅い案件を先に見せる、最も注意が必要な順)、
 *    tie で title 昇順 (ja)
 */
import { formatTopWithOverflow, titleOrUntitled } from '@/lib/format-list'

import { type DescendantsProgress, summarizeDescendantsProgress } from './descendants-progress'

export interface ParentItemProgress<I> {
  parent: I
  progress: DescendantsProgress
}

interface ParentItemFields {
  id: string
  title: string
  parentPath: string
  status: string | null | undefined
  deletedAt?: Date | null
}

/**
 * `allItems` から「子を持つ未完了 parent」を抽出。
 *
 * - 各 candidate parent について `summarizeDescendantsProgress` で集計
 * - `progress.total === 0` (= 子孫ゼロ = 末端 task) は除外
 * - `progress.isComplete === true` (= 全 done = 達成済) は除外
 * - 並びは `pctDone` 昇順 → `parent.title` 昇順 (ja)
 * - parent 自身が `deletedAt != null` の場合は除外 (= 削除された parent は表示しない)
 */
export function pickIncompleteParentItems<I extends ParentItemFields>(
  allItems: readonly I[],
): ParentItemProgress<I>[] {
  const result: ParentItemProgress<I>[] = []
  for (const candidate of allItems) {
    if (candidate.deletedAt != null) continue
    const progress = summarizeDescendantsProgress(
      { id: candidate.id, parentPath: candidate.parentPath },
      allItems,
    )
    if (progress.total === 0) continue
    if (progress.isComplete) continue
    result.push({ parent: candidate, progress })
  }
  result.sort((a, b) => {
    if (a.progress.pctDone !== b.progress.pctDone) {
      return a.progress.pctDone - b.progress.pctDone
    }
    return a.parent.title.localeCompare(b.parent.title, 'ja')
  })
  return result
}

/**
 * AI brief / dashboard chip 用の 1 行 summary。
 *
 *   - 0 件 → `'進行中の案件 0 件'`
 *   - 1+ 件 → `'進行中: A 30% (3/10) / B 60% (6/10) / 他 K 件'`
 *   - title 欠落 (空文字) は `'(無題)'` に正規化
 *   - limit 超過は formatTopWithOverflow で `' / 他 K 件'` を append (default limit=3)
 */
export function formatParentItemsProgressBriefJa<I extends ParentItemFields>(
  entries: readonly ParentItemProgress<I>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return '進行中の案件 0 件'
  const body = formatTopWithOverflow(
    entries,
    (e) =>
      `${titleOrUntitled(e.parent.title)} ${e.progress.pctDone}% (${e.progress.done}/${e.progress.total})`,
    limit,
  )
  return `進行中: ${body}`
}
