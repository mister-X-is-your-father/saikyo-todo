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

import { rateToPct } from '@/lib/format-rate'
import { extractFirstJsonObject } from '@/lib/json/extract-first-object'
import { round2 } from '@/lib/round-decimal'

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
 *
 * iter1696 refactor: iter1432 で着地した `pickTopChecklistFindings` (n=1) を薄ラッパーで再利用、
 * 2 段 for-loop の重複ロジック (= fail 走査 → warn 走査) を排除。'ok' は alert 対象外なので
 * `top.status !== 'ok'` で gate (= status='ok' 単一の review は null = 完璧 review 表現)。
 * iter1425 `pickHighestSeveritySignal → pickTopSignalsBySeverity(n=1)` 統一の review 版。
 */
export function pickWorstChecklistFinding(
  review: Pick<StructuredReview, 'checklist'>,
): ChecklistItem | null {
  const top = pickTopChecklistFindings(review, 1)[0]
  return top && top.status !== 'ok' ? top : null
}

/**
 * iter484 ai-automation: review の最重要 improvement (severity high > medium > low) を抽出。
 *
 * - high が複数あれば 入力順 (= AI が並べた順) 先頭
 * - high なければ medium、それもなければ low、空なら null
 *
 * 用途: chip 「優先改善: <title>」、Slack 通知の 1 行アクション提示。
 *
 * iter1696 refactor: iter1432 で着地した `pickTopImprovements` (n=1) を薄ラッパーで再利用、
 * 3 段 sequential severity 走査ロジックを排除。`pickWorstChecklistFinding` と対称 pattern。
 * Improvement 全 severity (high/medium/low) は alert 対象 (= 「改善提案」 自体が即対応軸) なので
 * `pickWorstChecklistFinding` のような 'ok' gate は不要、単純な薄ラッパー。
 */
export function pickTopImprovement(
  review: Pick<StructuredReview, 'improvements'>,
): Improvement | null {
  return pickTopImprovements(review, 1)[0] ?? null
}

const CHECKLIST_STATUS_RANK: Record<ChecklistStatus, number> = {
  fail: 2,
  warn: 1,
  ok: 0,
}

const IMPROVEMENT_SEVERITY_RANK: Record<Improvement['severity'], number> = {
  high: 2,
  medium: 1,
  low: 0,
}

/**
 * iter1432 ai-automation: review.checklist から「上位 N severe findings」 を抽出する pure helper。
 *
 * `pickWorstChecklistFinding` (iter484) は単一抽出、本 helper は **N 件抽出**。
 * AI 朝 brief / Slack daily digest 「review 上位 3 findings」 headline / dashboard
 * 「優先対応 findings 列」 panel の substrate。
 *
 * 仕様:
 *  - 並び順: severity 降順 (fail → warn → ok)、同 severity は入力順保持 (stable)
 *  - n <= 0 → 空配列 (defensive)
 *  - n >= 全件 → 全 checklist を severity 順で
 *  - 入力 review を mutate しない (= 新配列を返す)
 *
 * caller pattern (Slack notification headline):
 *   const top3 = pickTopChecklistFindings(review, 3)
 *   const line = top3.map(f => statusGlyph(f.status).glyph + ' ' + f.point).join(' / ')
 *
 * 既存 helper との関係:
 *  - `pickWorstChecklistFinding`: 単一最重要 (= 1 件 alert / badge tone 向け)
 *  - 本 helper: 上位 N (= top N findings headline 向け)
 *  - `summarizeReview`: byStatus count (= 集計のみ)
 */
export function pickTopChecklistFindings(
  review: Pick<StructuredReview, 'checklist'>,
  n: number,
): ChecklistItem[] {
  if (n <= 0) return []
  return [...review.checklist]
    .sort((a, b) => CHECKLIST_STATUS_RANK[b.status] - CHECKLIST_STATUS_RANK[a.status])
    .slice(0, n)
}

/**
 * iter1432 ai-automation: review.improvements から「上位 N severe improvements」 を抽出。
 *
 * `pickTopImprovement` (iter484) は単一抽出、本 helper は **N 件抽出**。
 * 並び順: severity 降順 (high → medium → low)、同 severity は入力順保持 (stable)。
 *
 * caller pattern (AI 朝 brief 「優先改善 3 件」 headline):
 *   const top3 = pickTopImprovements(review, 3)
 *   const line = top3.map(i => `${i.severity}: ${i.title}`).join(' / ')
 *
 * 既存 helper との関係:
 *  - `pickTopImprovement`: 単一最重要 (= 1 件 alert 向け)
 *  - 本 helper: 上位 N (= top N improvements headline 向け)
 */
