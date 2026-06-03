/**
 * iter302 ai-automation: items の完了 (doneAt) を「直近 N 日の日別 done 数」に
 * 集計する pure helper。
 *
 * iter294 (must-risk) / iter299 (stale-items) と並ぶ AI substrate。AI 朝 brief /
 * sprint burndown / pm-agent / dashboard widget が「直近 7 日の完了ペース」
 * (= velocity) を 1 関数で取り出せるようにする。今までは dashboard service が
 * SQL で集計、sprint burndown が inline で計算と 2 系統で別実装だった → pure
 * 関数として固定し prompt や UI で再利用可能に。
 *
 * 仕様:
 *  - 入力: items 配列 + `windowDays` (default 7) + `today` (default now)
 *  - 出力:
 *    - `byDay`: 各日の `{ date: 'YYYY-MM-DD', count }` を「古い順」に N 日分
 *    - `total`: 全 done 件数 (全期間 windowDays 以内)
 *    - `avgPerDay`: total / windowDays (小数点あり)
 *    - `trend`: 前半 N/2 日 vs 後半 N/2 日 の比較で `'up' | 'flat' | 'down'`
 *      ((後半 - 前半) / max(1, 前半) >= +0.2 → up、≤ -0.2 → down、それ以外 flat)
 *  - 不正 doneAt は除外 (fail-soft)、windowDays<=0 は空 result
 *  - archive 済 / deletedAt の done item は集計に含める (= 一度完了したものは消えない)
 *
 * iter1704-1712 streak milestone substrate (UX 卓越憲章 派生 P0「Dashboard × 軸5 やる気」):
 *  - StreakMilestone 6 段階分類 (none/bronze/silver/gold/platinum/legend、3/7/14/30/100 日階段)
 *  - streakMilestoneLabelJa (🥉🥈🥇💎👑 + 日本語 chip 文言)
 *  - streakMilestoneChipTone (positive polarity: none→idle / bronze→info / silver+→success)
 *  - formatStreakWithMilestoneJa (数字 + label 1 行統合)
 *  - classifyStreakMilestoneTransition (achieved / broken / maintained 検知)
 *  - streakToBriefSignal (AgentBriefSignal compose、text + tone)
 *  - computeCompletionStreakExcludingToday (prev 取得、transition source)
 *  - formatStreakTransitionJa (achieved 🎉 / broken 😢 toast 文言)
 *  - computeStreakChain (orchestrator、1 call で全 chain data 取得)
 *
 * iter1716-1720 streak best-comparison substrate (best streak への pull motivator):
 *  - formatStreakBestComparisonJa (現在 vs best 1 行 比較 text、単独 chip 用)
 *  - streakComparisonToBriefSignal (curr/best → 比較 chip text+tone)
 *  - computeStreakComparisonSignal (summary → 比較 chip orchestrator)
 *  - formatStreakBestSuffix (milestone と組合せ用 suffix のみ、重複なし統合)
 *  - composeStreakBriefSignals (summary → { milestone, comparison } 2 chip fan-out)
 *
 * iter1726-1727 today done count substrate (UX 卓越憲章 派生 P0「Today × 軸5 やる気」):
 *  - countDoneToday (今日 done 件数、軽量 O(items))
 *  - formatDoneTodayJa (0→「まだ 0 件」 / 1→「1 件完了」 / 2+→「N 件完了!」)
 *  - doneTodayToBriefSignal (今日完了 chip text+tone、idle/info/success 3 段階)
 *
 * 上記 substrate の AnalyticsSignals 統合: iter1715 streakMilestone (= 19 軸目) +
 * iter1719 streakComparison (= 20 軸目) + iter1728 doneToday (= 21 軸目)。
 * UI 配線: iter1709/1721/1724 dashboard velocity chip + iter1729-1730 Today view header chip。
 */
import { formatLocalISO, MS_PER_DAY, parseDateOrNull, toLocalMidnight } from '@/lib/date/iso'
import { makeHintLabelFormatter } from '@/lib/hint'
import { type ChipTone } from '@/lib/ui/chip-tone'

import { type AgentBriefSignal } from '@/features/agent/brief-signal'

import { bucketByPriorityWith, formatPriorityBucketsLabeled, type PriorityKey } from './priority'

export interface VelocityFields {
  doneAt: Date | string | null | undefined
}

export interface VelocityByPriorityFields extends VelocityFields {
  priority: number | null | undefined
}

export interface VelocityDay {
  /** 'YYYY-MM-DD' (local TZ) */
  date: string
  count: number
}

export interface VelocitySummary {
  byDay: VelocityDay[]
  total: number
  avgPerDay: number
  trend: 'up' | 'flat' | 'down'
}

export interface VelocityOptions {
  /** 集計対象日数。default 7 (= 過去 7 日 + 今日 = 7 日 window)。 */
  windowDays?: number
}

/**
 * 直近 windowDays 日 (today 含む) の done count を日別 + 集計値で返す。
 * trend は 前半 N/2 日 / 後半 N/2 日 の done 数比較。
 */
export function computeVelocity<T extends VelocityFields>(
  items: readonly T[],
  options: VelocityOptions = {},
  today: Date | string = new Date(),
): VelocitySummary {
  const windowDays = options.windowDays ?? 7
  if (windowDays <= 0) {
    return { byDay: [], total: 0, avgPerDay: 0, trend: 'flat' }
  }
  const todayDate = toLocalMidnight(parseDateOrNull(today))
  if (!todayDate) {
    return { byDay: [], total: 0, avgPerDay: 0, trend: 'flat' }
  }

  // window: today から windowDays - 1 日前まで (= 合計 windowDays 日)
  const dayCounts = new Map<string, number>()
  const dates: string[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(todayDate.getTime() - i * MS_PER_DAY)
    const key = formatLocalISO(d)
    dayCounts.set(key, 0)
    dates.push(key)
  }

  for (const it of items) {
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    const local = toLocalMidnight(done)
    if (!local) continue
    const key = formatLocalISO(local)
    if (!dayCounts.has(key)) continue
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }

  const byDay: VelocityDay[] = dates.map((date) => ({ date, count: dayCounts.get(date) ?? 0 }))
  const total = byDay.reduce((sum, d) => sum + d.count, 0)
  const avgPerDay = total / windowDays

  // trend: 前半 / 後半 を比較。windowDays が奇数の場合は中央 1 日を後半に含める
  const half = Math.floor(windowDays / 2)
  let firstHalf = 0
  let secondHalf = 0
  for (let i = 0; i < byDay.length; i++) {
    const day = byDay[i]
    if (!day) continue
    if (i < half) firstHalf += day.count
    else secondHalf += day.count
  }
  const trend = computeTrend(firstHalf, secondHalf)

  return { byDay, total, avgPerDay, trend }
}

function computeTrend(firstHalf: number, secondHalf: number): 'up' | 'flat' | 'down' {
  const denom = Math.max(1, firstHalf)
  const ratio = (secondHalf - firstHalf) / denom
  if (ratio >= 0.2) return 'up'
  if (ratio <= -0.2) return 'down'
  return 'flat'
}

/**
 * AI prompt 用 1 行サマリ:
 *   `直近 7 日 velocity: 12 件 (1.7 件/日、傾向 up)`
 * 0 件は `'直近 7 日 velocity: 0 件'`。
 */
