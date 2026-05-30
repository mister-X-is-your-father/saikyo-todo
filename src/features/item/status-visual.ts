/**
 * Phase 6.15 iter — Item.status を graphical 表示用 config に変換する pure helper。
 *
 * 配置場所の選択:
 *   - `subtask-status.ts` (subtasks-panel 専用) を本ファイルに昇格し、Today /
 *     Inbox / Backlog / Kanban / 他 view からも使える app 共通 helper にした。
 *   - React 依存ゼロ。Tailwind class string と icon variant key (string) のみ返す。
 *     icon の実体 (Lucide component) は呼び出し側 (status-badge.tsx 等) で map する。
 *
 * デフォルト 3 status (`todo` / `in_progress` / `done`) + よくある拡張 (`cancelled` /
 * `blocked`) を直接ハンドル。workspace カスタム status 等の未知 key は `unknown`
 * config に fallback (落ちない、label="不明")。
 */
import { formatNonZeroCounts } from '@/lib/format-counts'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

export type StatusIconKey = 'circle' | 'progress' | 'done' | 'cancel' | 'block' | 'unknown'

export interface StatusVisualConfig {
  /** badge 内テキスト + aria-label / tooltip 用ラベル (例: "TODO (未着手)") */
  label: string
  /** 短縮ラベル (Backlog cell など狭い行で使う、例: "TODO") */
  shortLabel: string
  /** chip / cell 背景の Tailwind class (例: `bg-slate-100`) */
  bgClass: string
  /** chip 文字色の Tailwind class (例: `text-slate-700`) */
  textClass: string
  /** ring / border の Tailwind class (focus / outline 用) */
  ringClass: string
  /** Lucide icon variant key。render 側で Icon component に map */
  iconKey: StatusIconKey
}

// iter1529: STATUS_MAP の 5 status (todo/in_progress/done/cancelled/blocked) + UNKNOWN_CONFIG が
// `bg-{color}-100 text-{color}-{700,800} ring-{color}-{200,300}` で light 固定。
// iter1376/1493/1512-1528 chip dark sweep に追従し dark variant 補完。これで StatusBadge
// (= 10+ surface で使われる中央 component) が dark mode に対応化される。
// 各 status: dark:bg-{color}-{900-950}/40, dark:text-{color}-300, dark:ring-{color}-{700-900}/50
const UNKNOWN_CONFIG: StatusVisualConfig = {
  label: '不明',
  shortLabel: '不明',
  bgClass: 'bg-zinc-100 dark:bg-zinc-900/40',
  textClass: 'text-zinc-700 dark:text-zinc-300',
  ringClass: 'ring-zinc-200 dark:ring-zinc-700/50',
  iconKey: 'unknown',
}

const STATUS_MAP: Record<string, StatusVisualConfig> = {
  todo: {
    label: 'TODO (未着手)',
    shortLabel: 'TODO',
    bgClass: 'bg-slate-100 dark:bg-slate-900/40',
    textClass: 'text-slate-700 dark:text-slate-300',
    ringClass: 'ring-slate-300 dark:ring-slate-700/50',
    iconKey: 'circle',
  },
  in_progress: {
    label: '進行中',
    shortLabel: '進行中',
    bgClass: 'bg-blue-100 dark:bg-blue-950/40',
    textClass: 'text-blue-700 dark:text-blue-300',
    ringClass: 'ring-blue-300 dark:ring-blue-900/50',
    iconKey: 'progress',
  },
  done: {
    label: '完了',
    shortLabel: '完了',
    bgClass: 'bg-emerald-100 dark:bg-emerald-950/40',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    ringClass: 'ring-emerald-300 dark:ring-emerald-900/50',
    iconKey: 'done',
  },
  cancelled: {
    label: 'キャンセル',
    shortLabel: 'キャンセル',
    bgClass: 'bg-zinc-100 dark:bg-zinc-900/40',
    textClass: 'text-zinc-700 dark:text-zinc-400 line-through',
    ringClass: 'ring-zinc-300 dark:ring-zinc-700/50',
    iconKey: 'cancel',
  },
  blocked: {
    label: '依存待ち (blocked)',
    shortLabel: 'blocked',
    bgClass: 'bg-amber-100 dark:bg-amber-950/40',
    textClass: 'text-amber-800 dark:text-amber-200',
    ringClass: 'ring-amber-300 dark:ring-amber-900/50',
    iconKey: 'block',
  },
}

