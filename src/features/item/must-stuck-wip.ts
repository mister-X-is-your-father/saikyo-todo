/**
 * iter364 ai-automation: MUST × stuck WIP combinator。
 *
 * iter357 must-hygiene (= MUST の dueDate 設定状況) と iter359 wip-stuck (= 進行中
 * だが updatedAt が動いていない WIP) を 2 軸で交差させる combinator。iter384
 * (`aged-hygiene-debt` = hygiene-debt × aging) や iter397 (`stale-urgent` = urgency
 * × aging) と同パターンの 2 軸交差 substrate。
 *
 * 単独 must-hygiene (MUST 全般 / dueDate 設定状況) や単独 wip-stuck (停滞 WIP 全般)
 * より signal 強度が高い: MUST はあって当然、stuck WIP も発生して当然、しかし両方
 * 該当 = 「絶対落とせない MUST を着手したのに 3 日以上触っていない」 = 最深刻アラーム。
 *
 * caller benefits:
 *   - AI 朝 brief 「MUST 進行中だが停滞 2 件 (タスクA 7日 / タスクB 4日) — 即対応」を 1 関数で
 *   - pm-agent watch list の最高優先 nudge 候補 (= MUST + 進行中 + 停滞 の triage)
 *   - dashboard 専用 chip 候補 (severity 'critical' = red、wip-stuck chip と異なる色軸)
 */

import { formatTopWithOverflow } from '@/lib/format-list'

import { selectStuckWipItems, type StuckWipEntry, type StuckWipFields } from './wip-stuck'

export interface MustStuckWipFields extends StuckWipFields {
  isMust: boolean | null | undefined
}

export interface PickMustStuckWipOptions {
  /** stuck と見なす updatedAt 経過日数の閾値。default 3 (= wip-stuck と同じ) */
  thresholdDays?: number
}

/**
 * isMust === true かつ stuck WIP な entries を stable 順序 (stuckDays desc + 元配列順)
 * で返す薄い filter。selectStuckWipItems に MUST 制約を追加した形。
 *
 * 仕様:
 *   - 内部で wip-stuck の filter ロジックを再適用 (status='in_progress' / done/archive
 *     除外 / updatedAt 不正除外 / 未来時刻除外 / threshold filter)
 *   - 並び順 / fail-soft / threshold の挙動は selectStuckWipItems と完全互換
 *   - isMust=false / null / undefined は除外
 */
export function pickMustStuckWipItems<T extends MustStuckWipFields>(
  items: readonly T[],
  options: PickMustStuckWipOptions = {},
  today: Date | string = new Date(),
): StuckWipEntry<T>[] {
  const onlyMust: T[] = []
  for (const it of items) {
    if (it && it.isMust) onlyMust.push(it)
  }
  return selectStuckWipItems(onlyMust, options, today)
}

/**
 * AI prompt / dashboard 用 1 行 summary:
 *   `'MUST 進行中だが停滞: 2 件 (タスクA 7 日 / タスクB 4 日)'`
 *   `'MUST 進行中だが停滞: 5 件 (タスクA 10 日 / タスクB 8 日 / タスクC 6 日 / 他 2 件)'` (limit=3)
 *   `'MUST 進行中だが停滞 0 件'`
 *
 * limit を超えた残件は「他 N 件」でまとめる。title 欠落は `(無題)` fallback。
 */
export function formatMustStuckWipJa<T extends MustStuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return 'MUST 進行中だが停滞 0 件'
  const body = formatTopWithOverflow(
    entries,
    (e) => {
      const title =
        typeof e.item.title === 'string' && e.item.title.length > 0 ? e.item.title : '(無題)'
      return `${title} ${e.stuckDays} 日`
    },
    limit,
  )
  return `MUST 進行中だが停滞: ${entries.length} 件 (${body})`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'critical' (= 1 件以上 MUST stuck WIP がある = MVP 「絶対落とさない」原則の警報)
 *  - 'idle' (= 0 件 = 健全)
 *
 * wip-stuck の severity は 'severe'/'mild'/'idle' の 3 値だが、本 helper は MUST に
 * 絞った時点で既に「該当 = 最深刻」なので 2 値で十分。red 1 色で表現する想定。
 */
export type MustStuckWipSeverity = 'critical' | 'idle'

export function mustStuckWipSeverity<T extends MustStuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
): MustStuckWipSeverity {
  return entries.length > 0 ? 'critical' : 'idle'
}
