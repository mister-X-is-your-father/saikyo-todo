/**
 * Item 優先度の表示用ヘルパ。
 *
 * Today / Inbox view の priority dot で重複していた `PRIO_DOT` map を集約。
 * SR 用の日本語ラベル `priorityLabel` も同梱 (アクセシビリティ強化のため
 * dot に aria-label として付与する想定)。
 */
import { formatNonZeroCounts } from '@/lib/format-counts'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

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
 * iter527 ai-automation: priority → 5 段階 共通 Severity bridge。
 * iter519 / iter524-526 と同 pattern。`PRIO_DOT_CLASS` の visual semantic
 * (red/amber/blue/slate) と完全整合:
 *
 *   p1 (最優先) → 'danger' (赤、bg-red-500)
 *   p2 (高)     → 'warn'   (黄、bg-amber-500)
 *   p3 (中)     → 'info'   (青、bg-blue-500)
 *   p4 (低)     → 'muted'  (グレー、bg-slate-400)
 *
 * null/undefined/範囲外は p4 (低) と同じ muted に集約 (priorityClass / priorityLabel と同じ
 * フォールバック)。SeverityChip / Slack 通知 / SR aria-label / AI prompt の chip 配色を
 * 1 関数で統一可能。
 *
 * `lib/widget/severity-bridges.ts` (assigneeLoad / PdcaPhase 既存の bridge 集約 file)
 * との整合: `Severity` 型は同源、bridge を本 file (= priority のドメインに近い) に置く
 * のは「caller が priority.ts を import するついでに severity が取れる」 ergonomic 優先。
 */
const PRIORITY_SEVERITY: Record<PriorityKey, Severity> = {
  1: 'danger',
  2: 'warn',
  3: 'info',
  4: 'muted',
}

export function prioritySeverity(p: number | null | undefined): Severity {
  return PRIORITY_SEVERITY[normalizePriority(p)]
}

/**
 * iter533 ai-automation: `Record<PriorityKey, number>` (priority 別件数) を
 * `Record<Severity, number>` (5 段 severity 別件数) に集約する pure helper。
 *
 * 用途: priority 別件数を `formatSeverityCountsJa` (lib/widget/severity.ts、iter532) に
 * 渡して 1 行 severity サマリ (「危険 3 / 注意 1 / 情報 2 / なし 4 (合計 10)」) を
 * AI prompt / Slack 通知 / dashboard summary に出すための bridge。
 *
 * 各 priority は `prioritySeverity` (iter527) で対応 severity に集約 (p1→danger /
 * p2→warn / p3→info / p4→muted)、'ok' は priority bucket には出ない (priority は
 * 「重要度」 軸であり「達成度」軸ではない)。
 *
 * 例: {1: 3, 2: 1, 3: 2, 4: 4} → {danger: 3, warn: 1, info: 2, muted: 4, ok: 0}
 */
// iter1694 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1687-1693 (due-proximity / goal-health / bias / recovery-plan / ai-assignee / forecast /
// retro-completion) に続く外部 file 追従の **最終 9 件目**。iter1430 推奨の status-visual
// (iter1433) + 6 関数追従が全完了。
// 同 iter で `aggregateCountsBySeverity` を `K extends PropertyKey` に汎用化、number key の
// `PriorityKey = 1|2|3|4` も identity mapping で扱えるように。`PRIORITY_SEVERITY` の domain
// mapping (p1→danger / p2→warn / p3→info / p4→muted) は本 file 責務、boilerplate (PRIORITY_ORDER
// 走査 + 空 Record + for-loop + ?? 0) を 1 行委譲に縮約。inline tuple type を共通 Severity 型に統一。
export function priorityCountsToSeverityCounts(
  counts: Record<PriorityKey, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, (k) => PRIORITY_SEVERITY[k])
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
 * iter425 refactor: dashboard chip の「priority breakdown を bucket > 1 の時だけ
 * append」 pattern を集約。8 callsite で `bucket > 1 ? ' — ${formatter}' : ''` の
 * 同 shape 三項演算子が散在していたので 1 関数に集約 (= iter325 / iter330 / ... /
 * iter420 と同じ「同 shape の散在を 1 file に」方針 28 弾目)。
 *
 * 仕様:
 *  - bucket > 1 (= 複数 priority に分散) の時のみ ` — ${formatter()}` を返す
 *  - bucket <= 1 (= 0件 or 単一 priority 偏在) は空文字 (= 冗長省略)
 *  - separator はハードコード ' — '、prefix が空文字の (' — '+detail) と
 *    フル replace の (`${summary} — ${detail}`) の両方の callsite に対応する
 *    suffix-only API
 *
 * caller usage:
 *   const detail = `${summary}${priorityDetailSuffix(buckets, () => formatBy(byP))}`
 *
 * formatter は遅延 evaluation (= bucket <= 1 なら呼ばれない、format cost 回避)。
 */