/**
 * Item.status を graphical 表示用 config に変換する。
 * 未知 key (workspace カスタム status 等) は `unknown` config を返す (落ちない)。
 */
export function getStatusVisual(statusKey: string | null | undefined): StatusVisualConfig {
  if (!statusKey) return UNKNOWN_CONFIG
  return STATUS_MAP[statusKey] ?? UNKNOWN_CONFIG
}

/** 既知の status key 一覧 (デフォルト 3 + 拡張 2)。test で使う。 */
export const KNOWN_STATUS_KEYS = Object.keys(STATUS_MAP)

/**
 * iter294 ai-automation: items を status 別の配列に振り分ける。
 *
 * iter287 (due-proximity) / iter289 (group/count/format) / iter292 (priority 別)
 * と対称な status 版 substrate。AI brief / pm-agent / dashboard widget が
 * `todo 3 / 進行中 2 / 完了 5` 等の status 分布を 1 関数で出せる。
 *
 * 仕様:
 *  - 既知 status (todo/in_progress/done/cancelled/blocked) は固有 bucket に。
 *  - 未知 / null / undefined / 空文字 / カスタム status は `unknown` bucket に集約
 *    (`getStatusVisual` のフォールバックと一貫)。
 *  - 順序: 元配列順を保つ stable group (per-bucket 内も元順)。
 *  - 既知 5 bucket + unknown は必ず空配列で初期化 — undefined チェック不要。
 */
export type StatusKey = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'blocked' | 'unknown'

export type StatusGroups<T> = Record<StatusKey, T[]>

const STATUS_ORDER: readonly StatusKey[] = [
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
  'unknown',
] as const

export function normalizeStatus(s: string | null | undefined): StatusKey {
  if (s === 'todo' || s === 'in_progress' || s === 'done' || s === 'cancelled' || s === 'blocked') {
    return s
  }
  return 'unknown'
}

/**
 * iter1015 refactor: status が「終端」 (= done / cancelled) かを判定する pure predicate。
 *
 * 経緯: `status === 'done' || status === 'cancelled'` の inline 比較が src/ 配下 5 箇所で
 * 重複していた (taskchute/cumulative-remaining / item/overdue-active 2x /
 * dashboard/weekly-insight / cycle-check-stats 内 等)。本 helper で 1 source of truth に集約、
 * 「終端 status」 の vocabulary 統一。
 *
 *   - 'done' / 'cancelled' → true
 *   - 'todo' / 'in_progress' / 'blocked' / 'unknown' / null / undefined → false
 *
 * 用途: active item filter / overdue active 集計 / 完了済除外 / 終端後の楽観更新 skip 等。
 */
export function isTerminalStatus(s: string | null | undefined): boolean {
  return s === 'done' || s === 'cancelled'
}

export function groupItemsByStatus<T extends { status: string | null | undefined }>(
  items: readonly T[],
): StatusGroups<T> {
  const groups: StatusGroups<T> = {
    todo: [],
    in_progress: [],
    done: [],
    cancelled: [],
    blocked: [],
    unknown: [],
  }
  for (const it of items) {
    groups[normalizeStatus(it.status)].push(it)
  }
  return groups
}

export function countItemsByStatus(
  items: readonly { status: string | null | undefined }[],
): Record<StatusKey, number> {
  const counts: Record<StatusKey, number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
    blocked: 0,
    unknown: 0,
  }
  for (const it of items) {
    counts[normalizeStatus(it.status)] += 1
  }
  return counts
}

