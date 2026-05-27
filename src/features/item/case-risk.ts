/**
 * iter1417 (queue 案件の現状+着地プラン panel scope B substrate): parent Item (案件) の
 * 「着地リスク score」 を算出する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 案件の現状+着地プラン scope B):
 *   - scope A (ItemSummaryPanel: 進捗/依存/動き) は着地済。scope B は「risk score chip」。
 *   - subtask の 期限超過率 / blocked 率 + 最終 activity からの経過 を deterministic に
 *     0-100 score 化し low/medium/high tier + 根拠 reasons を返す (AI 不使用)。
 *   - sprint risk-board (sprint 横断 item score) とは別軸: 本 helper は 1 案件 (parent) の
 *     subtask 集約から着地危険度を出す。
 *
 * score 配分 (各 component 0..1 × weight、合計 100):
 *   - 期限超過率 (overdue/total)    : weight 40
 *   - blocked 率 (blocked/total)    : weight 30
 *   - 停滞度 (最終 activity 経過/14d): weight 30 (14 日で満点、null=不明は 0)
 *
 * 副作用無し・AI 不使用。pure helper + Vitest 単体で網羅。
 */

export interface CaseRiskInput {
  totalSubtasks: number
  overdueSubtasks: number
  blockedSubtasks: number
  /** 最終 activity からの経過日数 (null = 不明 → 停滞度 0 扱い) */
  daysSinceLastActivity: number | null
}

export type CaseRiskTier = 'low' | 'medium' | 'high'

export interface CaseRiskScore {
  /** 0-100 (round) */
  score: number
  tier: CaseRiskTier
  /** 寄与した要因の日本語 (大きい順) */
  reasons: string[]
}

const STALE_FULL_DAYS = 14

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export function computeCaseRiskScore(input: CaseRiskInput): CaseRiskScore {
  const total = Math.max(0, input.totalSubtasks)
  const overdueRatio = total > 0 ? clamp01(input.overdueSubtasks / total) : 0
  const blockedRatio = total > 0 ? clamp01(input.blockedSubtasks / total) : 0
  const stale =
    input.daysSinceLastActivity === null
      ? 0
      : clamp01(input.daysSinceLastActivity / STALE_FULL_DAYS)

  const score = Math.round(overdueRatio * 40 + blockedRatio * 30 + stale * 30)
  const tier: CaseRiskTier = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'

  // 寄与順 (weight × ratio) で reasons を並べる
  const factors: Array<{ weight: number; text: string }> = []
  if (input.overdueSubtasks > 0) {
    factors.push({
      weight: overdueRatio * 40,
      text: `期限超過 ${input.overdueSubtasks}/${total} 件`,
    })
  }
  if (input.blockedSubtasks > 0) {
    factors.push({
      weight: blockedRatio * 30,
      text: `blocked ${input.blockedSubtasks}/${total} 件`,
    })
  }
  if (input.daysSinceLastActivity !== null && input.daysSinceLastActivity >= 7) {
    factors.push({ weight: stale * 30, text: `最終更新から ${input.daysSinceLastActivity} 日` })
  }
  factors.sort((a, b) => b.weight - a.weight)

  return { score, tier, reasons: factors.map((f) => f.text) }
}

export function caseRiskTone(tier: CaseRiskTier): 'ok' | 'warn' | 'danger' {
  if (tier === 'high') return 'danger'
  if (tier === 'medium') return 'warn'
  return 'ok'
}

const TIER_LABEL_JA: Record<CaseRiskTier, string> = { low: '低', medium: '中', high: '高' }

/**
 * chip / Slack / AI prompt 用 1 行。
 *   '着地リスク 高 (72): 期限超過 3/5 件 / blocked 1/5 件'
 *   '着地リスク 低 (0)'                                    (reasons 無し)
 */
export function formatCaseRiskJa(risk: CaseRiskScore): string {
  const head = `着地リスク ${TIER_LABEL_JA[risk.tier]} (${risk.score})`
  return risk.reasons.length === 0 ? head : `${head}: ${risk.reasons.join(' / ')}`
}
