/**
 * iter532 ai-automation (queue: fluffy-5 recovery → similar-history substrate):
 * 過去の類似 (同 tag / 同 assignee) overdue MUST item から「平均挽回時間」と
 * 「典型 slip 日数」を抽出する pure helper。
 *
 * fluffy 撲滅原則:
 *   - AI に「過去事例から類推して〜」 文章を書かせない (= 一般論 fluffy)
 *   - 実 data から「同 tag の過去 overdue MUST: 平均 4 日遅れで完了 (5 件)」を deterministic に出す
 *   - 救済プラン widget の「reasonable 期限再設定」算出に直接 bind
 *
 * 仕様:
 *   - 入力: items 配列 + target item (= 救済対象、overdue MUST 想定) + tagId / assigneeId 情報
 *   - 「類似」 = target と少なくとも 1 つ tag を共有 OR 1 つ assignee を共有
 *   - 集計対象 = 類似 item の中で done 済 + 過去 overdue (= doneAt > dueDate)
 *   - 出力: SlipDaysStats (computeSlipDays に委譲) + similarItemCount (= 類似 item 全件、done 含む)
 *
 * caller benefits:
 *   - 救済プラン widget で「過去類似 5 件、平均 4 日遅れで完了 → 期限+5 日が現実的」 1 行
 *   - AI prompt 「同 tag の overdue MUST は 平均 X 日遅れで完了」を 1 関数で
 *
 * AI 不使用、副作用無し。pure helper + Vitest 単体 test で網羅。
 */
import { computeSlipDays, type SlipDaysFields, type SlipDaysStats } from './slip-days'

export interface SimilarHistoryItemFields extends SlipDaysFields {
  id: string
  isMust?: boolean | null | undefined
  /** 本 item に紐付く tag id 配列。caller が item_tags から事前抽出 (空 = tag なし) */
  tagIds?: readonly string[] | null | undefined
  /** 本 item に紐付く assignee user id 配列 (空 = 未割当) */
  assigneeIds?: readonly string[] | null | undefined
}

export interface SimilarMustHistoryStats {
  /** 類似 (同 tag or 同 assignee) item の全件数。done / active / cancelled 含む */
  similarItemCount: number
  /** 類似 item の中で done 済 + overdue (= doneAt > dueDate) の slip 集計 */
  slipStats: SlipDaysStats
}

const EMPTY: SimilarMustHistoryStats = {
  similarItemCount: 0,
  slipStats: { count: 0, avgDays: null, medianDays: null, maxDays: null },
}

function intersectsAny(
  a: readonly string[] | null | undefined,
  b: readonly string[] | null | undefined,
): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false
  for (const x of a) {
    if (b.includes(x)) return true
  }
  return false
}

export function computeSimilarMustHistory<T extends SimilarHistoryItemFields>(
  items: readonly T[],
  target: T,
): SimilarMustHistoryStats {
  if (!target) return EMPTY
  const targetTags = target.tagIds ?? []
  const targetAssignees = target.assigneeIds ?? []
  if (targetTags.length === 0 && targetAssignees.length === 0) return EMPTY

  const similar: T[] = []
  for (const it of items) {
    if (!it) continue
    if (it.id === target.id) continue
    // MUST 限定 (= 「同じ重要度の過去履歴」だけ参考にする、軽い task の slip は基準にならない)
    if (it.isMust !== true) continue
    const sameTag = intersectsAny(it.tagIds, targetTags)
    const sameAssignee = intersectsAny(it.assigneeIds, targetAssignees)
    if (sameTag || sameAssignee) similar.push(it)
  }

  if (similar.length === 0) return EMPTY
  const slipStats = computeSlipDays(similar)
  return { similarItemCount: similar.length, slipStats }
}

/**
 * AI prompt / chip aria-label / 救済プラン widget 用 1 行 summary:
 *   '類似 5 件中 過去 overdue 3 件 (平均 4日 / 中央値 3日 / 最大 12日)'
 *   '類似 0 件 (履歴なし)' (= similarItemCount=0)
 *   '類似 5 件 (過去 overdue なし)' (= similar あるが slip 0 件)
 */
export function formatSimilarMustHistoryJa(stats: SimilarMustHistoryStats): string {
  if (stats.similarItemCount === 0) return '類似 0 件 (履歴なし)'
  if (stats.slipStats.count === 0) {
    return `類似 ${stats.similarItemCount} 件 (過去 overdue なし)`
  }
  if (stats.slipStats.count === 1) {
    return `類似 ${stats.similarItemCount} 件中 過去 overdue 1 件 (${stats.slipStats.maxDays}日)`
  }
  return (
    `類似 ${stats.similarItemCount} 件中 過去 overdue ${stats.slipStats.count} 件 ` +
    `(平均 ${stats.slipStats.avgDays}日 / 中央値 ${stats.slipStats.medianDays}日 / ` +
    `最大 ${stats.slipStats.maxDays}日)`
  )
}
