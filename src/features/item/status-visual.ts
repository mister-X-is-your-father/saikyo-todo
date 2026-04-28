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