export function formatVelocitySummary(summary: VelocitySummary, windowDays = 7): string {
  if (summary.total === 0) return `直近 ${windowDays} 日 velocity: 0 件`
  const avg = summary.avgPerDay.toFixed(1)
  const trendLabel: Record<VelocitySummary['trend'], string> = {
    up: 'up',
    flat: 'flat',
    down: 'down',
  }
  return `直近 ${windowDays} 日 velocity: ${summary.total} 件 (${avg} 件/日、傾向 ${trendLabel[summary.trend]})`
}

// iter305 refactor: parseDateOrNull (lib/date/iso) に集約 (3 callsite 重複削除)。
// iter340 refactor: toLocalMidnight / formatLocalISO も lib/date/iso に集約。

/**
 * iter452 ai-automation: velocity を priority 別に集計する pure helper。
 *
 * iter386 / iter391 / iter406 / iter408 / iter414 / iter429 / iter432 / iter434 /
 * iter437 と並ぶ「× priority」軸シリーズの velocity 軸版 (10 弾目)。AI 朝 brief /
 * pm-agent prompt / dashboard widget が「直近 7 日: P1 done 3 件 / P3 done 5 件」
 * のような P 別 完了ペースを 1 関数で取り出せる substrate。「高優先消化が遅い /
 * 低優先ばかり消化」 bias 検出に使える (= iter354 wip-by-priority と相補、wip は
 * 'in_progress' / 本 helper は 'done')。
 *
 * 仕様:
 *  - 各 priority bucket で `computeVelocity` を呼び、count + avgPerDay を抽出
 *  - count=0 でも全 4 bucket は必ず初期化 (undefined チェック不要)
 *  - bucketByPriorityWith (iter365) を委譲
 */
export interface VelocityPriorityStats {
  count: number
  /** count / windowDays、小数点あり (= 件/日) */
  avgPerDay: number
}

export type VelocityByPriority = Record<PriorityKey, VelocityPriorityStats>

export function computeVelocityByPriority<T extends VelocityByPriorityFields>(
  items: readonly T[],
  options: VelocityOptions = {},
  today: Date | string = new Date(),
): VelocityByPriority {
  return bucketByPriorityWith(items, (group) => {
    const summary = computeVelocity(group, options, today)
    return { count: summary.total, avgPerDay: summary.avgPerDay }
  })
}

/**
 * AI prompt / dashboard chip aria-label 用 priority 別 1 行サマリ:
 *   '直近 7 日 velocity: P1 3 件 (0.4件/日) / P3 5 件 (0.7件/日)'
 *
 * count=0 bucket は省略、全 0 → '直近 7 日 velocity 0 件'。iter386/408/414/429/
 * 432/434/437 と同じ '{label}: P1 ... / P3 ...' 形式。
 */
export function formatVelocityByPriorityJa(
  byPriority: VelocityByPriority,
  windowDays: number = 7,
): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, s) => (s.count === 0 ? null : `P${k} ${s.count} 件 (${s.avgPerDay.toFixed(1)}件/日)`),
    `直近 ${windowDays} 日 velocity`,
    `直近 ${windowDays} 日 velocity 0 件`,
  )
}

/**
 * iter454 ai-automation: velocity の trend (up/flat/down) を「1 word jp ヒント」に
 * 整形する hint helper。既存 `VelocitySummary.trend` の英語 enum を「加速中 / 安定 /
 * 減速中 / 完了なし」の 4 状態 jp 表記に出し分け。
 *
 * iter424 / iter439 / iter442 / iter444 / iter447 / iter449 と並ぶ「item axis 1-word
 * state」シリーズの velocity-trend 軸版 (7 弾目)。AI 朝 brief / pm-agent / dashboard
 * chip / Slack 通知が「workspace の完了ペース傾向」を 1 word で出せる substrate。
 *
 * 4 状態:
 *  - 'idle' → '完了なし'   (total === 0、windowDays 内の done item ゼロ)
 *  - 'up'   → '加速中'      (前半 → 後半で +20%+ 増加)
 *  - 'flat' → '安定'        (-20% ≤ 増減 ≤ +20%)
 *  - 'down' → '減速中'      (前半 → 後半で -20%- 減少)
 *
 * 既存 `formatVelocitySummary` の trendLabel (= up/flat/down 英語) と相補で「英語
 * enum vs 1 word jp 文言」を出し分け。caller は trend を SR / chip aria-label に
 * 1 単語で込められる。
 */
export type VelocityHint = 'idle' | 'up' | 'flat' | 'down'

export function classifyVelocityHint(summary: VelocitySummary): VelocityHint {
  if (summary.total === 0) return 'idle'
  return summary.trend
}

const VELOCITY_HINT_LABEL_JA: Record<VelocityHint, string> = {
  idle: '完了なし',
  up: '加速中',
  flat: '安定',
  down: '減速中',
}

export const formatVelocityHintJa = makeHintLabelFormatter(
  classifyVelocityHint,
  VELOCITY_HINT_LABEL_JA,
)

/**
 * iter457 ai-automation: 「直近 N 日のうち done が 1 件以上あった連続日数」を
 * 計算する pure helper (= completion streak)。
 *
 * `VelocitySummary.byDay` (= 古い順 N 日分の日別 done count) から today (= 末尾)
 * から遡って count > 0 の連続日数を返す。今日 done なしなら 0、今日 + 昨日 done
 * ありなら 2、…のような GitHub contribution streak スタイル。
 *
 * caller benefits:
 *  - AI 朝 brief / Slack 通知が「3 日連続で何か完了している!」のような positive
 *    reinforcement を 1 関数で出せる
 *  - dashboard widget で「streak: 5 日」を表示
 *  - momentum hint (iter449) が件数ベース、本 helper は 連続性ベース、相補
 *
 * 仕様:
 *  - byDay 空 → streak=0
 *  - 末尾日 (= today) count=0 → streak=0 (= 今日まだ done なし、streak 途切れ)
 *  - 末尾から遡って count > 0 が続く間 streak++、count=0 で break
 *  - byDay 全日 count > 0 → byDay.length (= window 全期間 streak)
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function computeCompletionStreak(summary: VelocitySummary): number {
  let streak = 0
  for (let i = summary.byDay.length - 1; i >= 0; i--) {
    const day = summary.byDay[i]
    if (!day || day.count === 0) break
    streak += 1
  }
  return streak
}

/**
 * iter1726 basics: 今日 done になった item の件数を返す pure helper。
 *
 * UX 卓越憲章 派生 P0「Today × 軸5 やる気 — 今日合計時間 / 残時間 / 進捗 bar /
 * 累計完了 chip」 の「累計完了 chip」 substrate。Today view / dashboard / Slack
 * daily digest が「今日 X 件完了!」 chip を 1 関数で取得できる。
 *
 * 仕様:
 *  - items の各 item.doneAt が today (local TZ) と同日なら count
 *  - 不正 doneAt / null / undefined は除外 (fail-soft)
 *  - 0 → 0 (励まし sentinel は `formatDoneTodayJa` 側で扱う)
 *
 * 既存 helper との関係:
 *  - `computeVelocity(items, { windowDays: 1 })` の byDay[0].count と等価だが、
 *    velocity 集計の overhead (= byDay 配列構築 + trend 計算) を排し O(items) で
 *    完結する軽量 helper。Today view のような「今日のみ」 chip caller 用。
 *  - `computeCompletionStreak` (iter457) は「末尾連続」、本 helper は「今日 1 日のみ」
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function countDoneToday<T extends VelocityFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): number {
  const todayDate = toLocalMidnight(parseDateOrNull(today))
  if (!todayDate) return 0
  const todayISO = formatLocalISO(todayDate)
  let count = 0
  for (const it of items) {
    const d = parseDateOrNull(it.doneAt)
    if (!d) continue
    const localMidnight = toLocalMidnight(d)
    if (!localMidnight) continue
    if (formatLocalISO(localMidnight) === todayISO) count += 1
  }
  return count
}

/**
 * iter1733 basics: 過去 N 日間 (today 含む) に done になった item 件数を返す pure helper。
 *
 * iter1726 `countDoneToday` の N 日範囲版。windowDays=1 で countDoneToday と等価、
 * windowDays=7 で「今週累計」、windowDays=30 で「今月累計」 を取得可能。Today view /
 * dashboard / Slack daily/weekly digest が「今週 X 件完了!」 / 「今月 X 件完了!」 を
 * 1 関数で取得できる substrate。
 *
 * 仕様:
 *  - items 各 item.doneAt が `[today - (windowDays-1) 日 0時, today 23:59]` 範囲内なら count
 *  - 不正 doneAt / null / undefined は除外 (fail-soft)
 *  - windowDays <= 0 → 0 (空 result)
 *  - windowDays=1 → countDoneToday と完全等価 (= 今日 1 日のみ)
 *
 * 既存 helper との関係:
 *  - `computeVelocity(items, { windowDays })` の byDay の総 count 和と等価だが、
 *    velocity 集計の overhead (= byDay 配列構築 + trend 計算) を排し O(items) で完結
 *  - `countDoneToday` (iter1726) は本 helper の windowDays=1 特化版
 *
 * 0 から始まる pure 関数、副作用なし。
 */
