/**
 * iter274 ai-automation: 見積 bias の「自信度 (confidence)」を pure helper で算出。
 *
 * iter257 (集計) → 264 (brief) → 269b (trend) → 274 と進めた ai-automation chain の
 * 信頼性ゲージ層。「3 件で計算した 1.5×」と「30 件で計算した 1.5×」では意思決定の
 * 重みが違うのに既存 brief は両方同じ重みで提示していた。
 *
 * `BiasConfidence` を返す pure helper を追加し、AI 朝 brief / pm-agent / dashboard
 * widget が「この校正値は ?% 信頼できます」と添えられる substrate を整える。
 *
 * 算出方針 (heuristic、psychometrics の信頼度ではなく UX 表記用):
 *  - withEstimateCount を 0 / <3 / <10 / <20 / >=20 で 5 段階バケットに置き、それぞれ
 *    `none` / `very-low` / `low` / `moderate` / `high` に対応 (TickTick の
 *    "あと N 件で安定します" 系表記の 1 段抽象化)
 *  - calibrationFactor が `[0.5, 3.0]` の clamp 端 (= bias.ts の CAL_MIN / CAL_MAX)
 *    に貼り付いている場合は 1 段下げる (= 真値が範囲外で精度を出し切れていない可能性)
 *  - tendency が `mixed` の場合も 1 段下げる (中央値だけでは方向性が決まらない)
 *
 * `formatBiasConfidenceJa(c)` は AI prompt 用 1 行に整形 (`自信度: 中 (12 件 / mixed)`)。
 */
import type { EstimateBiasReport } from './bias'

export type BiasConfidenceLevel = 'none' | 'very-low' | 'low' | 'moderate' | 'high'

export interface BiasConfidence {
  level: BiasConfidenceLevel
  /** UI bar 用 0..1 数値 (none=0, very-low=0.2, low=0.4, moderate=0.7, high=1) */
  score: number
  /** 算出根拠 sample 数 (= withEstimateCount) */
  samples: number
  /** どんな理由でレベルが下がったかの 1 行 (none なら推奨次アクション) */
  rationale: string
}

const CAL_MIN = 0.5
const CAL_MAX = 3.0
const SAMPLE_BUCKETS: { min: number; level: BiasConfidenceLevel }[] = [
  { min: 20, level: 'high' },
  { min: 10, level: 'moderate' },
  { min: 3, level: 'low' },
  { min: 1, level: 'very-low' },
  { min: 0, level: 'none' },
]
const SCORE: Record<BiasConfidenceLevel, number> = {
  none: 0,
  'very-low': 0.2,
  low: 0.4,
  moderate: 0.7,
  high: 1,
}
const ORDER: BiasConfidenceLevel[] = ['none', 'very-low', 'low', 'moderate', 'high']

export function computeBiasConfidence(report: EstimateBiasReport): BiasConfidence {
  const samples = report.withEstimateCount

  // 1. sample bucket
  let level: BiasConfidenceLevel = 'none'
  for (const b of SAMPLE_BUCKETS) {
    if (samples >= b.min) {
      level = b.level
      break
    }
  }

  // 2. clamp 端の `0.5×` / `3.0×` は真値が範囲外なので 1 段下げる
  const clamped =
    report.calibrationFactor !== null &&
    (Math.abs(report.calibrationFactor - CAL_MIN) < 1e-9 ||
      Math.abs(report.calibrationFactor - CAL_MAX) < 1e-9)
  if (clamped) level = downgrade(level)

  // 3. mixed tendency も 1 段下げる
  if (report.tendency === 'mixed') level = downgrade(level)

  return {
    level,
    score: SCORE[level],
    samples,
    rationale: rationaleJa({
      level,
      samples,
      clamped,
      mixed: report.tendency === 'mixed',
    }),
  }
}

export function formatBiasConfidenceJa(c: BiasConfidence): string {
  const label =
    c.level === 'none'
      ? 'データなし'
      : c.level === 'very-low'
        ? '極めて低い'
        : c.level === 'low'
          ? '低い'
          : c.level === 'moderate'
            ? '中'
            : '高い'
  return `自信度: ${label} (${c.samples} 件)${c.rationale ? ` — ${c.rationale}` : ''}`
}

// --- internal ---

function downgrade(level: BiasConfidenceLevel): BiasConfidenceLevel {
  const i = ORDER.indexOf(level)
  if (i <= 0) return 'none'
  return ORDER[i - 1]!
}

function rationaleJa(c: {
  level: BiasConfidenceLevel
  samples: number
  clamped: boolean
  mixed: boolean
}): string {
  if (c.level === 'none') return 'まず 3 件以上の見積付き time entry が必要'
  const reasons: string[] = []
  if (c.mixed) reasons.push('傾向にばらつき')
  if (c.clamped) reasons.push('校正倍率が clamp 範囲外')
  if (c.samples < 10) reasons.push(`サンプル不足 (${c.samples}/10)`)
  return reasons.join(' / ')
}
