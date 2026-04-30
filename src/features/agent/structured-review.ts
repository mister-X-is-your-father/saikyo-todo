/**
 * iter538 (queue AC-2 substrate): AI に review してもらう機能の structured output
 * 強制用 zod schema + 寛容 parser。
 *
 * 設計目的 (FEEDBACK_QUEUE.md AI 分業/協業 シリーズ AC-2):
 *   - 「AI に review」 button 押下時、AI が dod / plan / output を読んで:
 *     1. checklist 項目 (3-7 件、各 ✅/⚠/❌ + コメント)
 *     2. 改善提案 (1-3 件、具体的 action)
 *     を **structured で返す** → comment に post → UI が markdown 装飾で表示
 *   - 「これでいいよ」 系の fluffy 文章 NG、必ず checklist + 改善 で構造化
 *
 * 既存の structured-plan.ts (iter533) と同 pattern:
 *   - JSON 寛容 parse (code block / pre-text 対応)
 *   - zod 検証 + tolerant fallback
 *   - 失敗時は ok=false で UI が「再生成」 button を出す
 *
 * AI 不使用 (本 helper)、副作用無し、依存は zod のみ。
 */
import { z } from 'zod'

export const ChecklistStatusSchema = z.enum(['ok', 'warn', 'fail'])
export type ChecklistStatus = z.infer<typeof ChecklistStatusSchema>

export const ChecklistItemSchema = z.object({
  /** review 観点 (1 行 短く、例: 「DoD「全 test 緑」 を満たすか」) */
  point: z.string().trim().min(1).max(200),
  /** 'ok' (✅) / 'warn' (⚠) / 'fail' (❌) */
  status: ChecklistStatusSchema,
  /** 判定理由 (1 行、optional)、空文字許可 */
  comment: z.string().trim().max(300).default(''),
})
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>

export const ImprovementSchema = z.object({
  /** 改善 action の短い title */
  title: z.string().trim().min(1).max(200),
  /** なぜこの改善か (1-2 行) */
  rationale: z.string().trim().min(1).max(400),
  /** 重要度 ('high'/'medium'/'low')、自由表記 NG */
  severity: z.enum(['high', 'medium', 'low']).default('medium'),
})
export type Improvement = z.infer<typeof ImprovementSchema>

export const StructuredReviewSchema = z.object({
  /** 3-7 checklist items、空 reject */
  checklist: z.array(ChecklistItemSchema).min(1).max(15),
  /** 1-3 改善提案、無くても OK (= 完璧 review) */
  improvements: z.array(ImprovementSchema).max(5).default([]),
  /** 1 行 総合評価 (例: 「DoD は満たすが test カバレッジが浅い」) */
  overall_summary: z.string().trim().min(1).max(400),
})
export type StructuredReview = z.infer<typeof StructuredReviewSchema>

export interface ReviewSummary {
  /** ok/warn/fail の件数 */
  byStatus: { ok: number; warn: number; fail: number }
  /** improvements の severity 別件数 */
  bySeverity: { high: number; medium: number; low: number }
  /** review 全体の合否 hint: 1 つでも fail があれば false */
  pass: boolean
}

export type ParseStructuredReviewResult =
  | { ok: true; review: StructuredReview; summary: ReviewSummary }
  | { ok: false; error: string; details?: unknown }

/** input string から 1 つ目の JSON object を切り出す (structured-plan.ts と同 pattern) */
function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const c = s.charAt(i)
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

export function parseStructuredReview(input: unknown): ParseStructuredReviewResult {
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

  const parsed = StructuredReviewSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'schema 不一致', details: parsed.error.issues }
  }

  const summary = summarizeReview(parsed.data)
  return { ok: true, review: parsed.data, summary }
}

export function summarizeReview(review: StructuredReview): ReviewSummary {
  const byStatus = { ok: 0, warn: 0, fail: 0 }
  for (const c of review.checklist) {
    byStatus[c.status] += 1
  }
  const bySeverity = { high: 0, medium: 0, low: 0 }
  for (const imp of review.improvements) {
    bySeverity[imp.severity] += 1
  }
  return { byStatus, bySeverity, pass: byStatus.fail === 0 }
}

/** UI で ✅/⚠/❌ icon に変換しやすい label / glyph を返す */
export function statusGlyph(status: ChecklistStatus): { glyph: string; label: string } {
  if (status === 'ok') return { glyph: '✅', label: 'OK' }
  if (status === 'warn') return { glyph: '⚠️', label: '注意' }
  return { glyph: '❌', label: '要対策' }
}

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
