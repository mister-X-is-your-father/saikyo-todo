/**
 * iter287 ai-automation: Item の dueDate を「期限近接バケット」に分類する pure helper。
 *
 * AI brief / pm-agent / dashboard widget / UI EmptyState などが「この Item は
 * いつまでに?」を 1 関数で同じカテゴリに揃えられる substrate。今までは
 *   - `urgency.ts#dueProximityBonus` (private) が score 化
 *   - `today/build-groups.ts` が group 用に inline 分類
 *   - dashboard service が overdueCount を SQL 集計
 * と 3 系統で「期限切れ / 今日 / 明日 / 今週内」を別々に表現していたので、
 * client 側で再表現する場合 (AI prompt embed / item チップ表示) には毎回
 * 書き直す必要があった。
 *
 * バケット仕様 (urgency.ts と同じ閾値、score 重複は意図):
 *  - `overdue` — dueDate < today
 *  - `today`   — dueDate === today
 *  - `tomorrow` — dueDate === today+1
 *  - `thisWeek` — today+2 ≤ dueDate ≤ today+6 (= 6 日先まで)
 *  - `later`   — dueDate ≥ today+7
 *  - `noDate`  — dueDate が null/undefined/不正 ISO
 *
 * 注意:
 *  - `today` は Date or string、未指定 → new Date() (端末ローカル TZ)
 *  - 不正 ISO は `noDate` と同じ扱い (fail-soft)
 *  - `diffDays` は overdue で負、noDate で undefined
 */
import { MS_PER_DAY, parseIsoDateAsLocalMidnight, toLocalMidnight } from '@/lib/date/iso'
import { formatNonZeroCounts } from '@/lib/format-counts'
import { type ChipToneClasses, getChipToneClasses } from '@/lib/ui/chip-tone'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

export type DueProximityKind = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'noDate'

export interface DueProximity {
  kind: DueProximityKind
  /** dueDate - today (UTC 日数差)。noDate は undefined */
  diffDays: number | undefined
  /** UI 用の日本語短ラベル ("期限切れ" / "今日" / "明日" / "今週内" / "今後" / "未設定") */
  label: string
}

const LABEL: Record<DueProximityKind, string> = {
  overdue: '期限切れ',
  today: '今日',
  tomorrow: '明日',
  thisWeek: '今週内',
  later: '今後',
  noDate: '未設定',
}

export function getDueProximity(
  dueDate: string | null | undefined,
  today: Date | string = new Date(),
): DueProximity {
  if (!dueDate) return { kind: 'noDate', diffDays: undefined, label: LABEL.noDate }
  const todayDate =
    typeof today === 'string' ? parseIsoDateAsLocalMidnight(today) : toLocalMidnight(today)
  const dueParsed = parseIsoDateAsLocalMidnight(dueDate)
  if (!todayDate || !dueParsed) {
    return { kind: 'noDate', diffDays: undefined, label: LABEL.noDate }
  }
  const diffDays = Math.round((dueParsed.getTime() - todayDate.getTime()) / MS_PER_DAY)
  let kind: DueProximityKind
  if (diffDays < 0) kind = 'overdue'
  else if (diffDays === 0) kind = 'today'
  else if (diffDays === 1) kind = 'tomorrow'
  else if (diffDays <= 6) kind = 'thisWeek'
  else kind = 'later'
  return { kind, diffDays, label: LABEL[kind] }
}

/** UI で「期限切れ」「今日」等の短ラベルを取り出すための糖衣。 */
export function dueProximityLabel(kind: DueProximityKind): string {
  return LABEL[kind]
}

/** 6 種 kind を全部空配列で初期化したテンプレ (Object.keys 順固定用)。 */
const KIND_ORDER: readonly DueProximityKind[] = [
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
  'noDate',
] as const

export type DueProximityGroups<T> = Record<DueProximityKind, T[]>

