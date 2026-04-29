/**
 * iter359 ai-automation: 進行中 (status === 'in_progress') だが一定期間 updatedAt が
 * 動いていない「stuck WIP」を抽出する pure helper。
 *
 * stale-items (iter299) が「未 done な item で updatedAt が古い」全般を対象にするのに
 * 対し、本 helper は **WIP に絞り込む**。「ユーザが意図的に着手して in_progress に
 * 移したのに、その後 N 日触られていない」= 計画上の "止まり" signal。stale-items より
 * 短い閾値 (default 3 日) で早期警告できる。wip-by-priority (iter354) は件数 / priority
 * 分布のみで age を持たないので、本 helper が age 軸を埋める。
 *
 * 仕様:
 *   - 集計対象: status === 'in_progress' && doneAt == null && archivedAt == null
 *   - updatedAt が `today - thresholdDays` より古いもののみ抽出 (default 3 日)
 *   - updatedAt が null/undefined/不正値/未来時刻 → 除外 (fail-soft)
 *   - 並び: stuckDays 降順 (= 最も停滞しているものが先頭)、tie で元配列順 stable
 *
 * caller benefits:
 *   - AI 朝 brief 「進行中だが停滞: 3 件 (タスクA 5日 / タスクB 4日)」
 *   - pm-agent watch list の「再開 nudge 候補」
 *   - dashboard widget で WIP-bias chip 隣に WIP-stuck chip
 */

import { parseDateOrNull } from '@/lib/date/iso'

export interface StuckWipFields {
  id?: string
  title?: string
  status: string | null | undefined
  updatedAt: Date | string | null | undefined
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
}

export interface StuckWipEntry<T extends StuckWipFields> {
  item: T
  /** updatedAt から today までの経過日数 (天井丸めでなく Math.floor) */
  stuckDays: number
}

export interface SelectStuckWipOptions {
  /** stuck と見なす updatedAt 経過日数の閾値。default 3 (= 半週間放置) */
  thresholdDays?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function selectStuckWipItems<T extends StuckWipFields>(
  items: readonly T[],
  options: SelectStuckWipOptions = {},
  today: Date | string = new Date(),
): StuckWipEntry<T>[] {
  const thresholdDays = options.thresholdDays ?? 3
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []

  const enriched: { entry: StuckWipEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.status !== 'in_progress') continue
    if (it.doneAt || it.archivedAt) continue
    const updatedAt = parseDateOrNull(it.updatedAt)
    if (!updatedAt) continue
    const diffMs = todayDate.getTime() - updatedAt.getTime()
    if (diffMs < 0) continue
    const stuckDays = Math.floor(diffMs / DAY_MS)
    if (stuckDays < thresholdDays) continue
    enriched.push({ entry: { item: it, stuckDays }, index: i })
  }
  enriched.sort((a, b) => {
    if (b.entry.stuckDays !== a.entry.stuckDays) return b.entry.stuckDays - a.entry.stuckDays
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'進行中だが停滞: 3 件 (タスクA 5 日 / タスクB 4 日 / タスクC 3 日)'`
 *   `'進行中だが停滞: 5 件 (タスクA 7 日 / タスクB 5 日 / タスクC 4 日 / 他 2 件)'` (limit=3 時)
 *   `'進行中だが停滞 0 件'` (空)
 *
 * `entries` は `selectStuckWipItems` の結果をそのまま渡す想定。`limit` は表示する
 * title 上位件数、残りは "他 N 件" でまとめる。title 欠落は `(無題)` fallback。
 */
export function formatStuckWipSummaryJa<T extends StuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return '進行中だが停滞 0 件'
  const head = entries.slice(0, Math.max(0, limit))
  const rest = entries.length - head.length
  const parts = head.map((e) => {
    const title =
      typeof e.item.title === 'string' && e.item.title.length > 0 ? e.item.title : '(無題)'
    return `${title} ${e.stuckDays} 日`
  })
  if (rest > 0) parts.push(`他 ${rest} 件`)
  return `進行中だが停滞: ${entries.length} 件 (${parts.join(' / ')})`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'severe' (= 7 日以上 stuck な WIP が 1 件以上)
 *  - 'mild' (= stuck WIP が 1 件以上、ただし全て 7 日未満)
 *  - 'idle' (= stuck WIP 0 件)
 */
export type StuckWipSeverity = 'severe' | 'mild' | 'idle'

export function stuckWipSeverity<T extends StuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
): StuckWipSeverity {
  if (entries.length === 0) return 'idle'
  if (entries.some((e) => e.stuckDays >= 7)) return 'severe'
  return 'mild'
}
