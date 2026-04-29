/**
 * Item 優先度の表示用ヘルパ。
 *
 * Today / Inbox view の priority dot で重複していた `PRIO_DOT` map を集約。
 * SR 用の日本語ラベル `priorityLabel` も同梱 (アクセシビリティ強化のため
 * dot に aria-label として付与する想定)。
 */
import { formatNonZeroCounts } from '@/lib/format-counts'

export const PRIO_DOT_CLASS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-blue-500',
  4: 'bg-slate-400',
}

const LABELS: Record<number, string> = {
  1: '最優先',
  2: '高',
  3: '中',
  4: '低',
}

export function priorityClass(p: number | null | undefined): string {
  return PRIO_DOT_CLASS[p ?? 4] ?? 'bg-slate-400'
}

/** 例: priorityLabel(1) → "優先度: 最優先 (p1)" */
export function priorityLabel(p: number | null | undefined): string {
  const v = p ?? 4
  const name = LABELS[v] ?? '低'
  return `優先度: ${name} (p${v})`
}

/**
 * iter292 ai-automation: AI brief / pm-agent / dashboard widget が「priority 別の
 * item 分布」を 1 関数で出せる substrate。due-proximity の `groupItemsByDueProximity`
 * / `countItemsByDueProximity` / `formatDueProximityCounts` と対称な API。
 *
 * 分類仕様:
 *  - priority は 1..4 の整数。null/undefined/範囲外は p4 (低) と同じバケットに集約
 *    (`priorityClass`/`priorityLabel` のフォールバックと一貫)。
 *  - 順序: 元配列順を保つ stable group (per-bucket 内も元順)。
 *  - 各 bucket は必ず空配列で初期化 — `groups[1].length` のような undefined チェック不要。
 */
export type PriorityKey = 1 | 2 | 3 | 4

export type PriorityGroups<T> = Record<PriorityKey, T[]>

/**
 * iter375 refactor: 全 by-priority helper / dashboard / format 用に共通の priority
 * 反復順序。`[1, 2, 3, 4] as const` の inline 散在を 1 source of truth に集約。
 */
export const PRIORITY_ORDER: readonly PriorityKey[] = [1, 2, 3, 4] as const

/**
 * iter344 ai-automation: 他 substrate (e.g. due-hit-rate-by-priority) から再利用
 * したいので export 化。挙動は変わらず: 1/2/3 はそのまま、null/undefined/範囲外は
 * p4 に集約。
 */
export function normalizePriority(p: number | null | undefined): PriorityKey {
  if (p === 1 || p === 2 || p === 3) return p
  return 4
}

export function groupItemsByPriority<T extends { priority: number | null | undefined }>(
  items: readonly T[],
): PriorityGroups<T> {
  const groups: PriorityGroups<T> = { 1: [], 2: [], 3: [], 4: [] }
  for (const it of items) {
    groups[normalizePriority(it.priority)].push(it)
  }
  return groups
}

/**
 * iter365 refactor: 「priority 別 bucket に分けて compute() を適用」のパターンを
 * 1 関数に集約。due-hit-rate / dod-coverage / due-date-coverage の各
 * `compute*ByPriority` で同 shape のコードが 3 重複していた。
 *
 * 仕様:
 *   - 入力: items + compute (1 bucket → R)
 *   - 出力: Record<PriorityKey, R> (各 bucket 必ず初期化、null/範囲外 priority は p4 集約)
 *   - 純粋関数、副作用なし、items 順序は bucket 内で stable
 */
export function bucketByPriorityWith<T extends { priority: number | null | undefined }, R>(
  items: readonly T[],
  compute: (group: readonly T[]) => R,
): Record<PriorityKey, R> {
  const groups = groupItemsByPriority(items)
  return {
    1: compute(groups[1]),
    2: compute(groups[2]),
    3: compute(groups[3]),
    4: compute(groups[4]),
  }
}

/**
 * iter370 refactor: priority bucket のうち実データ (total > 0) を持つ件数を返す
 * 汎用 helper。due-hit-rate.ts (iter346) に閉じていた `countNonEmptyPriorityBuckets`
 * を generic 化、4 by-priority substrate (due-hit-rate / dod-coverage /
 * due-date-coverage / description-coverage) で共通利用できるように。
 *
 * 0 = 全 priority 0 件 (= empty)、1 = 単一 priority 偏在 (breakdown 冗長)、
 * ≥2 = 複数 priority 分散 (breakdown 出す価値あり)。
 *
 * 引数は `Record<PriorityKey, {total: number}>` を満たす任意の by-priority stats。
 * dashboard chip の「priority breakdown を tooltip に出すか?」判定に使う。
 */
export function countNonEmptyPriorityBuckets(
  byPriority: Record<PriorityKey, { total: number }>,
): number {
  return PRIORITY_ORDER.filter((k) => byPriority[k].total > 0).length
}

export function countItemsByPriority(
  items: readonly { priority: number | null | undefined }[],
): Record<PriorityKey, number> {
  const counts: Record<PriorityKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const it of items) {
    counts[normalizePriority(it.priority)] += 1
  }
  return counts
}

/** AI prompt 行 / dashboard chip 用の 1 行 summary (件数 0 の bucket は省略)。 */
export function formatPriorityCounts(counts: Record<PriorityKey, number>): string {
  return formatNonZeroCounts(counts, PRIORITY_ORDER, LABELS)
}
