/**
 * iter277 ai-automation: bias 関連の全 substrate (workspace report / category /
 * trend / confidence) を 1 つの markdown block に整形し、AI prompt にそのまま
 * 差し込めるようにする pure ヘルパ。
 *
 * 既存 substrate:
 *  - iter257: `EstimateBiasReport`
 *  - iter264b: `BiasReportByCategory` + `formatTopSkewedCategoryJa`
 *  - iter269b: `BiasTrend` + `formatBiasTrendJa`
 *  - iter274b: `BiasConfidence` + `formatBiasConfidenceJa`
 *
 * これらを「pm-agent / morning brief / Slack DM の system prompt」で消費しやすい
 * 形に統一する。AI consumer ごとに微妙に違うフォーマットを書き散らかさず、
 * 1 ヘルパに集約することで「事実」と「文面」を分離する。
 *
 * 出力形式 (markdown):
 * ```
 * ### 見積精度 (直近)
 * - 見積精度: 過小評価傾向 (1.30×)
 * - 直近 12 件のうち 9 件 (75%) が見積を超過
 * - 推奨: 次の見積は 1.30× を掛けて出すと実測に近づきます (例: 30分 → 39分)
 * - 自信度: 中 (12 件)
 * - 見積精度の変化: 改善 (1.50× → 1.30×)
 * - 特に: 開発: 見積を 1.50× 過小評価しがち (8 件)
 * ```
 *
 * 行は条件付きで省略される (rich helper と同じく categoryNote は条件未達なら無し、
 * trend は inconclusive なら無し)。
 */
import type { EstimateBiasReport } from './bias'
import { formatBiasBriefJa } from './bias-brief'
import { formatBiasBriefRichJa } from './bias-brief-rich'
import { type BiasReportByCategory } from './bias-by-category'
import { type BiasConfidence, formatBiasConfidenceJa } from './bias-confidence'
import { type BiasTrend, formatBiasTrendJa } from './bias-trend'

export interface BiasPromptInput {
  workspace: EstimateBiasReport
  category?: BiasReportByCategory
  trend?: BiasTrend
  confidence?: BiasConfidence
}

const HEADING = '### 見積精度 (直近)'

export function formatBiasForAiPrompt(input: BiasPromptInput): string {
  const lines = [HEADING]

  // 1. 3 行 brief (always)
  const brief = input.category
    ? formatBiasBriefRichJa(input.workspace, input.category)
    : formatBiasBriefJa(input.workspace)
  lines.push(`- ${brief.headline}`)
  lines.push(`- ${brief.detail}`)
  lines.push(`- 推奨: ${brief.recommendation}`)

  // 2. confidence (任意)
  if (input.confidence) {
    lines.push(`- ${formatBiasConfidenceJa(input.confidence)}`)
  }

  // 3. trend (inconclusive は省略)
  if (input.trend && input.trend.direction !== 'inconclusive') {
    lines.push(`- ${formatBiasTrendJa(input.trend)}`)
  }

  // 4. categoryNote (rich の 4 行目を末尾に置き直し、prompt 視覚的階層を整える)
  if (input.category && 'categoryNote' in brief && brief.categoryNote) {
    lines.push(`- ${brief.categoryNote}`)
  }

  return lines.join('\n')
}

/**
 * data 不足で何も出せない場合の short fallback。AI consumer は値が空なら
 * `見積データが不足しているため、推奨は提示できません` を確認できる。
 */
export function formatBiasPromptEmpty(): string {
  return `${HEADING}\n- 見積精度のサンプルが不足しているため、推奨は提示できません`
}
