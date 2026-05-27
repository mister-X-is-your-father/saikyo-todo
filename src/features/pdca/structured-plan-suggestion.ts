/**
 * iter1408 (queue PDCA AI-1 substrate): PDCA Plan phase「生成補助」の structured output
 * 強制用 zod schema + 寛容 parser。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 AI-1):
 *   - title 入力 → AI が `{hypothesis, target_metric_candidates: string[],
 *     suggested_items: ItemRef[]}` を **structured で提案** (= 選択肢提示のみ)。
 *   - 「とりあえずやってみよう」 系の文章生成 NG、metric は候補 list で選ばせる。
 *   - user が hypothesis を編集 / metric を 1 つ選択 / suggested item を link 採否する。
 *
 * structured-check-findings.ts (AI-2) / structured-act-decisions.ts (AI-3) と同 pattern。
 * AI 不使用 (本 helper)、副作用無し、依存は zod のみ。これで PDCA AI structured
 * trio (AI-1 Plan / AI-2 Check / AI-3 Act) が揃う。
 */
import { z } from 'zod'

import { extractFirstJsonObject } from '@/lib/json/extract-first-object'

export const SuggestedItemSchema = z.object({
  /** 既存 item を指す場合の id (新規候補は省略) */
  itemId: z.string().trim().min(1).max(64).optional(),
  /** item title (新規候補 or 既存の表示用) */
  title: z.string().trim().min(1).max(280),
})
export type SuggestedItem = z.infer<typeof SuggestedItemSchema>

export const StructuredPlanSuggestionSchema = z.object({
  /** 仮説 1 本 (user が編集する前提)、空 reject */
  hypothesis: z.string().trim().min(1).max(500),
  /** 目標指標の候補 1-5 件 (user が 1 つ選ぶ) */
  target_metric_candidates: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
  /** 紐付け候補 item 0-10 件 (採否は user) */
  suggested_items: z.array(SuggestedItemSchema).max(10).default([]),
})
export type StructuredPlanSuggestion = z.infer<typeof StructuredPlanSuggestionSchema>

export interface PlanSuggestionSummary {
  metricCount: number
  suggestedItemCount: number
  /** itemId 付き = 既存 item を指す件数 (残りは新規候補) */
  existingItemCount: number
}

export type ParsePlanSuggestionResult =
  | { ok: true; suggestion: StructuredPlanSuggestion; summary: PlanSuggestionSummary }
  | { ok: false; error: string; details?: unknown }

export function parseStructuredPlanSuggestion(input: unknown): ParsePlanSuggestionResult {
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

  const parsed = StructuredPlanSuggestionSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'schema 不一致', details: parsed.error.issues }
  }

  return { ok: true, suggestion: parsed.data, summary: summarizePlanSuggestion(parsed.data) }
}

export function summarizePlanSuggestion(
  suggestion: StructuredPlanSuggestion,
): PlanSuggestionSummary {
  let existingItemCount = 0
  for (const it of suggestion.suggested_items) {
    if (it.itemId !== undefined) existingItemCount += 1
  }
  return {
    metricCount: suggestion.target_metric_candidates.length,
    suggestedItemCount: suggestion.suggested_items.length,
    existingItemCount,
  }
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 summary。
 *   'Plan 提案: metric 候補 3 / item 5 (既存 2)'
 *   'Plan 提案: metric 候補 2 / item 0'        (suggested item 0 = item 0)
 */
export function formatPlanSuggestionSummaryJa(summary: PlanSuggestionSummary): string {
  const itemPart =
    summary.existingItemCount > 0
      ? `item ${summary.suggestedItemCount} (既存 ${summary.existingItemCount})`
      : `item ${summary.suggestedItemCount}`
  return `Plan 提案: metric 候補 ${summary.metricCount} / ${itemPart}`
}

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