/**
 * iter1736 basics: 今日 done になった item を priority 別に集計する pure helper。
 *
 * iter1726 `countDoneToday` の priority bucket 版。dashboard / Today view の「今日完了
 * by priority」 disclosure (= 「P1 1 件 / P3 2 件」) を 1 関数で取得可能。
 *
 * 仕様:
 *  - priority 1-4 を key とする Record<1|2|3|4, number>
 *  - priority null / undefined / 範囲外 → P4 集約 (= `computeVelocityByPriority` と同
 *    bucketing rule)
 *  - doneAt が today と同日のみ count
 *  - 不正 doneAt は除外 (fail-soft)
 *
 * `formatPriorityBucketsLabeled` で 1 行 ja-JP 化可能。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function countDoneTodayByPriority<T extends VelocityByPriorityFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): Record<PriorityKey, number> {
  const out: Record<PriorityKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const todayDate = toLocalMidnight(parseDateOrNull(today))
  if (!todayDate) return out
  const todayISO = formatLocalISO(todayDate)
  for (const it of items) {
    const d = parseDateOrNull(it.doneAt)
    if (!d) continue
    const localMidnight = toLocalMidnight(d)
    if (!localMidnight) continue
    if (formatLocalISO(localMidnight) !== todayISO) continue
    const p: PriorityKey =
      it.priority === 1 || it.priority === 2 || it.priority === 3 ? it.priority : 4
    out[p] += 1
  }
  return out
}

export function countDoneInDays<T extends VelocityFields>(
  items: readonly T[],
  windowDays: number,
  today: Date | string = new Date(),
): number {
  if (windowDays <= 0) return 0
  const todayDate = toLocalMidnight(parseDateOrNull(today))
  if (!todayDate) return 0
  // window 開始日 = today - (windowDays - 1) 日 (= 今日含む N 日)
  const startDate = new Date(todayDate.getTime() - (windowDays - 1) * MS_PER_DAY)
  const startISO = formatLocalISO(startDate)
  const endISO = formatLocalISO(todayDate)
  let count = 0
  for (const it of items) {
    const d = parseDateOrNull(it.doneAt)
    if (!d) continue
    const localMidnight = toLocalMidnight(d)
    if (!localMidnight) continue
    const iso = formatLocalISO(localMidnight)
    if (iso >= startISO && iso <= endISO) count += 1
  }
  return count
}

/**
 * iter1735 refactor: 「<prefix> まだ 0 件 / 1 件完了 / N 件完了!」 共通 format を
 * 1 関数に集約 (= formatDoneTodayJa / formatDoneInDaysJa の重複ロジック解消)。
 *
 * caller は prefix (= 「今日」 / 「過去 7 日」 / 「今週」 等) のみ渡せば一貫 polarity の
 * 1 行 ja-JP chip text を取得可能。
 */
function formatDoneCountJa(prefix: string, count: number): string {
  if (count <= 0) return `${prefix} まだ 0 件`
  if (count === 1) return `${prefix} 1 件完了`
  return `${prefix} ${count} 件完了!`
}

/**
 * iter1735 refactor: count → ChipTone (positive polarity 3 段階) の共通 mapping。
 * doneTodayToBriefSignal / doneInDaysToBriefSignal の tone logic を 1 関数に集約。
 *
 * polarity:
 *  - count <= 0 → 'idle' (まだ動いてない)
 *  - count === 1 → 'info' (動き出した)
 *  - count >= 2 → 'success' (達成感)
 */
function doneCountTone(count: number): ChipTone {
  if (count <= 0) return 'idle'
  if (count === 1) return 'info'
  return 'success'
}