export function pickTopImprovements(
  review: Pick<StructuredReview, 'improvements'>,
  n: number,
): Improvement[] {
  if (n <= 0) return []
  return [...review.improvements]
    .sort((a, b) => IMPROVEMENT_SEVERITY_RANK[b.severity] - IMPROVEMENT_SEVERITY_RANK[a.severity])
    .slice(0, n)
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

/**
 * iter492 ai-automation: pickTopImprovement の出力を chip 文言に整形。
 *
 *   '優先改善: <title> [high]'
 *   '優先改善: <title> [medium]'
 *   '優先改善: なし'           (= 改善 0 件 = 完璧 review)
 *
 * severity 略号: high → ❗ / medium → ⚠ / low → · (意図的に控えめ glyph)。
 * caller は本文字列を chip aria-label / Slack 通知 / AI brief 1 行目に直 埋め込み。
 * 80 字超は ... 圧縮。
 */
export function formatTopImprovementJa(improvement: Improvement | null): string {
  if (improvement === null) return '優先改善: なし'
  const sevGlyph =
    improvement.severity === 'high' ? '❗' : improvement.severity === 'medium' ? '⚠' : '·'
  const truncated =
    improvement.title.length > 80 ? `${improvement.title.slice(0, 79)}…` : improvement.title
  return `${sevGlyph} 優先改善: ${truncated} [${improvement.severity}]`
}

/**
 * iter1002 ai-automation: review checklist の合格率 (= ok / total) を返す。
 *
 * - 1.0 = 全 pass (完璧 review)
 * - 0.0 = 全部 fail
 * - 0.5 = 半分 pass (= 不合格、verdict moderate/severe)
 * - null = checklist 空 (= 評価対象なし、summarizeReview 経由なら schema 上 reject される筈)
 *
 * iter944 `computePlanSpeedupRatio` (plan 並列度 metric) と並ぶ「単一 ratio metric」
 * pattern の review 軸版。fail/warn は distinct 扱いで除外、ok のみカウント。
 * round2 で 2 桁丸め (= 5/7 → 0.71、3/8 → 0.38 を区別可能)。
 *
 * 用途:
 *   - dashboard 「Review pass率 80%」 progress bar / chip
 *   - Slack 通知の数値見出し
 *   - 過去 review との trend 比較 (1 ratio で連続定量化、AI prompt context)
 */
export function computeReviewPassRatio(summary: Pick<ReviewSummary, 'byStatus'>): number | null {
  const total = summary.byStatus.ok + summary.byStatus.warn + summary.byStatus.fail
  if (total === 0) return null
  return round2(summary.byStatus.ok / total)
}

/**
 * iter1002 ai-automation: pass ratio を chip / Slack 1 行に整形。
 *   '合格率 100% (5/5、完璧)'
 *   '合格率 80% (4/5)'
 *   '合格率 0% (0/3、要全面再 review)'
 *   '評価なし (checklist 空)'
 *
 * 整数 % で見やすく (= ratio * 100 を Math.round)、count breakdown (ok/total) も同行に
 * 含めて「率 + 件数」両方が即 read-out 可能。0% / 100% は ベタ hint を明示で
 * SR にも「完璧」「要全面再 review」 が読み取れる。
 */
export function formatReviewPassRatioJa(
  ratio: number | null,
  summary: Pick<ReviewSummary, 'byStatus'>,
): string {
  if (ratio === null) return '評価なし (checklist 空)'
  const total = summary.byStatus.ok + summary.byStatus.warn + summary.byStatus.fail
  const pct = rateToPct(ratio)
  if (ratio >= 1.0) return `合格率 100% (${summary.byStatus.ok}/${total}、完璧)`
  if (ratio <= 0.0) return `合格率 0% (0/${total}、要全面再 review)`
  return `合格率 ${pct}% (${summary.byStatus.ok}/${total})`
}

/**
 * iter492 ai-automation: review verdict 4 状態 hint (= summarizeReview 経由の合否)。
 *
 * - 'idle'     : checklist 空 (= schema で reject されるが防御)
 * - 'severe'   : fail >= 1 (= 不合格、要対応)
 * - 'moderate' : warn >= 3 (= 多数注意点だが pass)
 * - 'mild'     : それ以外 (= 健全 pass)
 *
 * 用途: chip aria-label に「不合格 / 多数注意 / 健全」 を 1 単語で。
 */
import { type FourStateHint, makeHintLabelFormatter } from '@/lib/hint'

export type ReviewVerdictHint = FourStateHint

export function classifyReviewVerdictHint(
  summary: Pick<ReviewSummary, 'byStatus'>,
): ReviewVerdictHint {
  const total = summary.byStatus.ok + summary.byStatus.warn + summary.byStatus.fail
  if (total === 0) return 'idle'
  if (summary.byStatus.fail >= 1) return 'severe'
  if (summary.byStatus.warn >= 3) return 'moderate'
  return 'mild'
}

const REVIEW_VERDICT_LABEL_JA: Record<ReviewVerdictHint, string> = {
  idle: 'review なし',
  mild: '健全 pass',
  moderate: '多数注意 (pass)',
  severe: '不合格',
}

export const formatReviewVerdictHintJa = makeHintLabelFormatter(
  classifyReviewVerdictHint,
  REVIEW_VERDICT_LABEL_JA,
)

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