/** unknown は label "不明" で表示するための短ラベル map (formatStatusCounts 専用)。 */
const SHORT_LABEL: Record<StatusKey, string> = {
  todo: 'TODO',
  in_progress: '進行中',
  blocked: 'blocked',
  done: '完了',
  cancelled: 'キャンセル',
  unknown: '不明',
}

/**
 * AI prompt 行 / dashboard chip 用の 1 行 summary (件数 0 の bucket は省略)。
 * 順序は実用視認順 (todo → 進行中 → blocked → 完了 → キャンセル → 不明)。
 */
export function formatStatusCounts(counts: Record<StatusKey, number>): string {
  return formatNonZeroCounts(counts, STATUS_ORDER, SHORT_LABEL)
}

/**
 * iter528 ai-automation: StatusKey → 5 段階 共通 Severity bridge。
 * iter519 / iter524-527 と同 pattern。STATUS_MAP の visual semantic と整合的:
 *
 *   'todo'        → 'muted'  (= 未着手、グレー、待機中)
 *   'in_progress' → 'info'   (= 進行中、青、healthy)
 *   'blocked'     → 'warn'   (= 依存待ち、黄、要観察)
 *   'done'        → 'ok'     (= 完了、緑、最高評価)
 *   'cancelled'   → 'muted'  (= キャンセル、グレー、過去)
 *   'unknown'     → 'muted'  (= 不明、グレー、対象外)
 *
 * 設計意図:
 *   - in_progress = info で「いま動いてる」 (= 軸 1 可視化)、done と差別化
 *   - blocked = warn で「依存解消が必要」 を能動表示 (軸 4 漏れ防止)
 *   - todo / cancelled / unknown は muted で「現在の判断対象外」 (= 認知負荷 低減)
 *
 * STATUS_MAP visual (slate/blue/emerald/zinc/amber) は本 Severity 5 段とおおむね整合
 * (todo=slate→muted、cancelled=zinc→muted、blocked=amber→warn は微差)。SeverityChip
 * tone の caller がこの helper 1 関数で chip 配色を統一可能、AI prompt / Slack 通知 /
 * SR aria-label の chip shape も同源化。
 */
const STATUS_SEVERITY: Record<StatusKey, 'ok' | 'info' | 'warn' | 'danger' | 'muted'> = {
  todo: 'muted',
  in_progress: 'info',
  blocked: 'warn',
  done: 'ok',
  cancelled: 'muted',
  unknown: 'muted',
}

export function statusKeySeverity(
  status: string | null | undefined,
): 'ok' | 'info' | 'warn' | 'danger' | 'muted' {
  return STATUS_SEVERITY[normalizeStatus(status)]
}

/**
 * iter534 ai-automation: `Record<StatusKey, number>` (status 別件数) を
 * `Record<Severity, number>` (5 段 severity 別件数) に集約する pure helper。
 *
 * iter533 priorityCountsToSeverityCounts と同 pattern。caller は
 * `formatSeverityCountsJa(statusCountsToSeverityCounts(counts))` で status 件数を
 * 1 行 severity サマリ として AI prompt / Slack 通知 / dashboard summary に出せる。
 *
 * 各 status は `STATUS_SEVERITY` (iter528) で対応 severity に集約:
 *   todo / cancelled / unknown → muted
 *   in_progress                → info
 *   blocked                    → warn
 *   done                       → ok
 *
 * 例: {todo:5, in_progress:2, blocked:1, done:3, cancelled:1, unknown:0} →
 *     {ok:3, info:2, warn:1, danger:0, muted:6}
 *
 * 集約後の合計件数は status 合計と一致 (集約だけで増減しない)。
 */
export function statusCountsToSeverityCounts(
  counts: Record<StatusKey, number>,
): Record<Severity, number> {
  // iter1433 basics: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
  // 旧 inline boilerplate (= empty Record 初期化 + for-loop + Severity map lookup) を排除。
  // semantics は完全保持: STATUS_SEVERITY[k] の Record lookup を function call で wrap。
  return aggregateCountsBySeverity<StatusKey>(counts, (k) => STATUS_SEVERITY[k])
}