/**
 * iter1726 basics: 今日完了件数を ja-JP 1 行 chip text に整形する pure helper。
 *
 * 仕様 (出力 pattern):
 *  - count === 0 → '今日 まだ 0 件' (= 励まし、強い責めなし)
 *  - count === 1 → '今日 1 件完了' (= 控えめ感謝、まだ 1 件)
 *  - count >= 2  → `今日 ${count} 件完了!` (= 強調、達成感 + ! 付与)
 *
 * 設計意図: 0 で「まだ 0 件」 = 「これからやれば伸びる」 / 1 で「完了」 / 2+ で「!」 付与
 * は milestone 系 chip と一貫した polarity (Duolingo / Streak.app の表現と整合)。
 *
 * iter1735 refactor: 内部実装を共通 `formatDoneCountJa('今日', count)` に委譲。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function formatDoneTodayJa(count: number): string {
  return formatDoneCountJa('今日', count)
}

/**
 * iter1727 ai-automation: 今日完了件数を `AgentBriefSignal` (text + tone) に変換する
 * compose helper。`composeAnalyticsSignals` に 21 軸目として追加可能な substrate。
 *
 * iter1726 `countDoneToday` + `formatDoneTodayJa` の chip 化版。AI 朝 brief / Slack
 * daily digest / dashboard 「やる気」 panel が「今日 N 件完了!」 chip を 1 関数で取得。
 *
 * text: `formatDoneTodayJa(count)`
 * tone (positive polarity):
 *  - count === 0 → 'idle' (= まだ動いてない、責めずに表示)
 *  - count === 1 → 'info' (= 動き始めた、控えめ青)
 *  - count >= 2  → 'success' (= 達成感、緑強調)
 *
 * caller pattern (1 chip render):
 *   const done = countDoneToday(items, today)
 *   const sig = doneTodayToBriefSignal(done)
 *   <Chip text={sig.text} tone={sig.tone} />
 *
 * 設計意図: 0 で idle (= chip 非表示 progressive disclosure も可)、1 で info (=
 * 動き出した、青)、2+ で success (= 達成感、緑) と段階的に tone を上げることで
 * 「今日の progression」 を一目で示す。Duolingo「Today's progress」 / GitHub
 * Contributions の day-level intensity と同 polarity 設計。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function doneTodayToBriefSignal(count: number): AgentBriefSignal {
  return { text: formatDoneTodayJa(count), tone: doneCountTone(count) }
}

/**
 * iter1734 ai-automation: N 日範囲累計完了を ja-JP 1 行 chip text に整形する pure helper。
 *
 * `formatDoneTodayJa` (iter1726、= 今日のみ) の N 日範囲版。windowDays=7 で「今週」、
 * =30 で「今月」、=14 で「過去 2 週間」 等、Slack daily/weekly digest が同 helper で
 * 複数の window 軸を 1 行 chip 化可能。
 *
 * 仕様 (出力 pattern):
 *  - count <= 0 → `'過去 N 日 まだ 0 件'` (= 励まし、強い責めなし)
 *  - count === 1 → `'過去 N 日 1 件完了'` (= 控えめ感謝)
 *  - count >= 2  → `'過去 N 日 ${count} 件完了!'` (= 強調、達成感)
 *
 * windowDays をテキスト先頭に出すことで、複数 chip 並列時 (= 「今日 3 件 / 今週 12 件
 * / 今月 47 件」) でも各 chip の scope が一目で分かる UX を作る。
 *
 * 設計意図: `formatDoneTodayJa` は「今日」 特化で text に「今日」 prefix、本 helper は
 * 「過去 N 日」 generic prefix で window scope を明示。caller が windowDays=1 で呼んでも
 * 動作するが、その場合「過去 1 日」 という冗長な表記になるので caller 側で format 切替
 * 推奨 (= 今日のみは formatDoneTodayJa、N 日範囲は本 helper)。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function formatDoneInDaysJa(count: number, windowDays: number): string {
  return formatDoneCountJa(`過去 ${windowDays} 日`, count)
}

/**
 * iter1734 ai-automation: N 日範囲累計完了を `AgentBriefSignal` (text + tone) に変換する
 * compose helper。`doneTodayToBriefSignal` (iter1727、= 今日のみ) の N 日範囲版。
 *
 * text: `formatDoneInDaysJa(count, windowDays)`
 * tone (positive polarity 3 段階、doneTodayToBriefSignal と同 polarity):
 *  - count <= 0 → 'idle'
 *  - count === 1 → 'info'
 *  - count >= 2 → 'success'
 *
 * caller pattern (Slack weekly digest 達成感 cluster):
 *   const weekDone = countDoneInDays(items, 7, today)
 *   const monthDone = countDoneInDays(items, 30, today)
 *   const signals = [
 *     doneInDaysToBriefSignal(weekDone, 7),
 *     doneInDaysToBriefSignal(monthDone, 30),
 *   ]
 *   slack.post(signals.map(s => `• ${s.text}`).join('\n'))
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function doneInDaysToBriefSignal(count: number, windowDays: number): AgentBriefSignal {
  return { text: formatDoneInDaysJa(count, windowDays), tone: doneCountTone(count) }
}

/**
 * iter1710 basics: 「昨日時点の streak」 (= 末尾を除いて遡った連続日数) を計算する pure helper。
 *
 * `computeCompletionStreak` は「末尾今日からの連続」 (= 現在 streak)、本 helper は
 * **末尾を除外して** 遡った streak。`classifyStreakMilestoneTransition(prevStreak,
 * currStreak)` (iter1707) の `prevStreak` を 1 関数で取得するための substrate。
 *
 * caller pattern:
 *   const summary = computeVelocity(items, {}, today)
 *   const curr = computeCompletionStreak(summary)        // = 今日含む 末尾連続
 *   const prev = computeCompletionStreakExcludingToday(summary) // = 昨日まで 末尾連続
 *   const transition = classifyStreakMilestoneTransition(prev, curr)
 *   if (transition === 'achieved') showConfetti()
 *
 * 仕様:
 *  - byDay.length < 2 → 0 (= 過去 1 日以下では streak 判定不能)
 *  - 末尾 (= today) を除いた byDay[..-2] を末尾から遡って count>0 連続を数える
 *  - 末尾 1 つ手前 (= yesterday) count=0 → 0 (= 昨日 done なし = 昨日まで streak 途切れ)
 *  - 末尾 1 つ手前から全日 count>0 → byDay.length - 1
 *
 * 用途:
 *  - dashboard streak chip で「今日 streak が伸びたか」 を transition 判定
 *  - daily cron で前日との比較で confetti / Slack 通知 trigger
 *  - achievement 履歴の検証 (= 「ちょうど milestone 移行した日」 を遡って算出)
 */
export function computeCompletionStreakExcludingToday(summary: VelocitySummary): number {
  if (summary.byDay.length < 2) return 0
  let streak = 0
  for (let i = summary.byDay.length - 2; i >= 0; i--) {
    const day = summary.byDay[i]
    if (!day || day.count === 0) break
    streak += 1
  }
  return streak
}

/**
 * AI prompt 用 1 行サマリ:
 *   '完了 streak 0 日 (今日まだ完了なし)'
 *   '完了 streak 1 日 (今日完了あり)'
 *   '完了 streak 5 日連続!'
 */
export function formatCompletionStreakJa(streak: number): string {
  if (streak === 0) return '完了 streak 0 日 (今日まだ完了なし)'
  if (streak === 1) return '完了 streak 1 日 (今日完了あり)'
  return `完了 streak ${streak} 日連続!`
}

/**
 * iter1704 basics: streak (日数) を 6 段階の「達成 milestone」に分類する pure helper。
 *
 * UX 卓越憲章 派生 P0「Dashboard × 軸5 やる気 — 連続完了 streak (3/5/7 日 マイルストーン
 * badge)」 の substrate。dashboard chip / Slack 通知 / Inbox 上部 badge で「streak が milestone
 * を超えた瞬間」 を強調するための分類軸。Duolingo / GitHub Contributions / Streak.app の
 * milestone UI と整合。
 *
 * 6 milestone 段階:
 *  - 'none'    (streak < 3、まだマイルストーン未到達)
 *  - 'bronze'  (streak ∈ [3, 6]、3 日連続 = 習慣化初動)
 *  - 'silver'  (streak ∈ [7, 13]、1 週間連続 = 習慣化確立)
 *  - 'gold'    (streak ∈ [14, 29]、2 週間連続 = 習慣化定着)
 *  - 'platinum' (streak ∈ [30, 99]、1 ヶ月連続 = 達人領域)
 *  - 'legend'  (streak >= 100、100 日連続!)
 *
 * 仕様:
 *  - 負の数 / 0 / NaN / Infinity → 'none' (defensive、streak は非負前提)
 *  - 閾値は GitHub Contributions の「Longest streak」 階段と Duolingo の Achievements を参考に
 *    3 / 7 / 14 / 30 / 100 日に設定
 *  - chip-tone への bind は別 helper (本 iter scope 外、UI 配色は次 iter で決定)
 *
 * 用途:
 *  - dashboard 「現在 streak」 chip に milestone badge (🥉 🥈 🥇 💎 👑) を付与
 *  - milestone 到達瞬間の toast / confetti trigger 判定
 *  - Slack daily digest「今週 silver 達成!」 自動通知
 *  - AI 朝 brief headline「streak gold (14 日連続)」
 */
