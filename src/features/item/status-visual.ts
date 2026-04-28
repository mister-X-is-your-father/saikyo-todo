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

const UNKNOWN_CONFIG: StatusVisualConfig = {
  label: '不明',
  shortLabel: '不明',
  bgClass: 'bg-zinc-100',
  textClass: 'text-zinc-500',
  ringClass: 'ring-zinc-200',
  iconKey: 'unknown',
}

const STATUS_MAP: Record<string, StatusVisualConfig> = {
  todo: {
    label: 'TODO (未着手)',
    shortLabel: 'TODO',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    ringClass: 'ring-slate-300',
    iconKey: 'circle',
  },
  in_progress: {
    label: '進行中',
    shortLabel: '進行中',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-300',
    iconKey: 'progress',
  },
  done: {
    label: '完了',
    shortLabel: '完了',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
    ringClass: 'ring-emerald-300',
    iconKey: 'done',
  },
  cancelled: {
    label: 'キャンセル',
    shortLabel: 'キャンセル',
    bgClass: 'bg-zinc-100',
    textClass: 'text-zinc-500 line-through',
    ringClass: 'ring-zinc-300',
    iconKey: 'cancel',
  },
  blocked: {
    label: '依存待ち (blocked)',
    shortLabel: 'blocked',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    ringClass: 'ring-amber-300',
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

function normalizeStatus(s: string | null | undefined): StatusKey {
  if (s === 'todo' || s === 'in_progress' || s === 'done' || s === 'cancelled' || s === 'blocked') {
    return s
  }
  return 'unknown'
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
