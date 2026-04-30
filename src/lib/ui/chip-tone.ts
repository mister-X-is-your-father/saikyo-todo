/**
 * iter485 refactor: graphical 波及シリーズ (iter481/482/483) で 3 module に同 shape
 * の `TONE_CLASSES` map (5 段階 × Tailwind 3 軸) が散らばっていたのを集約。
 *
 * 散在状況 (iter485 集約直前):
 *   - `features/item/due-proximity.ts` (iter481) — DueProximityKind → 5 tone
 *   - `features/agent/cost-month-projection.ts` (iter482) — RiskLevel → 4 tone
 *   - `features/item/urgency.ts` (iter483) — UrgencyTier → 5 tone
 *
 * 全部「赤=danger / 橙強=urgent / 橙薄=warn / 青=info / 灰=idle」の 5 段階で
 * Tailwind class 値も完全に同じ (bg-rose-100/text-rose-700/ring-rose-300 等)。
 * 本 file に「ChipTone vocabulary + class map」を集約、各 caller 側は domain
 * 固有の `kind → tone` mapping だけを保持して `getChipToneClasses(tone)` に
 * 委譲する形に refactor。class 値の string 重複が 3 箇所 → 1 箇所に。
 *
 * iter360 集約方針 36 弾目 (前回 35 弾目 = iter480 MS_PER_DAY 集約)。
 *
 * 5 tone vocabulary:
 *  - 'danger' — rose、強警戒 (期限切れ / overdue / cost 超過 / urgency critical)
 *  - 'urgent' — amber 強、行動喚起 (今日 / urgency high)
 *  - 'warn'   — amber 薄、注意 (明日 / urgency medium / cost warn)
 *  - 'info'   — blue 薄、計画範囲内 (今週内 / urgency low / cost safe)
 *  - 'idle'   — slate 薄、対象外・計算不能 (期限なし / urgency none / projection idle)
 *
 * 既存 `lib/ui/trend-tone.ts` (trend chip) は polarity 切替 (up=good vs bad で配色
 * 反転) があり別軸の helper、本 file の `ChipTone` は severity 軸の絶対 token。
 */

/**
 * iter486 basics: 'success' tone を追加 (5 → 6 段階)。
 *  - severity 軸 (danger / urgent / warn / info / idle) は単調順
 *  - 'success' は **severity と直交する positive 軸** (達成 / 余裕 / 完了 / 健全)
 *  - 例: member-capacity 'free' (時間に余裕)、subtask-status 'done' (完了)、
 *    goal-progress (達成済)、sprint progress 'onTrack' 等
 */
export type ChipTone = 'danger' | 'urgent' | 'warn' | 'info' | 'idle' | 'success'

export interface ChipToneClasses {
  /** chip 背景の Tailwind class (例: `bg-rose-100`) */
  bgClass: string
  /** chip 文字色の Tailwind class (例: `text-rose-700`) */
  textClass: string
  /** ring / border の Tailwind class (focus / outline 用) */
  ringClass: string
}

const TONE_CLASSES: Record<ChipTone, ChipToneClasses> = {
  danger: {
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-700',
    ringClass: 'ring-rose-300',
  },
  urgent: {
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    ringClass: 'ring-amber-300',
  },
  warn: {
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    ringClass: 'ring-amber-200',
  },
  info: {
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-200',
  },
  idle: {
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    ringClass: 'ring-slate-200',
  },
  success: {
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    ringClass: 'ring-emerald-200',
  },
}

/**
 * Tone token (5 段階) → Tailwind chip class 3 軸 (bg / text / ring) を 1 関数で。
 * caller domain の固有 `kind → tone` mapping を経由して呼ぶ想定:
 *
 *   import { getChipToneClasses } from '@/lib/ui/chip-tone'
 *   import { dueProximityTone } from '@/features/item/due-proximity'
 *
 *   const c = getChipToneClasses(dueProximityTone(kind))
 *   <div className={`${c.bgClass} ${c.textClass} ring-1 ${c.ringClass}`}>...</div>
 */
export function getChipToneClasses(tone: ChipTone): ChipToneClasses {
  return TONE_CLASSES[tone]
}