export type StreakMilestone = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend'

export function getStreakMilestone(streak: number): StreakMilestone {
  if (!Number.isFinite(streak) || streak < 3) return 'none'
  if (streak >= 100) return 'legend'
  if (streak >= 30) return 'platinum'
  if (streak >= 14) return 'gold'
  if (streak >= 7) return 'silver'
  return 'bronze'
}

const STREAK_MILESTONE_LABEL_JA: Record<StreakMilestone, string> = {
  none: 'マイルストーン前',
  bronze: '🥉 ブロンズ (3 日連続)',
  silver: '🥈 シルバー (1 週間連続)',
  gold: '🥇 ゴールド (2 週間連続)',
  platinum: '💎 プラチナ (1 ヶ月連続)',
  legend: '👑 レジェンド (100 日連続!)',
}

/**
 * iter1704 basics: streak milestone を日本語 chip label に整形 (UI / Slack / AI brief 共通)。
 * caller は `getStreakMilestone(streak)` の結果を本 helper に渡して chip 文言を取得。
 */
export function streakMilestoneLabelJa(m: StreakMilestone): string {
  return STREAK_MILESTONE_LABEL_JA[m]
}

/**
 * iter1705 basics: streak milestone を ChipTone (= 配色 token) に変換する pure bridge。
 *
 * iter1704 で出した `StreakMilestone` 6 段階 を UI chip / dashboard badge / Slack notification
 * の **視覚配色** に bind するための substrate。
 *
 * positive polarity (= 高 milestone ほど positive を強調、severity 軸とは逆):
 *  - 'none'     → 'idle'    (= グレー、未到達 = 視覚的に控えめ)
 *  - 'bronze'   → 'info'    (= 青、初動 = neutral だが positive 兆し)
 *  - 'silver'   → 'success' (= 緑、習慣化確立 = 達成)
 *  - 'gold'     → 'success' (= 緑、習慣化定着 = 達成、silver と同 success bucket lossy)
 *  - 'platinum' → 'success' (= 緑、達人領域 = 達成、強調は label の 💎 で)
 *  - 'legend'   → 'success' (= 緑、100 日 = 達成、強調は label の 👑 で)
 *
 * 設計意図: severity 軸 (danger / warn / info / idle / success) の **positive 軸** で
 * milestone を表現。high milestone (silver+) は全て `success` に縮約 (= 一度習慣化したら
 * 全部「達成」として褒める)、特別感は emoji + label で出す。これで chip の border / bg / text
 * が緑系で一貫し、milestone 移行時に視覚的な「色が変わる驚き」 を 1 度だけに集約 (= bronze→silver
 * = info→success の transition が UI の wow ポイント)。
 *
 * `velocityChipTone` (iter802、4 hint → 4 tone の positive polarity) と同 polarity 軸。
 *
 * 用途:
 *  - dashboard streak badge の border / bg 色決定
 *  - milestone 到達 toast の tone bind (= info → success の transition 時に confetti trigger)
 *  - Slack daily digest 「streak [tone] 」 chip 配色
 */
const STREAK_MILESTONE_CHIP_TONE: Record<StreakMilestone, ChipTone> = {
  none: 'idle',
  bronze: 'info',
  silver: 'success',
  gold: 'success',
  platinum: 'success',
  legend: 'success',
}

export function streakMilestoneChipTone(m: StreakMilestone): ChipTone {
  return STREAK_MILESTONE_CHIP_TONE[m]
}

/**
 * iter1706 basics: streak 数 + milestone label を 1 行 ja-JP に統合 (UI / Slack / AI brief 共通)。
 *
 * iter1704 `formatCompletionStreakJa` (= 数字のみ) + iter1704 `streakMilestoneLabelJa` (= milestone
 * label のみ) を 1 関数で出す合成 helper。caller が 2 関数を別々に呼んで concat する boilerplate
 * を排除。dashboard chip / Slack daily digest / AI 朝 brief で「現在 streak + 到達 milestone」
 * を 1 行で表示。
 *
 * 出力形式:
 *  - streak=0 → '完了 streak 0 日 (今日まだ完了なし)' (milestone 'none' は表示しない、empty 状態)
 *  - streak < 3 (= bronze 未満) → '完了 streak 2 日連続!' (milestone なし、シンプルに数字のみ)
 *  - streak >= 3 → '完了 streak 5 日連続! 🥈 シルバー (1 週間連続)' (milestone label を末尾に付与)
 *
 * 設計意図: milestone 未到達時は数字だけ淡々と、milestone 到達時 (= bronze 以上) に label を
 * 付けて達成感を出す。これで AI brief / Slack 通知が「streak が milestone に乗ったタイミング」
 * のみ強調表示できる (= ノイズ削減 + やる気アップ)。
 *
 * 既存 helper との関係:
 *  - `formatCompletionStreakJa(streak)`: 数字のみ整形 (= milestone 不要な場面)
 *  - `streakMilestoneLabelJa(m)`: label のみ整形 (= 数字不要な場面)
 *  - 本 helper: 両方を 1 行に統合 (= dashboard chip / digest 用)
 */
export function formatStreakWithMilestoneJa(streak: number): string {
  const base = formatCompletionStreakJa(streak)
  const milestone = getStreakMilestone(streak)
  if (milestone === 'none') return base
  return `${base} ${streakMilestoneLabelJa(milestone)}`
}

const STREAK_MILESTONE_RANK: Record<StreakMilestone, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  legend: 5,
}

/**
 * iter1707 basics: streak milestone 到達 (= 昨日 → 今日 で 1 段上がった) を検知する pure helper。
 *
 * dashboard chip / Slack 通知 / Toast / confetti trigger で「ちょうど milestone を超えた瞬間」
 * を判定する用。caller は前日 streak と今日 streak を渡して `'achieved'` (= 何らかの milestone
 * 到達) / `'maintained'` (= 同 milestone 内に留まる) / `'broken'` (= streak 途切れ = milestone
 * 降格) を取得。
 *
 * 仕様:
 *  - `prevStreak` = 昨日時点の streak (例: VelocitySummary を昨日 today で計算した値)
 *  - `currStreak` = 今日時点の streak (例: 今日 done あり → prev+1、なし → 0)
 *  - 返り値:
 *    - `'achieved'`: milestone rank が前日より上がった (= bronze→silver / silver→gold 等)、
 *      または new milestone 到達 (= 'none' → 'bronze')
 *    - `'broken'`: milestone rank が下がった (= 多くは streak 途切れで none に戻る)
 *    - `'maintained'`: 同 milestone 内、または 'none' → 'none' (= 何も起きていない)
 *  - 不正値 (負/NaN/Infinity) は `getStreakMilestone` 側で 'none' に縮約されるため透過処理
 *
 * 用途:
 *  - 'achieved' → confetti / toast / Slack 通知 trigger (= 達成感の wow ポイント)
 *  - 'broken' → 「streak 途切れた、また始めよう」 励まし toast
 *  - 'maintained' → 何もしない (= UI ノイズ削減)
 *
 * 設計意図: dashboard で「streak が今日 1 段上がった!」 だけを能動的に提示、毎日同じ chip を
 * 出して見飽きさせない。Duolingo / GitHub Contributions の milestone toast UX と整合。
 */
