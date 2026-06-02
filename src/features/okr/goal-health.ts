/**
 * iter299 ai-automation: Goal (OKR) の健全性を tier 化する pure helper +
 * group/count/format substrate。
 *
 * Sprint burndown (iter285 `computeSprintBurndown`) と同型の「期間 + 進捗
 * → 健全性」 substrate を Goal 軸でも揃える。AI 朝 brief / dashboard widget が
 * `達成 1 / 順調 2 / やや遅れ 1 / 遅延 1 / 期間外 0` を 1 関数で出せる substrate。
 * UI (Goals progress bar) でも tier を icon + 色付けする時の共通ロジックに
 * なる (FEEDBACK_QUEUE 「Goal / Sprint progress bar 残/超過/達成」候補)。
 *
 * tier (5 段階):
 *  - `achieved` (達成)    … pct >= 1.0 (100% 以上)
 *  - `on-track` (順調)    … 期間中で完了率が経過率の -10% 以内 (Sprint と同 buffer)
 *  - `at-risk` (やや遅れ) … 期間中で完了率が経過率の -10% から -30% の間
 *  - `behind`  (遅延)     … 期間中で完了率が経過率の -30% より下
 *  - `idle`    (期間外)   … 開始前 or 終了後 (達成済以外)。pct=0 + 期間前 / 期間後の超過
 *
 * 期間外の扱い:
 *  - today < startDate → 期間前 idle (まだ何も判定しない)
 *  - today > endDate AND pct < 1.0 → 期間後 idle (期限切れ未達成)
 *  - today > endDate AND pct >= 1.0 → achieved (= 期限内達成済)
 *
 * 計算:
 *  - elapsedPct = (today - startDate) / (endDate - startDate + 1)、両端含むので +1。
 *    開始前は 0 にクランプ、終了後は 1 にクランプ。
 *  - gapPct = pct - elapsedPct (符号付き、負=遅れ / 正=先行)。
 */

import { formatNonZeroCounts } from '@/lib/format-counts'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

import { daysBetween, todayISO } from '@/features/sprint/sprint-date-helpers'

export type GoalHealthTier = 'achieved' | 'on-track' | 'at-risk' | 'behind' | 'idle'

export interface GoalHealthInput {
  /** 0..1 の進捗率 (Service が返す `GoalProgress.pct` と同じ)。NaN は 0 扱い */
  pct: number
  /** ISO `YYYY-MM-DD` */
  startDate: string
  /** ISO `YYYY-MM-DD` */
  endDate: string
  /** ISO `YYYY-MM-DD`、省略時は端末ローカル */
  today?: string
}

export interface GoalHealth {
  tier: GoalHealthTier
  /** 0..1 (経過率)、開始前=0 / 終了後=1 にクランプ */
  elapsedPct: number
  /** pct - elapsedPct (符号付き)。clamp 後の値で算出 */
  gapPct: number
  /** 日本語短ラベル ('達成' / '順調' / 'やや遅れ' / '遅延' / '期間外') */
  label: string
}

const TIER_ORDER: readonly GoalHealthTier[] = [
  'achieved',
  'on-track',
  'at-risk',
  'behind',
  'idle',
] as const

const TIER_LABEL: Record<GoalHealthTier, string> = {
  achieved: '達成',
  'on-track': '順調',
  'at-risk': 'やや遅れ',
  behind: '遅延',
  idle: '期間外',
}

/**
 * 1 件の Goal の健全性を計算。pct=NaN/負は 0、pct>=1.0 は achieved (期間外でも)。
 * 開始前は idle (elapsedPct=0)、終了後の未達成も idle (elapsedPct=1)。
 */
export function computeGoalHealth(input: GoalHealthInput): GoalHealth {
  const today = input.today ?? todayISO()
  const pct = Number.isFinite(input.pct) ? Math.max(0, input.pct) : 0

  // achieved: pct >= 1.0 は期間問わず達成扱い
  if (pct >= 1.0) {
    return { tier: 'achieved', elapsedPct: 1, gapPct: pct - 1, label: TIER_LABEL.achieved }
  }

  // 期間判定: today < startDate → 期間前 idle、today > endDate → 期間後 idle
  const beforeStart = today < input.startDate
  const afterEnd = today > input.endDate
  if (beforeStart) {
    return { tier: 'idle', elapsedPct: 0, gapPct: pct, label: TIER_LABEL.idle }
  }
  if (afterEnd) {
    // 期間後で未達成 → idle (期限切れ)
    return { tier: 'idle', elapsedPct: 1, gapPct: pct - 1, label: TIER_LABEL.idle }
  }

  // 期間中: elapsedPct を計算
  const totalDays = Math.max(1, daysBetween(input.startDate, input.endDate) + 1)
  const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(input.startDate, today) + 1))
  const elapsedPct = elapsedDays / totalDays
  const gapPct = pct - elapsedPct

  let tier: GoalHealthTier
  if (gapPct >= -0.1) tier = 'on-track'
  else if (gapPct >= -0.3) tier = 'at-risk'
  else tier = 'behind'

  return { tier, elapsedPct, gapPct, label: TIER_LABEL[tier] }
}