/**
 * iter289 ai-automation: items を期限近接バケット別の配列に振り分ける。
 *
 * AI brief / pm-agent / dashboard widget が「期限切れ 3 件 / 今日 2 件 …」
 * を 1 関数で出せる substrate。done/archive 済を除外したい場合は caller 側で
 * 先に filter してから渡すこと (本関数は dueDate しか見ない)。
 *
 * 順序: 元配列順を保つ stable group 化 (per-kind 内は元順)。
 * 各 kind は必ず空配列で初期化されるので `groups.thisWeek.length` のような
 * undefined チェック不要のアクセスができる。
 */
export function groupItemsByDueProximity<T extends { dueDate: string | null | undefined }>(
  items: readonly T[],
  today: Date | string = new Date(),
): DueProximityGroups<T> {
  const groups: DueProximityGroups<T> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDate: [],
  }
  for (const it of items) {
    const { kind } = getDueProximity(it.dueDate, today)
    groups[kind].push(it)
  }
  return groups
}

/**
 * iter289 ai-automation: items を期限近接バケット別の件数だけに圧縮。
 * AI prompt の context 行 (`期限切れ 3 / 今日 2 / 明日 1 / 今週内 4 / 今後 8 / 未設定 2`)
 * を作る時に便利。
 */
export function countItemsByDueProximity(
  items: readonly { dueDate: string | null | undefined }[],
  today: Date | string = new Date(),
): Record<DueProximityKind, number> {
  const counts = {
    overdue: 0,
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    later: 0,
    noDate: 0,
  } satisfies Record<DueProximityKind, number>
  for (const it of items) {
    const { kind } = getDueProximity(it.dueDate, today)
    counts[kind] += 1
  }
  return counts
}

/** AI prompt 行 / dashboard chip 用の 1 行 summary (件数 0 の bucket は省略)。 */
export function formatDueProximityCounts(counts: Record<DueProximityKind, number>): string {
  return formatNonZeroCounts(counts, KIND_ORDER, LABEL)
}

/**
 * iter481 basics (graphical 波及): DueProximityKind を「graphical chip tone」 token に
 * 変換する pure helper。Today / Backlog / Kanban / Item card / SR aria-label 等で
 * 期限近接を 1 関数で意味のある配色 (赤=遅延 / 橙=今日 / 薄橙=明日 / 青=今週内 /
 * 灰=今後・未設定) に揃えるための substrate。
 *
 * 「装飾でなく意味のある graphical」 (queue 「もっとグラフィカル / シンプル / 意味
 * のあるデザイン」シリーズ、subtask-status / status-visual / member-capacity と整合)。
 *
 * 配色 token は 5 段階:
 *  - 'danger'  — overdue (rose、強い警戒色 + ⚠ icon)
 *  - 'urgent'  — today (amber、行動喚起)
 *  - 'warn'    — tomorrow (amber-soft、注意)
 *  - 'info'    — thisWeek (blue、計画範囲内)
 *  - 'idle'    — later / noDate (slate / muted、計画余裕)
 *
 * tailwind class は `dueProximityChipClasses(kind)` で取り出す。bg / text / ring の
 * 3 軸を 1 関数で揃える (= subtask-status, status-visual と同様の DRY パターン)。
 */
export type DueProximityTone = 'danger' | 'urgent' | 'warn' | 'info' | 'idle'

const TONE_MAP: Record<DueProximityKind, DueProximityTone> = {
  overdue: 'danger',
  today: 'urgent',
  tomorrow: 'warn',
  thisWeek: 'info',
  later: 'idle',
  noDate: 'idle',
}

export function dueProximityTone(kind: DueProximityKind): DueProximityTone {
  return TONE_MAP[kind]
}

/** alias to ChipToneClasses (`@/lib/ui/chip-tone`)。caller の import path を維持。 */
export type DueProximityChipClasses = ChipToneClasses

/** iter485 refactor: 共通 `getChipToneClasses` (lib/ui/chip-tone) に委譲。class 値の string 重複は本 module からゼロに。 */
export function dueProximityChipClasses(kind: DueProximityKind): DueProximityChipClasses {
  return getChipToneClasses(TONE_MAP[kind])
}

