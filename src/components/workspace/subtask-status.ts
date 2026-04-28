/**
 * Phase 6.15 iter — サブタスク graphical 表示の pure helper (P0 queue: subtask-graph)。
 *
 * 役割: Item.status (workspace_statuses.key、free string) を **graphical 表示用の
 * config (label / 色 / icon variant)** に変換する。
 *
 * 設計判断:
 *   - ここは **pure**。React 依存ゼロ、Tailwind class string のみ返す。
 *   - icon は string key (`iconKey`) で返し、render 側で Lucide Icon と紐付ける。
 *     これで helper を vitest でテスト可能 + 配色を 1 箇所で管理。
 *   - workspace は `workspace_statuses` で status を customize できるが、デフォルト
 *     3 種 (`todo` / `in_progress` / `done`) + よくある拡張 (`cancelled` / `blocked`)
 *     を直接ハンドル。未知 key は `unknown` config に fallback (label="不明")。
 *   - `cancelled` / `blocked` は workspace 既定には無いがユーザカスタム想定で支援。
 *
 * 使用箇所: `subtasks-panel.tsx`、将来の `SubtaskFlowView` (DAG modal) でも共有予定。
 */

export type SubtaskIconKey = 'circle' | 'progress' | 'done' | 'cancel' | 'block' | 'unknown'

export interface SubtaskStatusConfig {
  /** SR / aria-label / tooltip 用の人間読みラベル */
  label: string
  /** dot / chip / cell 背景の Tailwind class (例: `bg-slate-100`) */
  bgClass: string
  /** dot / chip 文字色の Tailwind class (例: `text-slate-600`) */
  textClass: string
  /** ring / border の Tailwind class (focus / outline 用) */
  ringClass: string
  /** Lucide icon variant key。render 側で Icon component に map */
  iconKey: SubtaskIconKey
}

const UNKNOWN_CONFIG: SubtaskStatusConfig = {
  label: '不明',
  bgClass: 'bg-zinc-100',
  textClass: 'text-zinc-500',
  ringClass: 'ring-zinc-200',
  iconKey: 'unknown',
}

const STATUS_MAP: Record<string, SubtaskStatusConfig> = {
  todo: {
    label: 'TODO (未着手)',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    ringClass: 'ring-slate-300',
    iconKey: 'circle',
  },
  in_progress: {
    label: '進行中',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-300',
    iconKey: 'progress',
  },
  done: {
    label: '完了',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    ringClass: 'ring-green-300',
    iconKey: 'done',
  },
  cancelled: {
    label: 'キャンセル',
    bgClass: 'bg-zinc-100',
    textClass: 'text-zinc-500 line-through',
    ringClass: 'ring-zinc-300',
    iconKey: 'cancel',
  },
  blocked: {
    label: '依存待ち (blocked)',
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
export function getSubtaskStatusConfig(
  statusKey: string | null | undefined,
): SubtaskStatusConfig {
  if (!statusKey) return UNKNOWN_CONFIG
  return STATUS_MAP[statusKey] ?? UNKNOWN_CONFIG
}

/**
 * 既知の status key 一覧 (デフォルト 3 + 拡張 2)。test で使う。
 */
export const KNOWN_SUBTASK_STATUS_KEYS = Object.keys(STATUS_MAP)
