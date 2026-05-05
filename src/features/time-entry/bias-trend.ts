/**
 * iter269 ai-automation: 見積 bias の時系列トレンド (改善 / 悪化 / 安定) を判定する
 * pure ヘルパ。
 *
 * iter257 (workspace 全体集計) と iter264 (3 行 brief) はその時点のスナップショット
 * しか見ていなかった。同じ ratio が並んでいても「先月 1.5× → 今月 1.2×」と
 * 「先月 1.0× → 今月 1.2×」では意味が違うので、2 期間の `EstimateBiasReport` を
 * 比べて「改善 / 悪化 / 安定 / 判定不能」を返せるようにする。
 *
 * 朝 brief / pm-agent / dashboard widget が「先週は精度が良くなりました
 * (1.50× → 1.20×)」のような前向きフィードバックを出す substrate。
 *
 * - `splitSamplesByDate(entries, splitISO)`: workDate < splitISO を prior、それ以降を
 *   recent に振り分け
 * - `computeBiasTrend(recent, prior)`: factor の絶対距離が縮まれば improving、
 *   広がれば worsening、変化が小さければ stable、どちらかが unknown なら inconclusive
 * - `formatBiasTrendJa(trend)`: 1 行 JA 文面 (4 種類 + null 防衛)
 */
import { type ChipTone } from '@/lib/ui/chip-tone'

import { type AgentBriefSignal } from '@/features/agent/brief-signal'

import type { BiasSample, EstimateBiasReport } from './bias'
import { type ItemDescriptionLookup, selectBiasSamples } from './bias-selector'
import type { TimeEntry } from './schema'

export type BiasTrendDirection = 'improving' | 'worsening' | 'stable' | 'inconclusive'

export interface BiasTrend {
  direction: BiasTrendDirection
  /** prior 期間の calibrationFactor (null = sample 不足 / 計算不能) */
  priorFactor: number | null
  /** recent 期間の calibrationFactor */
  recentFactor: number | null
  /** factor の 1.0 からの絶対距離の差 (prior - recent)。正なら改善 */
  distanceDelta: number | null
}

const STABLE_DELTA_THRESHOLD = 0.05

/** TimeEntry を workDate (`YYYY-MM-DD`) で 2 期間に分割し、それぞれ BiasSample[] を返す。 */
export function splitSamplesByDate(
  entries: readonly TimeEntry[],
  lookup: ItemDescriptionLookup,
  splitISO: string,
): { recent: BiasSample[]; prior: BiasSample[] } {
  const recent: TimeEntry[] = []
  const prior: TimeEntry[] = []
  for (const e of entries) {
    if (e.workDate >= splitISO) recent.push(e)
    else prior.push(e)
  }
  return {
    recent: selectBiasSamples(recent, lookup),
    prior: selectBiasSamples(prior, lookup),
  }
}

export function computeBiasTrend(recent: EstimateBiasReport, prior: EstimateBiasReport): BiasTrend {
  const priorFactor = prior.calibrationFactor
  const recentFactor = recent.calibrationFactor

  if (priorFactor === null || recentFactor === null) {
    return { direction: 'inconclusive', priorFactor, recentFactor, distanceDelta: null }
  }

  const priorDistance = Math.abs(priorFactor - 1)
  const recentDistance = Math.abs(recentFactor - 1)
  const delta = priorDistance - recentDistance // 正 = 改善 (1.0 に近付いた)

  let direction: BiasTrendDirection
  if (Math.abs(delta) < STABLE_DELTA_THRESHOLD) direction = 'stable'
  else if (delta > 0) direction = 'improving'
  else direction = 'worsening'

  return { direction, priorFactor, recentFactor, distanceDelta: delta }
}

export function formatBiasTrendJa(trend: BiasTrend): string {
  if (trend.direction === 'inconclusive') {
    return '見積精度の変化: データ不足で判定不能 (各期間 3 件以上のサンプルが必要)'
  }
  const p = trend.priorFactor!.toFixed(2)
  const r = trend.recentFactor!.toFixed(2)
  if (trend.direction === 'stable') {
    return `見積精度の変化: 安定 (${p}× → ${r}×)`
  }
  if (trend.direction === 'improving') {
    return `見積精度の変化: 改善 (${p}× → ${r}×)`
  }
  return `見積精度の変化: 悪化 (${p}× → ${r}×)`
}

/**
 * iter274 ai-automation: Slack reaction / dashboard sparkline / pm-agent prompt
 * 用に「1 文字 emoji + 1 単語 label」の最小ラベルを返す。色 tone は呼び出し側で
 * direction を見て決める。
 *
 * - improving → ↑ 改善
 * - worsening → ↓ 悪化
 * - stable → → 安定
 * - inconclusive → · データ不足
 */
export function formatBiasTrendBadge(direction: BiasTrendDirection): {
  glyph: string
  label: string
} {
  switch (direction) {
    case 'improving':
      return { glyph: '↑', label: '改善' }
    case 'worsening':
      return { glyph: '↓', label: '悪化' }
    case 'stable':
      return { glyph: '→', label: '安定' }
    case 'inconclusive':
    default:
      return { glyph: '·', label: 'データ不足' }
  }
}

/**
 * iter804 ai-automation: bias trend direction → ChipTone (positive polarity =
 * improving が見積精度向上 = 達成)。`agentReliabilityTone` (iter487) /
 * `velocityChipTone` (iter802) と同じ ChipTone vocab に bind。
 *
 * 配色:
 *  - 'improving'    → 'success' (emerald、見積精度 改善 = 達成)
 *  - 'worsening'    → 'warn'    (amber、見積精度 悪化 = 注意)
 *  - 'stable'       → 'info'    (blue、安定)
 *  - 'inconclusive' → 'idle'    (slate、データ不足)
 */
const DIRECTION_TO_CHIP_TONE: Record<BiasTrendDirection, ChipTone> = {
  improving: 'success',
  worsening: 'warn',
  stable: 'info',
  inconclusive: 'idle',
}

export function biasTrendChipTone(direction: BiasTrendDirection): ChipTone {
  return DIRECTION_TO_CHIP_TONE[direction]
}

/**
 * iter804 ai-automation: bias trend を `AgentBriefSignal` 形式 (text + tone) に
 * 変換する compose helper。iter794-803 の `*ToBriefSignal` パターン継承。
 *
 * caller (= AI 朝 brief / Slack daily digest / dashboard chip) は本 helper 出力を
 * `composeAnalyticsSignals` の追加軸候補として活用 (= 見積精度 trend chip 表示)。
 *
 * text: `formatBiasTrendJa(trend)` (= '見積精度の変化: 改善 (1.50× → 1.20×)' 等)
 *       compact 寄り、prior/recent factor 詳細を含む (= 数値が判定根拠で必須)
 * tone: `biasTrendChipTone(trend.direction)` (positive polarity)
 */
export function biasTrendToBriefSignal(trend: BiasTrend): AgentBriefSignal {
  return {
    text: formatBiasTrendJa(trend),
    tone: biasTrendChipTone(trend.direction),
  }
}
