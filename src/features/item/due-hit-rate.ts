/**
 * iter342 ai-automation: 完了済 item の **「期限達成率」** (hit rate) を計算する
 * pure helper。
 *
 * iter334 (`completion-days-by-priority`) は完了所要日数の avg を priority 別に出すが、
 * 「期限を守ったか」の binary は別軸。本 helper は dueDate を持つ完了 item を
 * `hit` (doneAt ≤ dueDate 当日終端) / `miss` (doneAt > dueDate) に分類し、
 * SLA 達成率を 1 関数で取り出す。
 *
 * caller benefits:
 *   - AI 朝 brief: 「期限達成率: 80% (12 / 15 件)」
 *   - pm-agent: 「直近 30 日 hit rate 50% — 見積精度 / 着手遅延を疑う」
 *   - dashboard widget: hit rate chip + tone (高 = emerald 安心 / 低 = amber 警戒)
 *
 * 仕様:
 *   - input: items 配列 ({doneAt, dueDate} の structural subset)
 *   - 除外: doneAt 未設定 / 不正 / dueDate 未設定 / 不正 ISO
 *   - 比較: doneAt の timestamp vs dueDate 当日のローカル 23:59:59.999
 *     (= ユーザの local TZ で「その日のうちに完了」を hit と判定)
 *   - options.since: doneAt >= since の item のみ集計 (window 指定)。不正値で全件
 *   - hit + miss + total + hitRate (total=0 → null) を返す
 */

import { dueDateEndOfDayMs, parseDateOrNull } from '@/lib/date/iso'
import { rateToPct } from '@/lib/format-rate'
import { type ChipTone } from '@/lib/ui/chip-tone'

import { type AgentBriefSignal } from '@/features/agent/agent-reliability'

import { bucketByPriorityWith, PRIORITY_ORDER, type PriorityKey } from './priority'

export interface DueHitRateFields {
  doneAt: Date | string | null | undefined
  /** 'YYYY-MM-DD' ISO date (時刻なし) */
  dueDate: string | null | undefined
}

/** priority 別集計用の structural subset。priority 未設定 / 範囲外は p4 に集約。 */
export interface DueHitRateByPriorityFields extends DueHitRateFields {
  priority: number | null | undefined
}

export interface DueHitRateStats {
  /** 完了 + dueDate 有効 item の総数 (= hit + miss) */
  total: number
  /** doneAt が dueDate 当日終端 (ローカル 23:59:59.999) までに完了した件数 */
  hit: number
  /** doneAt が dueDate を超過した件数 */
  miss: number
  /** hit / total (total=0 → null)。0..1 の少数 */
  hitRate: number | null
}

export interface ComputeDueHitRateOptions {
  /** doneAt >= since の item のみ集計。Date | ISO 文字列、不正値で全件 */
  since?: Date | string
}

const EMPTY: DueHitRateStats = { total: 0, hit: 0, miss: 0, hitRate: null }

// iter360 refactor: dueDateEndOfDayMs は lib/date/iso.ts に集約。

export function computeDueHitRate<T extends DueHitRateFields>(
  items: readonly T[],
  options: ComputeDueHitRateOptions = {},
): DueHitRateStats {
  const sinceParsed = options.since !== undefined ? parseDateOrNull(options.since) : null
  const sinceMs = sinceParsed ? sinceParsed.getTime() : null

  let hit = 0
  let miss = 0
  for (const it of items) {
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    if (sinceMs !== null && done.getTime() < sinceMs) continue
    if (!it.dueDate) continue
    const dueEnd = dueDateEndOfDayMs(it.dueDate)
    if (dueEnd === null) continue
    if (done.getTime() <= dueEnd) hit += 1
    else miss += 1
  }

  const total = hit + miss
  if (total === 0) return EMPTY
  return { total, hit, miss, hitRate: hit / total }
}

/**
 * iter344 ai-automation: priority 別の `DueHitRateStats` を計算する pure helper。
 *
 * iter334 (`completion-days-by-priority`、所要日数 avg を P 別) の対称軸。AI brief /
 * pm-agent / dashboard widget が「P1 100% / P3 50% / P4 67%」のような priority 別
 * SLA 達成率を 1 関数で取り出せる。低優先 ほど hit rate 悪 → bias 検出。
 *
 * 各 priority bucket は必ず初期化されているので、caller は `byPriority[3].total === 0`
 * のような undefined チェック不要。集計対象 / since filter / 不正値除外は本体
 * `computeDueHitRate` と同じ振る舞い。
 */
export type DueHitRateByPriority = Record<PriorityKey, DueHitRateStats>

export function computeDueHitRateByPriority<T extends DueHitRateByPriorityFields>(
  items: readonly T[],
  options: ComputeDueHitRateOptions = {},
): DueHitRateByPriority {
  return bucketByPriorityWith(items, (group) => computeDueHitRate(group, options))
}