export type StreakMilestoneTransition = 'achieved' | 'broken' | 'maintained'

export function classifyStreakMilestoneTransition(
  prevStreak: number,
  currStreak: number,
): StreakMilestoneTransition {
  const prev = STREAK_MILESTONE_RANK[getStreakMilestone(prevStreak)]
  const curr = STREAK_MILESTONE_RANK[getStreakMilestone(currStreak)]
  if (curr > prev) return 'achieved'
  if (curr < prev) return 'broken'
  return 'maintained'
}

/**
 * iter1708 ai-automation: streak を `AgentBriefSignal` 形式 (text + tone) に変換する compose helper。
 *
 * iter794-797 / iter798 / iter799 / iter802 (velocityToBriefSignal) の `*ToBriefSignal` パターン
 * の streak milestone 版。AI 朝 brief / Slack daily digest / dashboard chip area で 1 chip
 * として表示するための統合 substrate。
 *
 * text: `formatStreakWithMilestoneJa(streak)` (iter1706、= 数字 + milestone label)
 * tone: `streakMilestoneChipTone(getStreakMilestone(streak))` (iter1705、= positive polarity)
 *
 * caller pattern:
 *   const sig = streakToBriefSignal(currStreak)
 *   <Chip text={sig.text} tone={sig.tone} />
 *
 * 用途:
 *  - AI 朝 brief 「streak signal」 chip
 *  - Slack daily digest 「現在 streak」 chip
 *  - dashboard 「やる気」 panel の 1 chip
 *  - analytics-signals.ts の compose に組込み可能 (= 将来 streak signal を AnalyticsSignals に
 *    追加する場合のための substrate)
 */
export function streakToBriefSignal(streak: number): AgentBriefSignal {
  return {
    text: formatStreakWithMilestoneJa(streak),
    tone: streakMilestoneChipTone(getStreakMilestone(streak)),
  }
}

/**
 * iter1711 ai-automation: streak milestone transition を toast 文言に整形する pure helper。
 *
 * `classifyStreakMilestoneTransition` (iter1707) の出力 + currStreak を 1 行 ja-JP toast に
 * 整形する compose helper。caller は本文字列を Toast / Slack message / confetti header に
 * 直接埋め込む想定。
 *
 * 仕様:
 *  - 'achieved' → `🎉 マイルストーン到達! 完了 streak X 日連続! [milestone label]`
 *    (= 達成感の最大化、emoji + 強調文言 + milestone label)
 *  - 'broken'   → `😢 streak 途切れました (前 X 日連続)。また始めよう!`
 *    (= 励まし、broken を責めない、再開を促す)
 *  - 'maintained' → null (= 何も表示しない、UI ノイズ削減)
 *
 * caller pattern:
 *   const transition = classifyStreakMilestoneTransition(prev, curr)
 *   const msg = formatStreakTransitionJa(transition, curr, prev)
 *   if (msg !== null) toast.show(msg)
 *
 * 設計意図: 'maintained' で null を返すことで caller の if 分岐が「null check 1 回」 に集約、
 * Toast 不要時の早期 return が単純化。'achieved' / 'broken' でのみ文言生成、UI トリガーは
 * caller 判断 (= 本 helper は pure)。
 *
 * iter1707 + 1710 + 1711 で「summary → prev/curr → transition → toast 文言」 の full chain が
 * substrate のみで完結 (caller は 4 関数呼出 + null check 1 行)。
 */
export function formatStreakTransitionJa(
  transition: StreakMilestoneTransition,
  currStreak: number,
  prevStreak: number,
): string | null {
  if (transition === 'maintained') return null
  if (transition === 'achieved') {
    const milestone = getStreakMilestone(currStreak)
    const label = streakMilestoneLabelJa(milestone)
    return `🎉 マイルストーン到達! 完了 streak ${currStreak} 日連続! ${label}`
  }
  // broken
  return `😢 streak 途切れました (前 ${prevStreak} 日連続)。また始めよう!`
}

/**
 * iter1712 ai-automation: VelocitySummary → streak chain 全 data を 1 関数で orchestrate。
 *
 * iter1704-1711 で揃えた substrate 7 helper を 1 call にまとめて、caller (= dashboard /
 * cron worker / Slack notifier) が VelocitySummary を渡すだけで render に必要な data 全 7 件
 * を取得できる orchestrator。各 helper の合成 boilerplate を caller から完全除去。
 *
 * 出力:
 *  - currStreak: 今日含む末尾連続日数 (iter457)
 *  - prevStreak: 昨日まで連続日数 (iter1710、transition 計算用)
 *  - currMilestone: 今日の milestone 6 段階 (iter1704)
 *  - prevMilestone: 昨日の milestone (transition source)
 *  - transition: 'achieved' / 'broken' / 'maintained' (iter1707)
 *  - briefSignal: AgentBriefSignal (text + tone、iter1708、chip render 用)
 *  - toastMessage: 'achieved'/'broken' 時の toast 文言 (iter1711、maintained は null)
 *
 * caller pattern (= 全 1 関数で chip + toast 同時 render):
 *   const chain = computeStreakChain(summary)
 *   <Chip text={chain.briefSignal.text} tone={chain.briefSignal.tone} />
 *   if (chain.toastMessage) toast.show(chain.toastMessage)
 *
 * 設計意図: dashboard / cron / Slack の 3 caller 全てで同じ 7 helper chain が必要 → 1 関数化で
 * caller の boilerplate -7 行 / chain。helper 配置を変えても caller は影響受けず本 orchestrator
 * 内部の修正で済む。
 */
export interface StreakChainData {
  currStreak: number
  prevStreak: number
  currMilestone: StreakMilestone
  prevMilestone: StreakMilestone
  transition: StreakMilestoneTransition
  briefSignal: AgentBriefSignal
  toastMessage: string | null
}

export function computeStreakChain(summary: VelocitySummary): StreakChainData {
  const currStreak = computeCompletionStreak(summary)
  const prevStreak = computeCompletionStreakExcludingToday(summary)
  const currMilestone = getStreakMilestone(currStreak)
  const prevMilestone = getStreakMilestone(prevStreak)
  const transition = classifyStreakMilestoneTransition(prevStreak, currStreak)
  const briefSignal = streakToBriefSignal(currStreak)
  const toastMessage = formatStreakTransitionJa(transition, currStreak, prevStreak)
  return {
    currStreak,
    prevStreak,
    currMilestone,
    prevMilestone,
    transition,
    briefSignal,
    toastMessage,
  }
}

