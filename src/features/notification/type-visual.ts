/**
 * iter296 basics: 通知 type 別の graphical 表現 (icon variant + 配色 + label)。
 *
 * FEEDBACK_QUEUE「もっとグラフィカル / 意味のあるデザイン」の続編。今までは
 * notification-bell の row が無 type の primary dot のみで、heartbeat / mention /
 * invite / sync-failure を見分けるには本文テキストを読むしかなかった → SR の
 * landmark / popover scan で type 識別が遅い。type を icon + 配色で先頭描画する
 * substrate を fix。
 *
 * 配置場所: status-visual.ts の対称版として `notification/type-visual.ts` に置く。
 * - icon は variant key (string) のみ返す。実体 (Lucide component) は呼び側で map
 *   (subtask の status-visual / lucide patterns と一貫)。
 * - 配色は app 共通 5-7 色 (slate / blue / red / amber / emerald) に揃える。
 *
 * 未知 type (新通知 type 追加 + dispatcher 未追従、agent-result 等の将来 type) は
 * `'unknown'` config に fallback (落ちない、icon=Bell、配色=zinc)。
 */

export type NotificationIconKey = 'alarm' | 'at-sign' | 'user-plus' | 'alert-circle' | 'bell'

export interface NotificationTypeVisual {
  /** SR 用の type 短ラベル (例: "期限近接", "メンション") */
  label: string
  /** Lucide icon variant key。render 側で Icon component に map */
  iconKey: NotificationIconKey
  /** chip / icon 背景の Tailwind class (例: `bg-red-100`) */
  bgClass: string
  /** chip / icon 文字色の Tailwind class (例: `text-red-700`) */
  textClass: string
  /** ring / border の Tailwind class */
  ringClass: string
}

const UNKNOWN_VISUAL: NotificationTypeVisual = {
  label: '通知',
  iconKey: 'bell',
  bgClass: 'bg-zinc-100',
  textClass: 'text-zinc-600',
  ringClass: 'ring-zinc-200',
}

const TYPE_MAP: Record<string, NotificationTypeVisual> = {
  heartbeat: {
    label: '期限近接',
    iconKey: 'alarm',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    ringClass: 'ring-red-200',
  },
  mention: {
    label: 'メンション',
    iconKey: 'at-sign',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-200',
  },
  invite: {
    label: '招待',
    iconKey: 'user-plus',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
    ringClass: 'ring-emerald-200',
  },
  'sync-failure': {
    label: '同期失敗',
    iconKey: 'alert-circle',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    ringClass: 'ring-amber-200',
  },
}

/**
 * 通知 type を graphical 表示用 config に変換。
 * 未知 type (新規追加の agent-result 等で format 未実装) は `unknown` に fallback。
 */
export function getNotificationTypeVisual(type: string | null | undefined): NotificationTypeVisual {
  if (!type) return UNKNOWN_VISUAL
  return TYPE_MAP[type] ?? UNKNOWN_VISUAL
}

/** 既知 type 一覧 (test / future-proofing 用)。 */
export const KNOWN_NOTIFICATION_TYPES = Object.keys(TYPE_MAP)