// iter370 refactor: countNonEmptyPriorityBuckets は priority.ts の generic に集約。
// 後方互換のため re-export (既存 dashboard-view.tsx import を壊さない)。
export { countNonEmptyPriorityBuckets } from './priority'

/**
 * AI prompt 用 1 行サマリ (priority 別):
 *   `'期限達成率: P1 100% (3/3) / P2 80% (4/5) / P4 67% (2/3)'`
 *
 * total=0 の priority は省略。全 priority が total=0 → `'完了 0 件 (該当なし)'`。
 */
export function formatDueHitRateByPriorityJa(byPriority: DueHitRateByPriority): string {
  const parts: string[] = []
  for (const k of PRIORITY_ORDER) {
    const stats = byPriority[k]
    if (stats.total === 0 || stats.hitRate === null) continue
    const pct = rateToPct(stats.hitRate)
    parts.push(`P${k} ${pct}% (${stats.hit}/${stats.total})`)
  }
  if (parts.length === 0) return '完了 0 件 (該当なし)'
  return `期限達成率: ${parts.join(' / ')}`
}

/**
 * iter343 basics: hit rate を「達成 / 中立 / 警戒」の 3 値 tone bucket に分類する糖衣。
 * dashboard chip の配色 (emerald / muted / amber) を割り当てるのに使う。
 *
 * 閾値: hitRate >= 0.8 → 'good'、0.5 ≤ rate < 0.8 → 'neutral'、< 0.5 → 'warn'。
 * total=0 / hitRate=null は 'neutral' (中立)。
 */
export type DueHitRateTone = 'good' | 'neutral' | 'warn'

export function dueHitRateTone(stats: DueHitRateStats): DueHitRateTone {
  if (stats.total === 0 || stats.hitRate === null) return 'neutral'
  if (stats.hitRate >= 0.8) return 'good'
  if (stats.hitRate >= 0.5) return 'neutral'
  return 'warn'
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'期限達成率: 80% (12 / 15 件)'` (= hit/total)
 *   `'期限達成率: 100% (5 / 5 件)'`
 *   `'期限達成率: 0% (0 / 3 件 — 全て遅延)'`
 *   `'完了 0 件 (該当なし)'` — dueDate 付き完了 item が無い
 *
 * パーセントは 0 桁丸め (`Math.round(rate * 100)`)。0% / 100% も明示。
 */
export function formatDueHitRateJa(stats: DueHitRateStats): string {
  if (stats.total === 0 || stats.hitRate === null) return '完了 0 件 (該当なし)'
  const pct = rateToPct(stats.hitRate)
  const tail = pct === 0 ? ' — 全て遅延' : ''
  return `期限達成率: ${pct}% (${stats.hit} / ${stats.total} 件${tail})`
}

/**
 * iter798 basics: due-hit-rate を ChipTone (5 段階共通 vocab) に変換する糖衣。
 * 既存 `dueHitRateTone` は 3 値 (good/neutral/warn) で dashboard chip 専用、
 * 本 helper は analytics chip 全軸で共通の `ChipTone` (success/info/warn/idle)
 * 軸に揃える。
 *
 * 配色 (positive polarity = hit rate 高いほど良い):
 *  - hitRate >= 0.8         → 'success' (emerald、達成、existing 'good' 相当)
 *  - 0.5 <= hitRate < 0.8   → 'info'    (blue、中立、existing 'neutral' 相当)
 *  - hitRate < 0.5          → 'warn'    (amber、警戒、existing 'warn' 相当)
 *  - total=0 / hitRate=null → 'idle'    (slate、該当なし、existing 'neutral' から区別)
 *
 * 既存 `dueHitRateTone` (iter343) は backward-compat 維持、新規 chip 配線は
 * `dueHitRateChipTone` を使うことで analytics-signals 全軸と配色 vocabulary 統一。
 */
export function dueHitRateChipTone(stats: DueHitRateStats): ChipTone {
  if (stats.total === 0 || stats.hitRate === null) return 'idle'
  if (stats.hitRate >= 0.8) return 'success'
  if (stats.hitRate >= 0.5) return 'info'
  return 'warn'
}

/**
 * iter798 basics: due-hit-rate を `AgentBriefSignal` 形式 (text + tone) に変換する
 * compose helper。iter794-797 の `*ToBriefSignal` パターン継承。
 *
 * caller (= AI 朝 brief / Slack daily digest / dashboard chip) は本 helper 出力を
 * `composeAnalyticsSignals` の 6 軸目候補として活用 (= 期限遵守度を chip 表示)。
 */
export function dueHitRateToBriefSignal(stats: DueHitRateStats): AgentBriefSignal {
  return {
    text: formatDueHitRateJa(stats),
    tone: dueHitRateChipTone(stats),
  }
}
