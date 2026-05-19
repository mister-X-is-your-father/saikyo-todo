/**
 * iter302 ai-automation: 最近 (= 直近 N 日) 完了した Item を抽出する pure helper。
 *
 * iter299 (`selectStaleItems` 放置) と相補な「直近の達成」を 1 関数で取り出す
 * substrate。週次 retro Doc / dashboard "今週やったこと" widget / AI 朝 brief の
 * 「最近の流れ」セクションが共通の式で揃う。
 *
 * 仕様:
 *  - `archivedAt == null` (archive 済は対象外)
 *  - `doneAt` が `today - thresholdDays` より新しい (default 7 日 = 1 週間)
 *  - 未来 `doneAt` (時計ズレ等) は除外、不正値は fail-soft で除外
 *  - 完了から経過した日数 (`daysSinceDone`) 昇順 (= 新しい順) で返す。同日は元順で stable。
 *
 * 0 件 sentinel `'完了 0 件 (直近 N 日)'`、title 欠落 `(無題)` fallback で
 * `formatStaleItemsSummary` と一貫した出力スタイル。
 */
import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { titleOrUntitled } from '@/lib/format-list'

import {
  formatPriorityBucketsLabeled,
  initPriorityRecord,
  normalizePriority,
  type PriorityKey,
} from './priority'

/** 完了抽出に必要な Item の structural subset。 */
export interface FreshlyDoneItemFields {
  id?: string
  title?: string
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
  priority?: number | null
}

export interface FreshlyDoneItemEntry<T extends FreshlyDoneItemFields> {
  item: T
  /** 完了からの経過日数 (床関数、0 = 今日完了) */
  daysSinceDone: number
  /** item.priority を 1-4 に正規化 (null/未設定は 4 へ) — iter437 で追加 */
  priority: PriorityKey
}

export interface SelectFreshlyDoneItemsOptions {
  /** 完了とみなす期間 (日)。default 7 (= 1 週間)。 */
  thresholdDays?: number
}