export function priorityDetailSuffix(bucketCount: number, formatter: () => string): string {
  return bucketCount > 1 ? ` — ${formatter()}` : ''
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

/**
 * iter440 refactor: priority 4-key Record の 4 行明示初期化 pattern を 1 関数に集約。
 * 6 callsite (at-risk-parents / parent-items-progress / recent-completed /
 * freshly-done / blocked-items / completion-days-by-priority) で同 shape の
 * 4 行 literal `{1: factory(), 2: factory(), 3: factory(), 4: factory()}` が散在
 * していたので 1 関数に集約 (= iter325 / iter330 / ... / iter435 と同じ「同 shape の
 * 散在を 1 file に」方針 31 弾目)。
 *
 * factory は **bucket ごとに新インスタンス** を返すべき (= mutable state を共有しない
 * よう、全 callsite が後で push / accumulate する)。`initPriorityRecord(() => ({...}))`
 * の lambda は 4 回呼ばれるので各回 fresh object。
 *
 * 既存 `bucketByPriorityWith(items, compute)` は items + per-group compute 用なので
 * 別 API。本 helper は pre-init (= 空 record を作るだけ) 専用、後で外側 loop で
 * accumulate する pattern に使う。
 */
export function initPriorityRecord<T>(factory: () => T): Record<PriorityKey, T> {
  return { 1: factory(), 2: factory(), 3: factory(), 4: factory() }
}

/**
 * iter435 refactor: 「formatPriorityBuckets の出力を `${prefix}: ${body}` で wrap、
 * empty sentinel ならそのまま返す」 pattern を集約。slip-days / at-risk-parents /
 * parent-items-progress / recent-completed / blocked-items の 5 callsite で同 shape
 * の `body === emptySentinel ? body : \`${prefix}: ${body}\`` 三項演算子が散在して
 * いたので 1 関数に集約 (= iter325 / iter330 / ... / iter430 と同じ「同 shape の
 * 散在を 1 file に」方針 30 弾目)。
 *
 * 仕様:
 *  - body = formatPriorityBuckets(byPriority, formatBucket, emptySentinel)
 *  - body が emptySentinel と等しい (= 全 bucket null) → emptySentinel をそのまま返す
 *  - それ以外 → `${prefix}: ${body}` (separator はハードコード ': ')
 *
 * 用途: parent-items-progress のように prefix ('進行中') と sentinel '進行中の案件 0 件'
 * の文言が非対称な callsite も対応 (prefix と emptySentinel を独立に渡せる)。
 *
 * caller usage:
 *   formatPriorityBucketsLabeled(byP, (k, s) => ..., '触れていない案件', '触れていない案件 0 件')
 *
 * 出力:
 *   '触れていない案件: P1 1 件 (最大 14日) / P3 2 件 (最大 8日)' (= 1+ entry)
 *   '触れていない案件 0 件' (= 全 bucket null)
 */
export function formatPriorityBucketsLabeled<S>(
  byPriority: Record<PriorityKey, S>,
  formatBucket: (k: PriorityKey, s: S) => string | null,
  prefix: string,
  emptySentinel: string,
): string {
  const body = formatPriorityBuckets(byPriority, formatBucket, emptySentinel)
  return body === emptySentinel ? body : `${prefix}: ${body}`
}
