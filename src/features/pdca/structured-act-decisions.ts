/**
 * iter1407 (queue PDCA AI-3 substrate): PDCA Act phase「改善決定提案」の structured output
 * 強制用 zod schema + 寛容 parser。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 AI-3):
 *   - Act tab で AI に checkFindings を渡し、`{actions: {description, owner_candidate,
 *     est_min}[最大3]}` を **structured で返させる** (= 純 text 文章 NG)。
 *   - 各 action が次 cycle 開始時の Plan candidate になる
 *     → `actionsToActDecisionsMarkdown` で P-6 `buildNextCyclePrefill` の actDecisions に直連結。
 *
 * structured-review.ts (AC-2) / structured-check-findings.ts (AI-2) と同 pattern:
 *   - JSON 寛容 parse (code block / pre-text 対応)
 *   - zod 検証 + 失敗時 ok=false
 *
 * AI 不使用 (本 helper)、副作用無し、依存は zod + format-duration のみ。
 */
import { z } from 'zod'

import { formatMinutesJa } from '@/lib/format-duration'
import { extractFirstJsonObject } from '@/lib/json/extract-first-object'

export const ActionSchema = z.object({
  /** 具体的 action (1 行、例: 「PR レビュー SLA を 4h に短縮」) */
  description: z.string().trim().min(1).max(280),
  /** 担当候補 (自由記述、空可。例: 「@alice」 / 「QA チーム」) */
  owner_candidate: z.string().trim().max(120).default(''),
  /** 見積 (分、0 可 = 未見積)、上限は防御的に 100000 */
  est_min: z.number().int().nonnegative().max(100000).default(0),
})
export type Action = z.infer<typeof ActionSchema>

export const StructuredActDecisionsSchema = z.object({
  /** 改善決定 1-3 件 (queue 想定 3 件) */
  actions: z.array(ActionSchema).min(1).max(3),
})
export type StructuredActDecisions = z.infer<typeof StructuredActDecisionsSchema>

export interface ActDecisionsSummary {
  actionCount: number
  /** est_min の合計 */
  totalEstMin: number
  /** owner_candidate が空でない件数 */
  ownedCount: number
}

export type ParseActDecisionsResult =
  | { ok: true; decisions: StructuredActDecisions; summary: ActDecisionsSummary }
  | { ok: false; error: string; details?: unknown }

export function parseStructuredActDecisions(input: unknown): ParseActDecisionsResult {
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

  const parsed = StructuredActDecisionsSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'schema 不一致', details: parsed.error.issues }
  }

  return { ok: true, decisions: parsed.data, summary: summarizeActDecisions(parsed.data) }
}

export function summarizeActDecisions(decisions: StructuredActDecisions): ActDecisionsSummary {
  let totalEstMin = 0
  let ownedCount = 0
  for (const a of decisions.actions) {
    totalEstMin += a.est_min
    if (a.owner_candidate !== '') ownedCount += 1
  }
  return { actionCount: decisions.actions.length, totalEstMin, ownedCount }
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 summary。
 *   'Act: 改善 3 件 / 計 1時間30分'
 *   'Act: 改善 2 件'                 (est 合計 0 = 未見積は省略)
 */
export function formatActDecisionsSummaryJa(summary: ActDecisionsSummary): string {
  const base = `Act: 改善 ${summary.actionCount} 件`
  return summary.totalEstMin > 0 ? `${base} / 計 ${formatMinutesJa(summary.totalEstMin)}` : base
}

/**
 * AI-3 → P-6 連結: actions を次 cycle prefill 用の actDecisions markdown bullet に整形。
 * `buildNextCyclePrefill({ actDecisions: actionsToActDecisionsMarkdown(actions) })` で
 * 次 cycle の hypothesis seed になる。
 *   '- PR レビュー SLA を 4h に短縮 (@alice, 30分)'
 *   '- ドキュメント整備'                              (owner/est 無しは括弧省略)
 */
export function actionsToActDecisionsMarkdown(actions: readonly Action[]): string {
  return actions
    .map((a) => {
      const meta: string[] = []
      if (a.owner_candidate !== '') meta.push(a.owner_candidate)
      if (a.est_min > 0) meta.push(formatMinutesJa(a.est_min))
      const suffix = meta.length > 0 ? ` (${meta.join(', ')})` : ''
      return `- ${a.description}${suffix}`
    })
    .join('\n')
}

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