/**
 * iter459 ai-automation: byDay window 内の **最長連続 done 日数** (= best streak)
 * を計算する pure helper。
 *
 * iter457 `computeCompletionStreak` は「末尾今日からの連続」 (= 現在 streak)、
 * 本 helper は「window 全体での最長連続」 (= 過去最長記録)。AI 朝 brief / Slack
 * 通知が「今週のベスト streak は 5 日連続でした」のような retroactive な達成
 * を 1 関数で出せる。
 *
 * 仕様:
 *  - byDay 空 → 0
 *  - 全日 count=0 → 0
 *  - 各 run (連続 count>0) の長さを集計、最長を返す
 *  - 全日 count>0 → byDay.length
 *
 * 用途差分:
 *  - computeCompletionStreak (iter457): 現在 (今日から遡って) 連続 → motivational
 *  - computeBestStreak (本 helper): window 全体最長 → 達成感 retro brief
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function computeBestStreak(summary: VelocitySummary): number {
  let best = 0
  let current = 0
  for (const day of summary.byDay) {
    if (day.count > 0) {
      current += 1
      if (current > best) best = current
    } else {
      current = 0
    }
  }
  return best
}

/**
 * AI prompt 用 1 行サマリ:
 *   '直近 7 日の最長連続: 0 日 (該当なし)'
 *   '直近 7 日の最長連続: 1 日'
 *   '直近 7 日の最長連続: 5 日!'
 *
 * 1 日と 2+ 日で言い回しを差別化 (= 1 日は "!" なし、2+ で達成感)。
 */
export function formatBestStreakJa(streak: number, windowDays: number = 7): string {
  if (streak === 0) return `直近 ${windowDays} 日の最長連続: 0 日 (該当なし)`
  if (streak === 1) return `直近 ${windowDays} 日の最長連続: 1 日`
  return `直近 ${windowDays} 日の最長連続: ${streak} 日!`
}

/**
 * iter1716 basics: 現在 streak (`computeCompletionStreak`) と best streak
 * (`computeBestStreak`) を 1 行 ja-JP 比較 text にまとめる pure helper。
 *
 * dashboard 「Velocity > 連続記録 disclosure」 / Today view 「達成感 chip」 / Slack
 * weekly digest の「streak 比較」 行で「今と最高を 1 行に並べる」 pattern を 1 関数化。
 *
 * 仕様 (出力 pattern):
 *  - bestStreak === 0 → `'完了履歴なし'` (= window 内に done 0 件、励まし sentinel)
 *  - currStreak === 0 && bestStreak > 0 → `'今 0 日 (最高 N 日)'` (= 中断中だが過去履歴あり)
 *  - currStreak === bestStreak (= bestStreak > 0) → `'今 N 日連続 (最高記録更新中!)'`
 *    (= 現在が window 内最長 run、達成感最大化)
 *  - currStreak < bestStreak → `'今 N 日連続 (最高 M 日)'` (= 過去最高は別 run、informational)
 *  - currStreak > bestStreak → `'今 N 日連続 (最高 M 日)'` (= 定義上 curr <= best のはずだが
 *    defensive で起きた場合は < と同 format、UI が落ちないよう fail-soft)
 *
 * 用途差分:
 *  - `formatCompletionStreakJa(streak)` (iter457): 現在 streak 単独 (= chip 1 軸)
 *  - `formatBestStreakJa(streak)` (iter459): best streak 単独 (= retro brief)
 *  - `formatStreakWithMilestoneJa(streak)` (iter1706): 現在 streak + milestone label
 *  - 本 helper: 現在 vs best (= 2 軸 比較、過去記録への意識付け)
 *
 * 設計意図: best streak が「過去の自己記録」 として可視化されると、「今日もう 1 件やって
 * 記録更新へ」 という pull motivator が働く。Duolingo の「longest streak」 / GitHub
 * Contributions の「longest streak」 / Strava の「PR (personal record)」 と同 pattern。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function formatStreakBestComparisonJa(currStreak: number, bestStreak: number): string {
  if (bestStreak === 0) return '完了履歴なし'
  if (currStreak === 0) return `今 0 日 (最高 ${bestStreak} 日)`
  if (currStreak >= bestStreak) return `今 ${currStreak} 日連続 (最高記録更新中!)`
  return `今 ${currStreak} 日連続 (最高 ${bestStreak} 日)`
}

/**
 * iter1723 basics: 現在 vs best streak 比較の **suffix のみ** (= 「(最高 N 日)」 /
 * 「(最高記録更新中!)」 / null) を返す pure helper。
 *
 * iter1716 `formatStreakBestComparisonJa` は「今 X 日連続 (最高 Y 日)」 full text を
 * 返すが、milestone text (= iter1706 `formatStreakWithMilestoneJa` の「完了 streak X
 * 日連続! 🥈 シルバー」) と組み合わせると「X 日連続」 が 2 回出てしまい冗長。
 * 本 helper は suffix 部分 (= 過去 best 比較のみ) を独立に取得することで、milestone
 * text + suffix の組合せで「完了 streak 7 日連続! 🥈 シルバー (最高記録更新中!)」 を
 * 重複なく出せる。
 *
 * 仕様 (出力 pattern):
 *  - bestStreak === 0 → null (= 履歴なし、suffix なし)
 *  - currStreak === 0 && bestStreak > 0 → `'(最高 N 日、中断中)'` (= 中断中 nudge を suffix で示唆)
 *  - currStreak === bestStreak (bestStreak > 0) → `'(最高記録更新中!)'`
 *  - currStreak < bestStreak → `'(最高 N 日)'`
 *  - currStreak > bestStreak (defensive) → `'(最高記録更新中!)'`
 *
 * caller pattern (dashboard 配線最終形):
 *   const milestoneText = formatStreakWithMilestoneJa(curr)
 *   const suffix = formatStreakBestSuffix(curr, best)
 *   const detail = `${milestoneText}${suffix ? ` ${suffix}` : ''}`
 *   // → '完了 streak 7 日連続! 🥈 シルバー (最高記録更新中!)' (重複なし)
 *
 * 設計意図: dashboard / Slack daily digest の SR / hover area で milestone chip と
 * 比較 chip を **重複なく 1 行 統合** するための substrate。`formatStreakBestComparisonJa`
 * は単独 chip 用 (= 比較のみ 1 chip)、本 helper は milestone + 比較 統合用 (= 1 chip)
 * と用途を分離。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function formatStreakBestSuffix(currStreak: number, bestStreak: number): string | null {
  if (bestStreak === 0) return null
  if (currStreak === 0) return `(最高 ${bestStreak} 日、中断中)`
  if (currStreak >= bestStreak) return '(最高記録更新中!)'
  return `(最高 ${bestStreak} 日)`
}

/**
 * iter1717 ai-automation: 現在 vs best streak 比較を `AgentBriefSignal` 形式 (text + tone) に
 * 変換する compose helper。iter1716 `formatStreakBestComparisonJa` の chip 化版。
 *
 * iter1708 `streakToBriefSignal` (= 現在 streak のみ → milestone chip) の比較軸版。
 * dashboard chip / Today 達成感 panel / Slack weekly digest が「今と最高を 1 chip」 で
 * 出すための substrate。`composeAnalyticsSignals` に組込み可能 (= 将来 streakComparison
 * を 20 軸目として AnalyticsSignals に追加可能)。
 *
 * text: `formatStreakBestComparisonJa(curr, best)` (iter1716)
 * tone (positive polarity):
 *  - best === 0 → 'idle' (= 完了履歴なし、chip 非表示推奨)
 *  - curr === 0 && best > 0 → 'warn' (= 中断中、過去履歴あり = nudge)
 *  - curr >= best (= best > 0) → 'success' (= 記録更新中、達成感最大化)
 *  - curr < best (= best > 0) → 'info' (= 現在進行中だが過去記録未達)
 *
 * caller pattern (= 1 chip render):
 *   const summary = computeVelocity(items, {}, today)
 *   const curr = computeCompletionStreak(summary)
 *   const best = computeBestStreak(summary)
 *   const sig = streakComparisonToBriefSignal(curr, best)
 *   <Chip text={sig.text} tone={sig.tone} />
 *
 * 設計意図:
 *  - curr=0 & best>0 を warn にすることで「過去できてたのに今中断 → 再開 nudge」 を能動 push
 *  - curr === best → success で「記録更新中! 」 motivational wow chip
 *  - curr < best → info で「現在進行中、目標は best 超え」 silent informational
 *  - best=0 → idle で「履歴なし」 chip 非表示、新規ユーザの UI ノイズ削減
 *
 * iter1708 `streakToBriefSignal` (= milestone chip) と並列軸として両立可能 (= dashboard で
 * 同時 render = milestone chip + 比較 chip)。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function streakComparisonToBriefSignal(
  currStreak: number,
  bestStreak: number,
): AgentBriefSignal {
  const text = formatStreakBestComparisonJa(currStreak, bestStreak)
  let tone: ChipTone
  if (bestStreak === 0) {
    tone = 'idle'
  } else if (currStreak === 0) {
    tone = 'warn'
  } else if (currStreak >= bestStreak) {
    tone = 'success'
  } else {
    tone = 'info'
  }
  return { text, tone }
}

/**
 * iter1718 basics: VelocitySummary → 比較 chip 1 関数 orchestrator。
 *
 * iter1717 `streakComparisonToBriefSignal` の VelocitySummary 受口版。caller
 * (dashboard / cron worker / Slack notifier) が summary を渡すだけで比較 chip
 * (text + tone) を取得、curr + best の手動 compute boilerplate を排除。
 *
 * iter1712 `computeStreakChain` の milestone chip 版と対称構造 (= summary → 1 chip)。
 *
 * 内部 chain:
 *   summary → computeCompletionStreak (= curr) + computeBestStreak (= best)
 *           → streakComparisonToBriefSignal(curr, best) → AgentBriefSignal
 *
 * caller pattern (= 1 関数で比較 chip 取得):
 *   const summary = computeVelocity(items, {}, today)
 *   const sig = computeStreakComparisonSignal(summary)
 *   <Chip text={sig.text} tone={sig.tone} />
 *
 * 設計意図: dashboard / Slack daily digest / Today 達成感 panel の 3 caller 全てで
 * 「summary 1 つから比較 chip」 が欲しい → 1 関数化で caller の boilerplate -2 関数呼出/chip。
 * iter1712 milestone chip orchestrator (computeStreakChain) と並列軸で、組み合わせて
 * 「milestone chip + 比較 chip」 を 2 chip 並列 render 可能。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export function computeStreakComparisonSignal(summary: VelocitySummary): AgentBriefSignal {
  const curr = computeCompletionStreak(summary)
  const best = computeBestStreak(summary)
  return streakComparisonToBriefSignal(curr, best)
}

/**
 * iter1720 refactor: VelocitySummary → 達成感 chip 2 軸 (milestone + comparison) を
 * 1 関数で fan-out する compose helper。iter497 `composeAgentBriefSignals` (= reliability
 * stats から reliability + dominantRole + concerningRole の 3 軸 fan-out) と同 pattern。
 *
 * 入力 1 → 出力 2:
 *   summary → { milestone, comparison }
 *
 * 内部 chain:
 *  - milestone = streakToBriefSignal(computeCompletionStreak(summary))   (iter1708/1715)
 *  - comparison = computeStreakComparisonSignal(summary)                  (iter1718)
 *
 * caller pattern (= 1 関数で 2 chip 取得、達成感 panel 用):
 *   const summary = computeVelocity(items, {}, today)
 *   const streak = composeStreakBriefSignals(summary)
 *   <Chip text={streak.milestone.text} tone={streak.milestone.tone} />
 *   <Chip text={streak.comparison.text} tone={streak.comparison.tone} />
 *
 * 設計意図: dashboard / AI 朝 brief / Slack daily digest の 3 caller が「達成感 chip
 * cluster (milestone + comparison)」 を summary 1 つから 1 関数で取得できる substrate。
 * 各 helper を別個 import する boilerplate と curr / best 重複 compute を排除。
 *
 * `composeAnalyticsSignals` (iter796) が caller になる場合は input.streakMilestone と
 * input.streakComparison を分けて受けるため別 compute path だが、本 orchestrator は
 * 1 summary を完結関数として fan-out するシンプル形を提供 (= 単独 panel UI 用)。
 *
 * iter1712 `computeStreakChain` (= milestone chip + transition + toast 等 7 件 fan-out)
 * と並列軸で、本 helper は「達成感 2 chip 表示」 用、computeStreakChain は「milestone
 * 移行 wow ポイント」 用、と用途が異なる。
 *
 * 0 から始まる pure 関数、副作用なし。
 */
