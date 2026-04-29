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
  return countNonEmptyPriorityBucketsBy(byPriority, (s) => s.total > 0)
}

/**
 * iter390 refactor: `countNonEmptyPriorityBuckets` の generic 化版。任意の
 * predicate (= 「empty とみなす条件」) で priority bucket を数える。
 *
 * dashboard chip の「priority breakdown を tooltip に出すか?」判定 (= 0/1/≥2 の
 * 3 値判定) は by-priority substrate ごとに「empty」の意味が違う:
 *  - due-hit-rate / coverage 系: `total === 0`
 *  - combined-hygiene: `score === null`
 *  - hygiene-debt: `debtCount === 0`
 *  - slip-days: `count === 0`
 *
 * 個別 substrate ごとに inline filter していたのを 1 generic に集約。
 * 既存 `countNonEmptyPriorityBuckets(stats)` は本 helper の wrapper として残す
 * (後方互換、`{total: number}` shape 専用の薄いショートカット)。
 */
export function countNonEmptyPriorityBucketsBy<T>(
  byPriority: Record<PriorityKey, T>,
  isNonEmpty: (v: T) => boolean,
): number {
  return PRIORITY_ORDER.filter((k) => isNonEmpty(byPriority[k])).length
}

/**
 * iter415 refactor: `countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)`
 * の薄いショートカット — `Record<PriorityKey, {count: number}>` shape 専用。
 *
 * 同じ predicate が dashboard-view.tsx 内で 8 callsite (must-overdue / must-stuck-wip /
 * must-stale / overdue-active / slip-days / stuck-wip / stale-urgent / blocked-items)
 * で重複していたので集約 (= iter325 / iter330 / ... / iter410 と同じ「同 shape の
 * 散在を 1 file に」方針 26 弾目)。`countNonEmptyPriorityBuckets` (`{total: number}`
 * 用) と対称な API。各 substrate の by-priority stats が「count > 0 = 該当あり」の
 * shape (slip-days / must-overdue / must-stuck-wip / must-stale / blocked-items 等)
 * を共通に拾える。
 */
export function countNonEmptyCountPriorityBuckets(
  byPriority: Record<PriorityKey, { count: number }>,
): number {
  return countNonEmptyPriorityBucketsBy(byPriority, (s) => s.count > 0)
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

/**
 * iter370 refactor: by-priority bucket を「P1 X 件 (...) / P2 Y 件 (...)」形式の
 * 1 行 summary に整形する汎用 helper。
 *
 * 同 shape のループが 5 callsite (wip-stuck / stale-urgent / overdue-active /
 * slip-days / backlog-aging の各 by-priority format 関数) で重複していたので集約。
 *
 * 仕様:
 *   - PRIORITY_ORDER (= 1..4) を順番に走査
 *   - 各 bucket で `formatBucket(k, s)` を呼び、戻り値が string なら `parts` に追加、
 *     null なら skip (= caller 判断で「該当なし bucket」を省略)
 *   - 全部 null なら `emptySentinel` を返す (= 「全 P が該当なし」 sentinel)
 *   - separator default ' / '
 *
 * caller benefits:
 *   - skip 条件 (count === 0 / rate === null / 等) を formatBucket 内で判断
 *   - bucket フォーマット (件数 + sub-detail) も formatBucket 内で自由
 *   - sentinel / prefix は caller 側で完結 (caller が `'遅延: ' + body` する場合は
 *     emptySentinel が返されたか判定して分岐)
 */
export function formatPriorityBuckets<S>(
  byPriority: Record<PriorityKey, S>,
  formatBucket: (k: PriorityKey, s: S) => string | null,
  emptySentinel: string,
  separator: string = ' / ',
): string {
  const parts: string[] = []
  for (const k of PRIORITY_ORDER) {
    const formatted = formatBucket(k, byPriority[k])
    if (formatted !== null) parts.push(formatted)
  }
  return parts.length === 0 ? emptySentinel : parts.join(separator)
}

/**
 * iter385 refactor: 「count > 0 + days != null で `P{k} {count} 件 ({label} {days}日)`」
 * 形式の by-priority format helper を 1 関数に集約 (= formatPriorityBuckets の特化版)。
 *
 * iter325 / iter330 / iter340 / iter345 / iter350 / iter355 / iter360 / iter365 / iter370 /
 * iter375 / iter380 と同じ「同 shape の散在を 1 file に」方針 20 弾目。must-overdue /
 * overdue-active / stale-urgent / wip-stuck の 4 callsite で全く同 shape の inline lambda
 * (`(k, s) => s.count > 0 && s.<daysField> !== null ? \`P${k} ${s.count} 件 (${label} ${days}日)\` : null`)
 * が重複していたので 1 関数に集約。
 *
 * accessor (`getCount` / `getDays`) で field 名差 (`oldestOverdueDays` / `oldestDays` /
 * `maxStuckDays`) を吸収、`daysLabel` で見出し差 ('最古' / '最長') を吸収。
 *
 * caller は 5 行から 1 行に縮む:
 *   formatPriorityBucketsCountWithDays(byP, s => s.count, s => s.oldestDays, '最古', '... 0 件')
 *
 * slip-days.ts (`'遅延: ' + body` wrap pattern) や backlog-aging.ts (count + ancient
 * 合算 pattern) は別 shape なので本 helper の対象外。
 */
export function formatPriorityBucketsCountWithDays<S>(
  byPriority: Record<PriorityKey, S>,
  getCount: (s: S) => number,
  getDays: (s: S) => number | null,
  daysLabel: string,
  emptySentinel: string,
): string {
  return formatPriorityBuckets(
    byPriority,
    (k, s) => {
      const count = getCount(s)
      const days = getDays(s)
      return count > 0 && days !== null ? `P${k} ${count} 件 (${daysLabel} ${days}日)` : null
    },
    emptySentinel,
  )
}
