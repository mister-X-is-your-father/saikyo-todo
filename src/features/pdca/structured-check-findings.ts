/**
 * iter1406 (queue PDCA AI-2 substrate): PDCA Check phase「学び抽出」の structured output
 * 強制用 zod schema + 寛容 parser。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 AI-2):
 *   - Check tab で AI に actual_value + 紐付け items の audit_log を渡し、
 *     `{wins, gaps, anomalies}` を **structured で返させる** (= 文章感想 NG)。
 *   - 「この cycle 良かった」 一行感想 fluffy を排除、必ず 3 軸の list に構造化。
 *   - widget は本 schema を直 render、checkFindings markdown 生成は AI に任せない。
 *
 * 既存 structured-review.ts (AC-2) / structured-plan.ts と同 pattern:
 *   - JSON 寛容 parse (code block / pre-text 対応)
 *   - zod 検証 + 失敗時 ok=false (UI が「再生成」 button を出す)
 *
 * AI 不使用 (本 helper)、副作用無し、依存は zod のみ。
 */
import { z } from 'zod'

import { extractFirstJsonObject } from '@/lib/json/extract-first-object'

/** 1 行 finding (短文強制、空 reject) */
const FindingLineSchema = z.string().trim().min(1).max(280)

export const StructuredCheckFindingsSchema = z.object({
  /** 良かった点 1-5 件 (queue 想定 2-3) */
  wins: z.array(FindingLineSchema).min(1).max(5),
  /** 課題 / 未達 1-5 件 */
  gaps: z.array(FindingLineSchema).min(1).max(5),
  /** 異常 / 想定外 0-3 件 (queue 想定 1-2、無ければ空) */
  anomalies: z.array(FindingLineSchema).max(3).default([]),
})
export type StructuredCheckFindings = z.infer<typeof StructuredCheckFindingsSchema>

export interface CheckFindingsSummary {
  winCount: number
  gapCount: number
  anomalyCount: number
  /** anomaly が 1 件以上 = 早期警戒すべき */
  hasAnomaly: boolean
}

export type ParseCheckFindingsResult =
  | { ok: true; findings: StructuredCheckFindings; summary: CheckFindingsSummary }
  | { ok: false; error: string; details?: unknown }

export function parseStructuredCheckFindings(input: unknown): ParseCheckFindingsResult {
  let raw: unknown = input
  if (typeof input === 'string') {
    const extracted = extractFirstJsonObject(input)
    if (extracted === null) {
      return { ok: false, error: 'JSON object 形式が見つかりませんでした' }
    }
    try {
      raw = JSON.parse(extracted)
    } catch (e) {
      return { ok: false, error: 'JSON parse 失敗', details: String(e) }
    }
  }

  const parsed = StructuredCheckFindingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'schema 不一致', details: parsed.error.issues }
  }

  return { ok: true, findings: parsed.data, summary: summarizeCheckFindings(parsed.data) }
}

export function summarizeCheckFindings(findings: StructuredCheckFindings): CheckFindingsSummary {
  return {
    winCount: findings.wins.length,
    gapCount: findings.gaps.length,
    anomalyCount: findings.anomalies.length,
    hasAnomaly: findings.anomalies.length > 0,
  }
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 summary。
 *   '学び: 成果 3 / 課題 2 / 異常 1'
 *   '学び: 成果 2 / 課題 2'        (anomaly 0 は省略)
 */
export function formatCheckFindingsSummaryJa(summary: CheckFindingsSummary): string {
  const parts = [`成果 ${summary.winCount}`, `課題 ${summary.gapCount}`]
  if (summary.anomalyCount > 0) parts.push(`異常 ${summary.anomalyCount}`)
  return `学び: ${parts.join(' / ')}`
}

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