/** 日本語短ラベル ('達成' / '順調' / 'やや遅れ' / '遅延' / '期間外')。 */
export function goalHealthTierLabel(tier: GoalHealthTier): string {
  return TIER_LABEL[tier]
}

/** group/count/format で受け取る Goal の最小構造 */
export type GoalLike = Pick<GoalHealthInput, 'pct' | 'startDate' | 'endDate'>

export type GoalHealthGroups<T> = Record<GoalHealthTier, T[]>

/**
 * goals を tier 別に振り分ける (元配列順で stable)。
 * 各 tier は必ず空配列で初期化されるので caller の undefined チェック不要。
 */
export function groupGoalsByHealth<T extends GoalLike>(
  goals: readonly T[],
  today?: string,
): GoalHealthGroups<T> {
  const groups: GoalHealthGroups<T> = {
    achieved: [],
    'on-track': [],
    'at-risk': [],
    behind: [],
    idle: [],
  }
  for (const g of goals) {
    const { tier } = computeGoalHealth({ ...g, today })
    groups[tier].push(g)
  }
  return groups
}

/** goals を tier 別件数に圧縮 (件数だけ欲しい AI prompt 用)。 */
export function countGoalsByHealth(
  goals: readonly GoalLike[],
  today?: string,
): Record<GoalHealthTier, number> {
  const counts: Record<GoalHealthTier, number> = {
    achieved: 0,
    'on-track': 0,
    'at-risk': 0,
    behind: 0,
    idle: 0,
  }
  for (const g of goals) {
    const { tier } = computeGoalHealth({ ...g, today })
    counts[tier] += 1
  }
  return counts
}

/**
 * AI prompt 行 / dashboard chip 用の 1 行 summary。件数 0 の tier は省略、
 * tier 順 (achieved → on-track → at-risk → behind → idle) を保つ。
 * 全 0 なら '0 件'。
 */
export function formatGoalHealthCounts(counts: Record<GoalHealthTier, number>): string {
  return formatNonZeroCounts(counts, TIER_ORDER, TIER_LABEL)
}

/**
 * iter526 ai-automation: GoalHealthTier → 5 段階 共通 Severity bridge。
 * iter519 / iter524 / iter525 と同 pattern。
 *
 *   'achieved'  → 'ok'     (= 達成、緑、最高評価)
 *   'on-track'  → 'info'   (= 順調、青、進行中で healthy)
 *   'at-risk'   → 'warn'   (= やや遅れ、黄、要観察)
 *   'behind'    → 'danger' (= 遅延、赤、要救済)
 *   'idle'      → 'muted'  (= 期間外、グレー、対象外)
 *
 * 設計意図:
 *   - achieved = ok 緑で「終わったけど positive」
 *   - on-track = info で「進行中だが healthy」 (ok と差別化、achieved を ok 専用に)
 *   - behind = danger で escalate 必要を即時提示
 *   - idle (期間外) = muted で「無視してよい」を視覚化
 *
 * goals-panel.tsx 内の TIER_BAR_CLASS (= progress bar 色) は 5 色 (emerald/blue/amber/
 * red/primary) で本 helper 5 段と整合的。SeverityChip / Slack chip の標準軸と同期。
 */
const TIER_SEVERITY: Record<GoalHealthTier, Severity> = {
  achieved: 'ok',
  'on-track': 'info',
  'at-risk': 'warn',
  behind: 'danger',
  idle: 'muted',
}

export function goalHealthTierSeverity(tier: GoalHealthTier): Severity {
  return TIER_SEVERITY[tier]
}

/**
 * iter536 ai-automation: `Record<GoalHealthTier, number>` (5 段健全性 別件数) を
 * `Record<Severity, number>` (5 段 severity 別件数) に集約する pure helper。
 *
 * iter533 priority / iter534 status / iter535 due-proximity と同 pattern。caller は
 * `formatSeverityCountsJa(goalHealthTierCountsToSeverityCounts(counts))` で goal 健全性
 * 件数を 1 行 severity サマリ として AI prompt / Slack 通知 / dashboard summary に出せる。
 *
 * 各 tier は TIER_SEVERITY (iter526) で対応 severity に集約:
 *   achieved  → ok     (= 達成、緑)
 *   on-track  → info   (= 順調、青)
 *   at-risk   → warn   (= やや遅れ、黄)
 *   behind    → danger (= 遅延、赤)
 *   idle      → muted  (= 期間外、グレー)
 *
 * 各 tier が 1:1 で対応 severity に bridge されるため、本 helper は
 * `countGoalsByHealth` の出力を本 helper にそのまま渡すだけで dashboard chip 1 行
 * summary になる (例: 「危険 1 / 注意 2 / 情報 3 / OK 4 / なし 1 (合計 11)」)。
 *
 * 集約後の合計件数は tier 合計と一致 (集約だけで増減しない)。
 */
// iter1688 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1433 status-visual / iter1687 due-proximity に続く外部 file 追従 3 件目。
// 振る舞い不変: TIER_SEVERITY (achieved→ok / on-track→info / at-risk→warn / behind→danger /
// idle→muted) の domain mapping は本 file 責務、boilerplate (空 Record + for-loop + ?? 0) を
// 1 行委譲に縮約。
export function goalHealthTierCountsToSeverityCounts(
  counts: Record<GoalHealthTier, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, goalHealthTierSeverity)
}
