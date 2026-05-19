/**
 * iter339 ai-automation: workspace の「モメンタム」 (intake vs done) を 1 関数で
 * 判定する pure helper。
 *
 * iter302 velocity (done 件数のペース、7 日 window) は片側だけだったが、本 helper
 * は同じ window で **intake (createdAt 件数) と done (doneAt 件数) を両方計測** し、
 * net = intake - done を「成長中 / 縮小中 / 安定」 に分類する。AI brief / pm-agent /
 * dashboard widget が「backlog は成長中 (週 +3 件)」「縮小中 (-2 件)」のような
 * トレンドを 1 関数で提示できる。
 *
 * iter312 period-completion (期間 × itemsCompleted/itemsAdded、合算) と被るが、
 * period-completion は単一期間の集計、本 helper は window N 日固定 + momentum 判定
 * (direction + threshold) に特化。
 *
 * 仕様:
 *   - input: items 配列 ({createdAt, doneAt} の structural subset)
 *   - options.windowDays default 7、(today - windowDays + 1) ≤ X ≤ today を window
 *   - intake: window 内に createdAt がある件数
 *   - done: window 内に doneAt がある件数
 *   - net = intake - done (正 = 成長中、負 = 縮小中)
 *   - momentum:
 *       - intake=done=0 → 'idle' (活動なし)
 *       - |net| / max(1, intake+done) < 0.2 (= 20%) → 'balanced'
 *       - net > 0 → 'growing' (intake > done = backlog 増)
 *       - net < 0 → 'shrinking' (done > intake = backlog 減)
 *
 * 不正 createdAt / doneAt は除外 (fail-soft)、windowDays<=0 で空 result、today
 * 不正で idle。
 */

import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { round2 } from '@/lib/round-decimal'
import { type ChipTone, type ChipToneClasses, getChipToneClasses } from '@/lib/ui/chip-tone'

import { type AgentBriefSignal } from '@/features/agent/brief-signal'

export interface MomentumFields {
  createdAt: Date | string | null | undefined
  doneAt: Date | string | null | undefined
}

export type MomentumDirection = 'growing' | 'shrinking' | 'balanced' | 'idle'

export interface WorkspaceMomentum {
  intake: number
  done: number
  /** intake - done (正 = 成長、負 = 縮小) */
  net: number
  direction: MomentumDirection
  /** 集計に使った日数 (= windowDays clamped to 1..) */
  windowDays: number
}

export interface ComputeMomentumOptions {
  /** 集計対象日数。default 7。0 以下で空 result */
  windowDays?: number
}

const BALANCED_THRESHOLD = 0.2

function emptyResult(windowDays: number): WorkspaceMomentum {
  return { intake: 0, done: 0, net: 0, direction: 'idle', windowDays }
}

export function computeWorkspaceMomentum<T extends MomentumFields>(
  items: readonly T[],
  options: ComputeMomentumOptions = {},
  today: Date | string = new Date(),
): WorkspaceMomentum {
  const windowDays = options.windowDays ?? 7
  if (windowDays <= 0) return emptyResult(0)

  const todayDate = parseDateOrNull(today)
  if (!todayDate) return emptyResult(windowDays)

  // window 開始日 (today - windowDays + 1 の 00:00 ローカル深夜)
  const windowStartMs = todayDate.getTime() - (windowDays - 1) * MS_PER_DAY
  // window 終了は today の 23:59:59 (todayDate がローカル真夜中前提だと +1 day - 1ms)
  const windowEndMs = todayDate.getTime() + MS_PER_DAY - 1

  let intake = 0
  let done = 0
  for (const it of items) {
    const created = parseDateOrNull(it.createdAt)
    if (created && created.getTime() >= windowStartMs && created.getTime() <= windowEndMs) {
      intake += 1
    }
    const doneAt = parseDateOrNull(it.doneAt)
    if (doneAt && doneAt.getTime() >= windowStartMs && doneAt.getTime() <= windowEndMs) {
      done += 1
    }
  }

  const net = intake - done
  let direction: MomentumDirection
  if (intake === 0 && done === 0) {
    direction = 'idle'
  } else {
    const total = intake + done
    const ratio = Math.abs(net) / Math.max(1, total)
    if (ratio < BALANCED_THRESHOLD) {
      direction = 'balanced'
    } else if (net > 0) {
      direction = 'growing'
    } else if (net < 0) {
      direction = 'shrinking'
    } else {
      direction = 'balanced'
    }
  }

  return { intake, done, net, direction, windowDays }
}

