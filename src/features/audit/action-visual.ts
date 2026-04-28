/**
 * iter298 basics: audit_log の action 種別を graphical 表示用 config に変換する pure helper。
 *
 * FEEDBACK_QUEUE「もっとグラフィカル / 意味のあるデザイン」シリーズの続編。
 * 今までは ActivityLog row が action 文言 (作成 / 更新 / ...) のみで、
 * 操作種別の見分けがテキスト識別任せだった → action を icon + 配色で先頭描画する
 * substrate を用意。subtask の `status-visual` / notification の `type-visual` と
 * 同じ「icon variant key + 配色 + label」構造で揃える。
 *
 * 配色は app 共通 5-7 色 (slate / emerald / blue / amber / red / zinc) に統一。
 *  - **作成系** (create) → Plus + emerald (新規発生)
 *  - **更新系** (update / set_assignees / set_tags) → Pencil + blue
 *  - **遷移系** (status_change / bulk_status_change / move / reorder) → ArrowRightLeft + amber
 *  - **完了系** (complete) → CheckCircle2 + emerald
 *  - **取消系** (uncomplete) → RotateCcw + slate
 *  - **削除系** (delete / bulk_delete) → Trash2 + red
 *
 * 未知 action (新規 audit action 追加で本 helper 未追従) は `unknown` config に
 * fallback (落ちない、icon=Activity、配色=zinc)。
 */

export type AuditActionIconKey =
  | 'plus'
  | 'pencil'
  | 'arrow-right-left'
  | 'check-circle'
  | 'rotate-ccw'
  | 'trash'
  | 'activity'

export interface AuditActionVisual {
  /** SR / aria-label / Backlog の chip ラベル */
  label: string
  /** Lucide icon variant key。render 側で Icon component に map */
  iconKey: AuditActionIconKey
  /** chip / icon 背景の Tailwind class (例: `bg-emerald-100`) */
  bgClass: string
  /** chip / icon 文字色 */
  textClass: string
  /** ring / border */
  ringClass: string
}

const UNKNOWN_VISUAL: AuditActionVisual = {
  label: '操作',
  iconKey: 'activity',
  bgClass: 'bg-zinc-100',
  textClass: 'text-zinc-600',
  ringClass: 'ring-zinc-200',
}

const CREATE_VISUAL: AuditActionVisual = {
  label: '作成',
  iconKey: 'plus',
  bgClass: 'bg-emerald-100',
  textClass: 'text-emerald-700',
  ringClass: 'ring-emerald-200',
}
const UPDATE_VISUAL: AuditActionVisual = {
  label: '更新',
  iconKey: 'pencil',
  bgClass: 'bg-blue-100',
  textClass: 'text-blue-700',
  ringClass: 'ring-blue-200',
}
const TRANSITION_VISUAL: AuditActionVisual = {
  label: 'ステータス変更',
  iconKey: 'arrow-right-left',
  bgClass: 'bg-amber-100',
  textClass: 'text-amber-700',
  ringClass: 'ring-amber-200',
}
const COMPLETE_VISUAL: AuditActionVisual = {
  label: '完了',
  iconKey: 'check-circle',
  bgClass: 'bg-emerald-100',
  textClass: 'text-emerald-700',
  ringClass: 'ring-emerald-200',
}
const REOPEN_VISUAL: AuditActionVisual = {
  label: '完了取消',
  iconKey: 'rotate-ccw',
  bgClass: 'bg-slate-100',
  textClass: 'text-slate-700',
  ringClass: 'ring-slate-200',
}
const DELETE_VISUAL: AuditActionVisual = {
  label: '削除',
  iconKey: 'trash',
  bgClass: 'bg-red-100',
  textClass: 'text-red-700',
  ringClass: 'ring-red-200',
}

const ACTION_MAP: Record<string, AuditActionVisual> = {
  create: CREATE_VISUAL,

  update: UPDATE_VISUAL,
  set_assignees: { ...UPDATE_VISUAL, label: '担当者変更' },
  set_tags: { ...UPDATE_VISUAL, label: 'タグ変更' },

  status_change: TRANSITION_VISUAL,
  bulk_status_change: { ...TRANSITION_VISUAL, label: '一括ステータス変更' },
  move: { ...TRANSITION_VISUAL, label: '移動' },
  reorder: { ...TRANSITION_VISUAL, label: '並び替え' },
  archive: { ...TRANSITION_VISUAL, label: 'アーカイブ' },
  unarchive: { ...TRANSITION_VISUAL, label: 'アーカイブ解除' },

  complete: COMPLETE_VISUAL,
  uncomplete: REOPEN_VISUAL,

  delete: DELETE_VISUAL,
  bulk_delete: { ...DELETE_VISUAL, label: '一括削除' },
}

/**
 * audit action key を graphical 表示用 config に変換。
 * 未知 action (新規追加で未追従) は `unknown` (zinc + Activity icon) fallback。
 */
export function getAuditActionVisual(action: string | null | undefined): AuditActionVisual {
  if (!action) return UNKNOWN_VISUAL
  return ACTION_MAP[action] ?? UNKNOWN_VISUAL
}

/** 既知 action key 一覧 (test / future-proofing 用)。 */
export const KNOWN_AUDIT_ACTIONS = Object.keys(ACTION_MAP)