/**
 * iter529 ai-automation: DueProximityKind → 5 段階 共通 Severity bridge。
 * iter519 / iter524-528 と同 pattern (累計 7 ドメイン目)。
 * `DueProximityTone` (5 段独自 token: danger/urgent/warn/info/idle) と異なり、
 * 全 saikyo-todo widget 横断の `'ok'|'info'|'warn'|'danger'|'muted'` 5 段標準 token に
 * collapse する bridge。SeverityChip / Slack 通知 / SR aria-label / AI prompt 用。
 *
 *   'overdue'  → 'danger' (= 期限切れ、赤、最深刻)
 *   'today'    → 'warn'   (= 今日が期限、黄、行動喚起 — overdue を danger 専用に)
 *   'tomorrow' → 'info'   (= 明日が期限、青、計画範囲内)
 *   'thisWeek' → 'info'   (= 今週内、青、計画範囲内)
 *   'later'    → 'muted'  (= 7 日以降、グレー、計画余裕)
 *   'noDate'   → 'muted'  (= 期限未設定、グレー、対象外)
 *
 * 設計意図:
 *   - overdue が danger 専用 = 「期限を割っている = 最深刻」 を一意視覚化
 *   - today が warn (黄) = 「今日中に終わらせる行動喚起、ただし still 可能」
 *   - tomorrow / thisWeek は info で同階層 (計画 OK)、tone (TONE_MAP) では別々
 *     (urgent/warn) だが Severity bridge では collapse
 *
 * `DueProximityTone` は TONE_MAP の 5 階調 chip 配色用 (Today / Backlog 等の visual)、
 * 本 helper は SeverityChip / Slack 等の 5 段 共通 token 用。caller 用途で使い分け可。
 */
const PROXIMITY_SEVERITY: Record<DueProximityKind, Severity> = {
  overdue: 'danger',
  today: 'warn',
  tomorrow: 'info',
  thisWeek: 'info',
  later: 'muted',
  noDate: 'muted',
}

export function dueProximitySeverity(kind: DueProximityKind): Severity {
  return PROXIMITY_SEVERITY[kind]
}

/**
 * iter535 ai-automation: `Record<DueProximityKind, number>` (期限近接 別件数) を
 * `Record<Severity, number>` (5 段 severity 別件数) に集約する pure helper。
 *
 * iter533 priority / iter534 status と同 pattern。caller は
 * `formatSeverityCountsJa(dueProximityCountsToSeverityCounts(counts))` で 期限近接
 * 件数を 1 行 severity サマリ として AI prompt / Slack 通知 / dashboard summary に出せる。
 *
 * 各 DueProximityKind は `PROXIMITY_SEVERITY` (iter529) で対応 severity に集約:
 *   overdue            → danger
 *   today              → warn
 *   tomorrow / thisWeek → info
 *   later / noDate     → muted
 *
 * 例: {overdue:2, today:1, tomorrow:0, thisWeek:3, later:5, noDate:1} →
 *     {danger:2, warn:1, info:3, muted:6, ok:0}
 *
 * 集約後の合計件数は kind 合計と一致 (集約だけで増減しない)。
 *
 * iter533 priority + iter534 status + iter535 due-proximity で「item に関する 3 大 axis」
 * が全て共通 severity 軸で集約可能になった。dashboard / AI prompt が複数 axis を
 * 同 severity 集約に乗せられるため、危険 N / 注意 N / OK N の単一 severity 1 行
 * summary で「全 axis 横断の状況」 を 1 行で出せる。
 */
// iter1687 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1433 status-visual に続く外部 file 追従の 2 件目 (= iter1430 推奨の 6 関数追従の 1 つ)。
// 振る舞い不変: PROXIMITY_SEVERITY の domain → severity mapping は本 file の責務、
// boilerplate な「空 Record 初期化 + for-loop + ?? 0」が 1 行委譲に短縮。
export function dueProximityCountsToSeverityCounts(
  counts: Record<DueProximityKind, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, dueProximitySeverity)
}