/**
 * iter341 basics: momentum direction を trend-tone 軸 (`'up' | 'down' | 'flat' |
 * 'idle'`) にマップする糖衣。dashboard chip / AI brief で trend chip 共通基盤
 * (`@/lib/ui/trend-tone`) に bind するために使う。`negative` polarity と組合せると
 * growing=amber (警戒) / shrinking=emerald (改善) / balanced=muted / idle=muted
 * になる (cost-trend chip iter333 と同じ意味付け)。
 */
export function momentumDirectionToTrend(
  direction: MomentumDirection,
): 'up' | 'down' | 'flat' | 'idle' {
  if (direction === 'growing') return 'up'
  if (direction === 'shrinking') return 'down'
  if (direction === 'balanced') return 'flat'
  return 'idle'
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'モメンタム: 直近 7 日 +3 件 成長中 (新規 12 / 完了 9)'`
 *   `'モメンタム: 直近 7 日 -2 件 縮小中 (新規 5 / 完了 7)'`
 *   `'モメンタム: 直近 7 日 安定 (新規 6 / 完了 6)'`
 *   `'モメンタム: 直近 7 日 活動なし'`
 */
export function formatWorkspaceMomentumJa(m: WorkspaceMomentum): string {
  const head = `モメンタム: 直近 ${m.windowDays} 日`
  if (m.direction === 'idle') return `${head} 活動なし`
  const counts = `(新規 ${m.intake} / 完了 ${m.done})`
  if (m.direction === 'balanced') return `${head} 安定 ${counts}`
  const sign = m.net > 0 ? '+' : ''
  const labelMap: Record<Exclude<MomentumDirection, 'idle' | 'balanced'>, string> = {
    growing: '成長中',
    shrinking: '縮小中',
  }
  return `${head} ${sign}${m.net} 件 ${labelMap[m.direction]} ${counts}`
}

/**
 * iter793 basics: workspace momentum direction → ChipTone (negative polarity =
 * growing が backlog 増 = 警戒)。`agentReliabilityTone` (iter487) /
 * `monthlyCostTrendTone` (iter792) と同じ ChipTone vocabulary に bind し、
 * dashboard chip / Slack daily digest payload で chip 配色を 1 関数で揃える。
 *
 * 配色 (negative polarity):
 *  - 'growing'   → 'warn'    (amber、backlog 成長 = 注意)
 *  - 'shrinking' → 'success' (emerald、backlog 縮小 = 改善)
 *  - 'balanced'  → 'info'    (blue、安定 = 情報)
 *  - 'idle'      → 'idle'    (slate、活動なし)
 *
 * 既存 `momentumDirectionToTrend` は `TrendDirection` ('up'/'down'/'flat'/'idle')
 * 軸への変換 (lib/ui/trend-tone.ts と組合せ用)、本 helper は ChipTone (severity 軸)
 * への変換。caller は context に応じて使い分ける (= chip area 配色 vs trend chip
 * の glyph + class)。
 */
const DIRECTION_TO_CHIP_TONE: Record<MomentumDirection, ChipTone> = {
  growing: 'warn',
  shrinking: 'success',
  balanced: 'info',
  idle: 'idle',
}

export function momentumTone(direction: MomentumDirection): ChipTone {
  return DIRECTION_TO_CHIP_TONE[direction]
}

/** alias to ChipToneClasses (`@/lib/ui/chip-tone`)。caller の import path を維持。 */
export type MomentumChipClasses = ChipToneClasses

export function momentumChipClasses(direction: MomentumDirection): MomentumChipClasses {
  return getChipToneClasses(DIRECTION_TO_CHIP_TONE[direction])
}

/**
 * iter791 basics: dashboard widget の小型 chip / Slack 通知 ペイロード 用の
 * **compact** 1 行 ja-JP 文言。new/done 件数を省いた短縮形 (= 視覚は trend
 * chip 配色で補強)、`formatCostMonthProjectionCompactJa` (iter498) と対称。
 *
 *   idle      → 'モメンタム: 活動なし'
 *   balanced  → 'モメンタム: 安定 (±0)'
 *   growing   → 'モメンタム: 成長 +3'
 *   shrinking → 'モメンタム: 縮小 -2'
 *
 * caller (chip aria-label / Slack 通知) は本文字列をそのまま埋め込む想定。
 * 詳細 (新規 / 完了 内訳) が必要な場面では既存 `formatWorkspaceMomentumJa` を使う。
 */
export function formatWorkspaceMomentumCompactJa(m: WorkspaceMomentum): string {
  if (m.direction === 'idle') return 'モメンタム: 活動なし'
  if (m.direction === 'balanced') return 'モメンタム: 安定 (±0)'
  const sign = m.net > 0 ? '+' : ''
  const label = m.direction === 'growing' ? '成長' : '縮小'
  return `モメンタム: ${label} ${sign}${m.net}`
}

/**
 * iter795 basics: workspace momentum を `AgentBriefSignal` 形式 (text + tone) に
 * 変換する compose helper。iter794 `costMonthProjectionToBriefSignal` と同 pattern。
 *
 * caller (= AI 朝 brief / Slack daily digest / dashboard chip) は複数 helper の
 * output を 同 array に concat → `.map(s => <Chip ... />)` で 1 行 render。
 *
 * tone は既存 `momentumTone` (iter793) を再利用 (= chip 配色と signal tone が
 * 完全一致)。text は compact 1 行版 (iter791 `formatWorkspaceMomentumCompactJa`)。
 */
export function workspaceMomentumToBriefSignal(m: WorkspaceMomentum): AgentBriefSignal {
  return {
    text: formatWorkspaceMomentumCompactJa(m),
    tone: momentumTone(m.direction),
  }
}

/**
 * iter1019 ai-automation: momentum の bias ratio (= |net| / total、0..1) を返す。
 *
 * iter944 computePlanSpeedupRatio / iter1002 computeReviewPassRatio / iter1007
 * computeActorConcentration / iter1012 computeTickerProgressPct と並ぶ「単一 ratio metric」
 * pattern の momentum 軸版。WorkspaceMomentum.direction の `balanced` 判定 threshold
 * (= |net| / total < 0.2) を caller が再計算する手間を 1 helper に集約。
 *
 * 仕様:
 *   - intake + done === 0 → null (= idle、計算対象なし)
 *   - 通常 → |net| / total を round2 で 2 桁丸め
 *   - 値域: 0.0 (= 完全 balanced) 〜 1.0 (= 片側だけ、intake のみ or done のみ)
 *
 * 用途:
 *   - dashboard chip 「bias 35%」 で「どれくらい片寄ってるか」 即把握
 *   - Slack 通知 「+25% 速い backlog 増」 trend
 *   - AI prompt 「balanced or biased?」 数値根拠
 */
export function computeMomentumRatio(
  m: Pick<WorkspaceMomentum, 'intake' | 'done' | 'net'>,
): number | null {
  const total = m.intake + m.done
  if (total === 0) return null
  return round2(Math.abs(m.net) / total)
}

/**
 * iter1019 ai-automation: momentum bias ratio を chip 文言に整形。
 *   '安定 (bias 0%)'          (ratio 0、= 完全 balanced)
 *   '成長 bias 30%'           (net > 0、ratio > 0)
 *   '縮小 bias 30%'           (net < 0、ratio > 0)
 *   '活動なし'                 (ratio null)
 *
 * direction (growing/shrinking/balanced/idle) と整合した 1 行 chip。
 */
export function formatMomentumRatioJa(
  m: Pick<WorkspaceMomentum, 'intake' | 'done' | 'net' | 'direction'>,
): string {
  const ratio = computeMomentumRatio(m)
  if (ratio === null) return '活動なし'
  const pct = Math.round(ratio * 100)
  if (m.direction === 'balanced' || pct === 0) return `安定 (bias ${pct}%)`
  if (m.net > 0) return `成長 bias ${pct}%`
  return `縮小 bias ${pct}%`
}
