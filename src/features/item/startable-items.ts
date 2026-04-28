/**
 * iter304 ai-automation: 「今日着手可能 (startable) な item」を 1 関数で抽出する pure helper。
 *
 * iter294 (must-risk 焦り) / iter299 (stale-items 放置) / iter302 (freshly-done 達成) /
 * iter302 並走 (velocity ペース) と並ぶ AI 朝 brief substrate 第 5 弾。
 *
 * 「着手可能」の定義 (heuristic):
 *  - `doneAt` / `archivedAt` どちらも null (= 完了 / archive 済は除外)
 *  - `status` が `cancelled` ではない (default で除外)
 *  - `startDate` が未指定、または `today` 以前 (= 「未来日付の予定」は除外)
 *  - 既存 `blocked` status は除外 (blockers に縛られている item は今日始められない)
 *
 * 戻り値は urgency 降順で並ぶ (= 急ぎなものが先頭)、同 urgency は元配列順で stable。
 * 上限は `limit` で切り詰め可能 (default = 全件)。
 *
 * AI 朝 brief / pm-agent / dashboard widget が「今日やる候補」を `staticItems` から
 * 1 関数で取り出せ、urgency / due-proximity / must-risk と組合わせて proactive な提案
 * (例: "今日 3 件着手可能、うち MUST 1 / 期限切れ 1") が組み立てられる。
 */
import { computeUrgency, type UrgencyFields } from './urgency'

/** 着手可能性判定に必要な Item の structural subset。 */
export interface StartableItemFields extends UrgencyFields {
  status: string
  startDate: string | null | undefined
}

export interface SelectStartableItemsOptions {
  /** 戻り値件数の上限 (default = 全件) */
  limit?: number
  /** 着手不能と見なす status (default `['cancelled', 'blocked']`) */
  excludeStatuses?: readonly string[]
}

const DEFAULT_EXCLUDE_STATUSES = ['cancelled', 'blocked'] as const

export function selectStartableItems<T extends StartableItemFields>(
  items: readonly T[],
  options: SelectStartableItemsOptions = {},
  today: Date = new Date(),
): T[] {
  const limit = options.limit
  const excludeStatuses = options.excludeStatuses ?? DEFAULT_EXCLUDE_STATUSES
  const todayBase = startOfDayLocal(today)
  const todayISO = formatISOLocal(todayBase)

  const enriched: { item: T; index: number; urgency: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.doneAt || it.archivedAt) continue
    if (excludeStatuses.includes(it.status)) continue
    if (it.startDate && it.startDate > todayISO) continue
    enriched.push({ item: it, index: i, urgency: computeUrgency(it, todayBase) })
  }
  enriched.sort((a, b) => {
    if (b.urgency !== a.urgency) return b.urgency - a.urgency
    return a.index - b.index
  })
  const result = enriched.map((e) => e.item)
  return typeof limit === 'number' && limit >= 0 ? result.slice(0, limit) : result
}

/**
 * AI prompt 用 1 行サマリ:
 *   `着手可能 5 件: A (p1) / B (p2) / C (p3) / ...`
 * limit 指定 (top N) を受けたら limit 件まで title を並べる。残件は `他 K 件` で表示。
 * 0 件は `'着手可能 0 件 (該当なし)'` sentinel。title 欠落 `(無題)` fallback。
 */
export function formatStartableItemsSummary<T extends StartableItemFields & { title?: string }>(
  items: readonly T[],
  showTop: number = 5,
): string {
  if (items.length === 0) return '着手可能 0 件 (該当なし)'
  const head = items.slice(0, Math.max(0, showTop))
  const rest = items.length - head.length
  const parts = head.map((it) => {
    const title = it.title ?? '(無題)'
    return `${title} (p${it.priority ?? 4})`
  })
  if (rest > 0) parts.push(`他 ${rest} 件`)
  return `着手可能 ${items.length} 件: ${parts.join(' / ')}`
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatISOLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
