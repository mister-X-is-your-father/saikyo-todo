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

import { extractFirstJsonObject } from '@/lib/json/extract-first-object'

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

/**
 * iter542 ai-automation polish: AI prompt / chip aria-label / Slack 通知用 1 行 review summary。
 *   '合格 (✅5 ⚠1 ❌0、改善 0 件)'
 *   '不合格 (✅3 ⚠1 ❌2、改善 high 1 / medium 1)'
 *   '合格 (✅3、改善 medium 1)'
 *
 * count=0 の status / severity は省略 (省略しない場合 "✅0 ⚠0 ❌0" で煩雑なので圧縮)。
 */
export function formatReviewSummaryJa(summary: ReviewSummary): string {
  const verdict = summary.pass ? '合格' : '不合格'
  const statusParts: string[] = []
  if (summary.byStatus.ok > 0) statusParts.push(`✅${summary.byStatus.ok}`)
  if (summary.byStatus.warn > 0) statusParts.push(`⚠${summary.byStatus.warn}`)
  if (summary.byStatus.fail > 0) statusParts.push(`❌${summary.byStatus.fail}`)
  const sevParts: string[] = []
  if (summary.bySeverity.high > 0) sevParts.push(`high ${summary.bySeverity.high}`)
  if (summary.bySeverity.medium > 0) sevParts.push(`medium ${summary.bySeverity.medium}`)
  if (summary.bySeverity.low > 0) sevParts.push(`low ${summary.bySeverity.low}`)
  const totalImprovements =
    summary.bySeverity.high + summary.bySeverity.medium + summary.bySeverity.low
  const impPart =
    sevParts.length === 0 ? `改善 ${totalImprovements} 件` : `改善 ${sevParts.join(' / ')}`
  return `${verdict} (${statusParts.join(' ')}、${impPart})`
}

/**
 * iter484 ai-automation: review の最深刻 issue (= 最初の fail item) を抽出。
 *
 * - fail なし → 最初の warn item
 * - warn もなし → null (= 完璧 review)
 * - 同 status 内では入力順 (= AI が並べた順、通常 importance 順) で先頭採用
 *
 * 用途: chip 「最重要: <point>」、Slack escalation 通知の見出し、AI 再 prompt の context。
 */
export function pickWorstChecklistFinding(
  review: Pick<StructuredReview, 'checklist'>,
): ChecklistItem | null {
  for (const c of review.checklist) {
    if (c.status === 'fail') return c
  }
  for (const c of review.checklist) {
    if (c.status === 'warn') return c
  }
  return null
}

/**
 * iter484 ai-automation: review の最重要 improvement (severity high > medium > low) を抽出。
 *
 * - high が複数あれば 入力順 (= AI が並べた順) 先頭
 * - high なければ medium、それもなければ low、空なら null
 *
 * 用途: chip 「優先改善: <title>」、Slack 通知の 1 行アクション提示。
 */
export function pickTopImprovement(
  review: Pick<StructuredReview, 'improvements'>,
): Improvement | null {
  if (review.improvements.length === 0) return null
  const order: Improvement['severity'][] = ['high', 'medium', 'low']
  for (const sev of order) {
    const found = review.improvements.find((imp) => imp.severity === sev)
    if (found) return found
  }
  return null
}

/**
 * iter484 ai-automation: pickWorstChecklistFinding の出力を chip 文言に整形。
 *   null → 'review 完璧 (要対応なし)'
 *   fail → '❌ <point>' (200 文字以内、超過は ... 圧縮)
 *   warn → '⚠ <point>'
 */
export function formatWorstChecklistFindingJa(finding: ChecklistItem | null): string {
  if (finding === null) return 'review 完璧 (要対応なし)'
  const { glyph } = statusGlyph(finding.status)
  const truncated = finding.point.length > 80 ? `${finding.point.slice(0, 79)}…` : finding.point
  return `${glyph} ${truncated}`
}

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