export function selectFreshlyDoneItems<T extends FreshlyDoneItemFields>(
  items: readonly T[],
  options: SelectFreshlyDoneItemsOptions = {},
  today: Date | string = new Date(),
): FreshlyDoneItemEntry<T>[] {
  const thresholdDays = options.thresholdDays ?? 7
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []
  if (thresholdDays < 0) return []

  const enriched: { entry: FreshlyDoneItemEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.archivedAt) continue
    const doneAt = parseDateOrNull(it.doneAt)
    if (!doneAt) continue
    const diffMs = todayDate.getTime() - doneAt.getTime()
    if (diffMs < 0) continue // 未来完了 (時計ズレ等) は除外
    const daysSinceDone = Math.floor(diffMs / MS_PER_DAY)
    if (daysSinceDone > thresholdDays) continue
    enriched.push({
      entry: { item: it, daysSinceDone, priority: normalizePriority(it.priority) },
      index: i,
    })
  }
  enriched.sort((a, b) => {
    if (a.entry.daysSinceDone !== b.entry.daysSinceDone) {
      return a.entry.daysSinceDone - b.entry.daysSinceDone
    }
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/**
 * AI prompt 用 1 行サマリ:
 *   `完了 3: A (今日) / B (3 日前) / C (5 日前)`
 * 0 件は `'完了 0 件 (直近 N 日)'`。title 欠落は `'(無題)'` fallback。
 *
 * `thresholdDays` を渡すと sentinel に反映 (`'完了 0 件 (直近 7 日)'` 等)。
 */
export function formatFreshlyDoneSummary<T extends FreshlyDoneItemFields>(
  entries: readonly FreshlyDoneItemEntry<T>[],
  thresholdDays: number = 7,
): string {
  if (entries.length === 0) return `完了 0 件 (直近 ${thresholdDays} 日)`
  const parts = entries.map((e) => {
    const when = e.daysSinceDone === 0 ? '今日' : `${e.daysSinceDone} 日前`
    return `${titleOrUntitled(e.item.title)} (${when})`
  })
  return `完了 ${entries.length}: ${parts.join(' / ')}`
}

/**
 * iter1021 basics: dashboard 小型 chip / Slack daily digest 用 compact 1 行 (title list 省略)。
 *
 * iter791 `formatWorkspaceMomentumCompactJa` (= 内訳省略 compact) と同 pattern の
 * freshly-done 軸版。詳細 title list (`formatFreshlyDoneSummary`) は dashboard hover や
 * AI brief 詳細 panel 向け、本 helper は header chip / Slack 通知 1 行向け。
 *
 *   '完了 3 件 (直近 7 日)'   (1 件以上)
 *   '完了 0 件 (直近 7 日)'   (空)
 *
 * `thresholdDays` を渡すと sentinel に反映 (= 「直近 14 日」 等)。caller (chip aria-label /
 * Slack 通知) は本文字列をそのまま埋め込む。
 *
 * 用途:
 *   - dashboard header chip (= 5 文字 chip 内に framing)
 *   - Slack daily digest 「今週の完了 N 件」 1 行 summary
 *   - AI prompt 「最近の達成」 数値文脈
 */
export function formatFreshlyDoneCompactJa<T extends FreshlyDoneItemFields>(
  entries: readonly FreshlyDoneItemEntry<T>[],
  thresholdDays: number = 7,
): string {
  return `完了 ${entries.length} 件 (直近 ${thresholdDays} 日)`
}

// iter305 refactor: parseDateOrNull (lib/date/iso) に集約。

/**
 * iter437 ai-automation: freshly-done entries を priority 別 stat にバケット
 * 化する pure helper。
 *
 * iter386 (must-overdue) / iter391 (must-stuck-wip) / iter406 (must-stale) /
 * iter408 (slip-days) / iter414 (blocked-items) / iter429 (at-risk-parents) /
 * iter432 (parent-items-progress) / iter434 (recent-completed) と並ぶ
 * 「× priority」軸 — freshly-done 軸版 (9 弾目)。
 *
 * recent-completed (iter434) との対称軸: recent-completed は windowHours=24h /
 * latestMinutesAgo (= 短期 momentum)、本 freshly-done は thresholdDays=7d /
 * latestDaysSinceDone (= 週次 retro)。AI 朝 brief / 週次 retro Doc が「今週は
 * P1 で 3 件 (最新 1日前) / P3 で 5 件 (最新 0日前)」のような P 別 retroactive
 * 達成感を 1 関数で出せる。
 *
 * 仕様:
 *  - 入力: `selectFreshlyDoneItems` の出力 (entries に priority 含む)
 *  - 各 bucket の `count` (= 該当完了 item 数) と `latestDaysSinceDone`
 *    (= bucket 内最新完了の日数、count=0 なら null、Math.floor 整数)
 *  - 全 priority 0 件 / count=0 でも全 4 bucket は必ず初期化
 */
export interface FreshlyDonePriorityStats {
  count: number
  /** bucket 内最新完了の経過日数 (Math.floor 整数、count=0 なら null、0 = 今日完了) */
  latestDaysSinceDone: number | null
}

export type FreshlyDoneByPriority = Record<PriorityKey, FreshlyDonePriorityStats>

export function computeFreshlyDoneByPriority<T extends FreshlyDoneItemFields>(
  entries: readonly FreshlyDoneItemEntry<T>[],
): FreshlyDoneByPriority {
  const result: FreshlyDoneByPriority = initPriorityRecord(() => ({
    count: 0,
    latestDaysSinceDone: null,
  }))
  for (const e of entries) {
    const bucket = result[e.priority]
    bucket.count += 1
    if (bucket.latestDaysSinceDone === null || e.daysSinceDone < bucket.latestDaysSinceDone) {
      bucket.latestDaysSinceDone = e.daysSinceDone
    }
  }
  return result
}

/**
 * 経過日数を「今日 / 1 日前 / 5 日前」形式に整形。0 → '今日'、それ以外は
 * `${days}日前`。recent-completed の minutes 表記と対称な days 表記版。
 */
function formatDaysAgoJa(days: number): string {
  return days === 0 ? '今日' : `${days}日前`
}

/**
 * AI prompt 用 priority 別 1 行サマリ:
 *   '完了: P1 1 件 (最新 今日) / P3 2 件 (最新 1日前)'
 *
 * count=0 bucket は省略、全 0 → '完了 0 件 (直近 N 日)' (sentinel に thresholdDays
 * 反映で formatFreshlyDoneSummary と一貫)。iter386/408/414/429/432/434 と同じ
 * '{label}: P1 ... / P3 ...' 形式。
 */
export function formatFreshlyDoneByPriorityJa(
  byPriority: FreshlyDoneByPriority,
  thresholdDays: number = 7,
): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, s) =>
      s.count === 0 || s.latestDaysSinceDone === null
        ? null
        : `P${k} ${s.count} 件 (最新 ${formatDaysAgoJa(s.latestDaysSinceDone)})`,
    '完了',
    `完了 0 件 (直近 ${thresholdDays} 日)`,
  )
}
