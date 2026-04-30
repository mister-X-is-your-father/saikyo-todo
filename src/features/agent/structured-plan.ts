/**
 * iter533 (queue fluffy-6 plan→structured substrate): AI Plan 生成の structured
 * output 強制用 zod schema + 寛容 parser。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI が markdown 文章 comment を書くと「やる事は～です」 fluffy 化リスク
 *   - zod schema で steps[].title / est_min / dod / dependencies + total_est_min +
 *     dod_summary を **structured output 強制**
 *   - widget 側は本 helper の StructuredPlan を直 render (subtasks staging proposal 用)
 *
 * AI 出力経路 (将来):
 *   1. Researcher が tool 経由で structured JSON を返す形に prompt 設計
 *   2. 本 helper の `parseStructuredPlan` で zod 検証 + tolerant fallback
 *   3. ItemEditDialog の「Plan を生成」 button 押下後、JSON が来たら staging UI 表示、
 *      user 承認で実 subtasks 化 (insert + parent_path 設定)
 *
 * 副作用なし、依存は zod のみ (server-only 不要、UI/Server 双方で利用可)。
 */
import { z } from 'zod'

export const StructuredPlanStepSchema = z.object({
  /** subtask の title (1-200 文字) */
  title: z.string().trim().min(1).max(200),
  /** 見積分 (1 step = 1-480 min) */
  est_min: z.number().int().min(1).max(480),
  /** 完了基準 (= dod、1 行 短く)。空文字許可 (省略可) */
  dod: z.string().trim().max(300).default(''),
  /**
   * 同 plan 内の他 step の title (= 依存先)。
   * caller が staging UI で title → 実 step id に解決する想定。
   */
  dependencies: z.array(z.string().trim().min(1)).default([]),
})
export type StructuredPlanStep = z.infer<typeof StructuredPlanStepSchema>

export const StructuredPlanSchema = z.object({
  /** 1-30 step、空配列は実用上 plan 不成立として reject */
  steps: z.array(StructuredPlanStepSchema).min(1).max(30),
  /** total est_min の合計 (Pre-validation 段階では信頼しない、本 helper で再計算) */
  total_est_min: z.number().int().min(0).optional(),
  /** 1 行 DoD サマリ */
  dod_summary: z.string().trim().min(1).max(300),
})
export type StructuredPlan = z.infer<typeof StructuredPlanSchema>

/** parser 結果 */
export type ParseStructuredPlanResult =
  | { ok: true; plan: NormalizedStructuredPlan }
  | { ok: false; error: string; details?: unknown }

/** total_est_min を caller が信用できる形に再計算した plan */
export interface NormalizedStructuredPlan {
  steps: StructuredPlanStep[]
  /** steps[].est_min の合計 (本 helper で再計算、入力値は無視) */
  totalEstMin: number
  dodSummary: string
}

/** dependency に「自分自身 / 存在しない title」 が混入した場合を検出 */
export function validateDependencies(plan: StructuredPlan): {
  ok: boolean
  errors: Array<{ stepIndex: number; dependency: string; reason: 'self' | 'unknown' }>
} {
  const titleToIdx = new Map<string, number>()
  plan.steps.forEach((s, i) => titleToIdx.set(s.title, i))
  const errors: Array<{ stepIndex: number; dependency: string; reason: 'self' | 'unknown' }> = []
  plan.steps.forEach((s, i) => {
    for (const dep of s.dependencies) {
      const idx = titleToIdx.get(dep)
      if (idx === undefined) {
        errors.push({ stepIndex: i, dependency: dep, reason: 'unknown' })
      } else if (idx === i) {
        errors.push({ stepIndex: i, dependency: dep, reason: 'self' })
      }
    }
  })
  return { ok: errors.length === 0, errors }
}

/**
 * AI 出力 (string 想定、JSON code block も許容) を寛容に parse。
 *
 * 寛容仕様:
 *   - 入力が `{...}` か ```json {...} ``` か `pre-text {...} post-text` でも 1 番目の
 *     `{` から対応する `}` までを切り出して JSON.parse 試行
 *   - dependencies / dod が無くても zod default で穴埋め
 *   - dependency の自参照 / 存在しない title は warning にせず error 化
 *
 * 失敗時は `{ ok: false, error, details }` を返し、caller はユーザに「再生成」 button を出す
 */
export function parseStructuredPlan(input: unknown): ParseStructuredPlanResult {
  // 1. string なら JSON 切り出し
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

  // 2. zod 検証
  const parsed = StructuredPlanSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'schema 不一致', details: parsed.error.issues }
  }

  // 3. dependency 検証
  const deps = validateDependencies(parsed.data)
  if (!deps.ok) {
    return {
      ok: false,
      error: 'dependencies に自参照 or 存在しない title',
      details: deps.errors,
    }
  }

  // 4. total_est_min 再計算 (入力値は信用しない)
  const totalEstMin = parsed.data.steps.reduce((acc, s) => acc + s.est_min, 0)

  return {
    ok: true,
    plan: {
      steps: parsed.data.steps,
      totalEstMin,
      dodSummary: parsed.data.dod_summary,
    },
  }
}

/** 入力 string から 1 つ目の JSON object (`{...}`) を切り出す。失敗時 null */
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

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