export interface StreakBriefSignals {
  milestone: AgentBriefSignal
  comparison: AgentBriefSignal
}

export function composeStreakBriefSignals(summary: VelocitySummary): StreakBriefSignals {
  const milestone = streakToBriefSignal(computeCompletionStreak(summary))
  const comparison = computeStreakComparisonSignal(summary)
  return { milestone, comparison }
}

/**
 * iter802 ai-automation: velocity の VelocityHint → ChipTone (positive polarity =
 * up が完了 増 = 成功)。`agentReliabilityTone` (iter487) / `weeklyCompletionInsightTone`
 * (iter797) と同じ ChipTone vocab に bind。
 *
 * 配色 (positive polarity):
 *  - 'up'   → 'success' (emerald、加速中)
 *  - 'down' → 'warn'    (amber、減速中)
 *  - 'flat' → 'info'    (blue、安定)
 *  - 'idle' → 'idle'    (slate、完了なし)
 */
const HINT_TO_CHIP_TONE: Record<VelocityHint, ChipTone> = {
  up: 'success',
  down: 'warn',
  flat: 'info',
  idle: 'idle',
}

export function velocityChipTone(hint: VelocityHint): ChipTone {
  return HINT_TO_CHIP_TONE[hint]
}

/**
 * iter802 ai-automation: velocity を `AgentBriefSignal` 形式 (text + tone) に変換する
 * compose helper。iter794-797 / iter798 / iter799 の `*ToBriefSignal` パターン継承。
 *
 * caller (= AI 朝 brief / Slack daily digest / dashboard chip) は本 helper 出力を
 * `composeAnalyticsSignals` の追加軸候補として活用 (= 完了ペース chip 表示)。
 *
 * text: `formatVelocityHintJa(summary)` (例: '完了ペース: 加速中')
 *       compact 寄り、件数 / avg 詳細は省略 (詳細 disclosure は formatVelocitySummary)
 * tone: `velocityChipTone(classifyVelocityHint(summary))` (positive polarity)
 */
export function velocityToBriefSignal(summary: VelocitySummary): AgentBriefSignal {
  const hint = classifyVelocityHint(summary)
  // text format: '完了ペース: <jp 1-word hint>' (例: '完了ペース: 加速中')
  return {
    text: `完了ペース: ${VELOCITY_HINT_LABEL_JA[hint]}`,
    tone: velocityChipTone(hint),
  }
}
