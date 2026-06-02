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
