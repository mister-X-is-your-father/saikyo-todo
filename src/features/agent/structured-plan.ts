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

import { extractFirstJsonObject } from '@/lib/json/extract-first-object'
import { round1 } from '@/lib/round-decimal'

// iter1144: structured-plan 全 max/min に ja message 付与 (iter1086/1092/1126-1143 sweep)。
// AI plan parser の zod error が staging UI / Slack 通知 / test で日本語表示される。
export const StructuredPlanStepSchema = z.object({
  /** subtask の title (1-200 文字) */
  title: z
    .string()
    .trim()
    .min(1, 'step タイトルを入力してください')
    .max(200, 'step タイトルは 200 文字以内で入力してください'),
  /** 見積分 (1 step = 1-480 min) */
  est_min: z
    .number()
    .int()
    .min(1, '見積もり (分) は 1 以上で指定してください')
    .max(480, '見積もり (分) は 480 (= 8時間) 以下で指定してください'),
  /** 完了基準 (= dod、1 行 短く)。空文字許可 (省略可) */
  dod: z.string().trim().max(300, 'DoD は 300 文字以内で入力してください').default(''),
  /**
   * 同 plan 内の他 step の title (= 依存先)。
   * caller が staging UI で title → 実 step id に解決する想定。
   */
  dependencies: z
    .array(z.string().trim().min(1, '依存先 step タイトルを入力してください'))
    .default([]),
})
export type StructuredPlanStep = z.infer<typeof StructuredPlanStepSchema>

export const StructuredPlanSchema = z.object({
  /** 1-30 step、空配列は実用上 plan 不成立として reject */
  steps: z
    .array(StructuredPlanStepSchema)
    .min(1, 'step は 1 件以上必要です')
    .max(30, 'step は 30 件以内で指定してください'),
  /** total est_min の合計 (Pre-validation 段階では信頼しない、本 helper で再計算) */
  total_est_min: z
    .number()
    .int()
    .min(0, '合計見積もり (分) は 0 以上で指定してください')
    .optional(),
  /** 1 行 DoD サマリ */
  dod_summary: z
    .string()
    .trim()
    .min(1, 'DoD サマリを入力してください')
    .max(300, 'DoD サマリは 300 文字以内で入力してください'),
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

/**
 * iter543 ai-automation polish: AI prompt / chip aria-label / Slack 通知用 1 行 plan summary。
 *   '5 step / 合計 2h30m — 「DoD: ユーザ受入完了」'
 *   '3 step / 合計 45m'  (= dod_summary 短縮なし)
 *
 * 詳細 step 一覧は widget が直 render する想定 (本 helper は header chip 用)。
 */
export function formatStructuredPlanJa(plan: NormalizedStructuredPlan): string {
  const total = plan.totalEstMin
  const hours = Math.floor(total / 60)
  const mins = total % 60
  const totalStr = hours === 0 ? `${mins}m` : mins === 0 ? `${hours}h` : `${hours}h${mins}m`
  const dodPart = plan.dodSummary ? ` — 「DoD: ${plan.dodSummary}」` : ''
  return `${plan.steps.length} step / 合計 ${totalStr}${dodPart}`
}

/**
 * iter482 ai-automation: 全 step を依存順に topological sort (Kahn)。
 *
 * - 依存ループ検出時 → null (= staging UI で「依存を直してください」 message)
 * - 入力 plan は parseStructuredPlan 通過後を想定 (= 自参照 / 不明 dep は事前除外済)
 * - 同 layer 内の順序は title alphabetical で deterministic (test 安定 + 表示順 一定)
 *
 * 用途: staging proposal で subtasks を実 insert する順序、Gantt swimlane 描画の layer 順
 */
export function topoSortPlanSteps(plan: Pick<NormalizedStructuredPlan, 'steps'>): number[] | null {
  const n = plan.steps.length
  if (n === 0) return []

  const titleToIdx = new Map<string, number>()
  plan.steps.forEach((s, i) => titleToIdx.set(s.title, i))

  // 入次数 + 隣接 list (idx → 自分を依存している後続 idx[])
  const inDegree = new Array<number>(n).fill(0)
  const adj: number[][] = Array.from({ length: n }, () => [])
  plan.steps.forEach((s, i) => {
    for (const dep of s.dependencies) {
      const depIdx = titleToIdx.get(dep)
      if (depIdx === undefined || depIdx === i) continue // parser 通過済 plan では発生しないが防御
      inDegree[i] = (inDegree[i] ?? 0) + 1
      adj[depIdx]?.push(i)
    }
  })

  // 起点候補 (= inDegree 0) を title alphabetical で並べる
  const sortByTitleAlpha = (a: number, b: number): number =>
    (plan.steps[a]?.title ?? '').localeCompare(plan.steps[b]?.title ?? '')

  const queue: number[] = []
  for (let i = 0; i < n; i++) {
    if ((inDegree[i] ?? 0) === 0) queue.push(i)
  }
  queue.sort(sortByTitleAlpha)

  const order: number[] = []
  while (queue.length > 0) {
    const cur = queue.shift() as number
    order.push(cur)
    const next: number[] = []
    for (const child of adj[cur] ?? []) {
      inDegree[child] = (inDegree[child] ?? 0) - 1
      if ((inDegree[child] ?? 0) === 0) next.push(child)
    }
    next.sort(sortByTitleAlpha)
    queue.push(...next)
  }

  if (order.length !== n) return null // cycle
  return order
}

/**
 * iter482 ai-automation: 最長 step (= 単 step の est_min max) を抽出。
 *
 * 用途: chip 「最長 step: <title> (Xh)」、AI plan 検査の bottleneck 早期表示。
 * 同点は title alphabetical で先頭採用 (deterministic)。step 0 件 → null。
 */
export function pickLongestStep(
  plan: Pick<NormalizedStructuredPlan, 'steps'>,
): StructuredPlanStep | null {
  if (plan.steps.length === 0) return null
  let best: StructuredPlanStep | null = null
  for (const s of plan.steps) {
    if (
      best === null ||
      s.est_min > best.est_min ||
      (s.est_min === best.est_min && s.title.localeCompare(best.title) < 0)
    ) {
      best = s
    }
  }
  return best
}

/**
 * iter482 ai-automation: pickLongestStep の出力を chip 文言に整形。
 *   '最長 step: <title> (Xh)' / '...(Xh{Y}m)' / '...(Ym)'。null → '最長 step: なし'
 */
export function formatLongestStepJa(step: StructuredPlanStep | null): string {
  if (step === null) return '最長 step: なし'
  const h = Math.floor(step.est_min / 60)
  const m = step.est_min % 60
  const dur = h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h${m}m`
  return `最長 step: ${step.title} (${dur})`
}

/**
 * iter487 ai-automation: 依存 graph の critical path (= 最長 chain の est_min 合計) を計算。
 *
 * - 全 step の依存を辿って「自分を含むまでの最長 est_min 合計」を計算
 * - cycle 検出時は null (parser 通過済 plan では発生しないが防御)
 * - 全 step を並列実行できる ideal case では `pickLongestStep().est_min` と一致
 * - 線形依存 a→b→c (各 30/60/30) なら 120 (= 30+60+30、並列化不可)
 *
 * 用途: AI plan 生成時の「最早 finish 予測」 chip、Gantt critical path 強調、
 * Slack 通知の est 値 (合計 vs critical の差で並列化機会の指標)
 */
export function computePlanCriticalPathMin(
  plan: Pick<NormalizedStructuredPlan, 'steps'>,
): number | null {
  const order = topoSortPlanSteps(plan)
  if (order === null) return null

  const titleToIdx = new Map<string, number>()
  plan.steps.forEach((s, i) => titleToIdx.set(s.title, i))

  // dp[i] = step i を完了するまでの最長 chain の est_min 合計
  const dp = new Array<number>(plan.steps.length).fill(0)
  for (const idx of order) {
    const step = plan.steps[idx]
    if (!step) continue
    let maxDepEnd = 0
    for (const dep of step.dependencies) {
      const depIdx = titleToIdx.get(dep)
      if (depIdx === undefined || depIdx === idx) continue
      const depEnd = dp[depIdx] ?? 0
      if (depEnd > maxDepEnd) maxDepEnd = depEnd
    }
    dp[idx] = maxDepEnd + step.est_min
  }

  let max = 0
  for (const v of dp) {
    if (v > max) max = v
  }
  return max
}

/**
 * iter487 ai-automation: critical path min を chip 文言に整形。
 *   '最早 finish: 2h30m (合計 5h との差 2h30m = 並列化機会あり)'
 *   '最早 finish: 1h (合計 1h = 線形)'
 *   '最早 finish: 不定'  (= cycle)
 */
export function formatCriticalPathJa(criticalMin: number | null, totalMin: number): string {
  if (criticalMin === null) return '最早 finish: 不定 (依存 cycle)'
  const fmt = (m: number): string => {
    const h = Math.floor(m / 60)
    const r = m % 60
    return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h${r}m`
  }
  const gap = totalMin - criticalMin
  const tail =
    gap === 0
      ? '線形'
      : gap > 0
        ? `合計 ${fmt(totalMin)} との差 ${fmt(gap)} = 並列化機会あり`
        : '不整合' // 数学的には総和 ≥ critical なので発生しないが防御
  return `最早 finish: ${fmt(criticalMin)} (${tail})`
}

/**
 * iter512 ai-automation: 4 状態 hint シリーズ 14 弾目 — structured-plan の
 * 「plan 健全性」分類。step 数 / total est_min / dod_summary 充実度で 4 段階分類。
 *
 * - 'idle'     : steps.length === 0 (= 空 plan、parser 通過しないが防御)
 * - 'severe'   : totalEstMin > 600 (= 10h+ で巨大、要分割) OR dodSummary 1 行のみ
 *                かつ steps.length === 1 (= plan として粗すぎ)
 * - 'moderate' : totalEstMin > 240 (= 4h+) OR steps.length > 15 (= 過剰分割)
 * - 'mild'     : それ以外 (= 健全 plan)
 *
 * 用途: AI plan 受信時の「plan 健全性」 chip / Slack 通知見出し / staging UI badge。
 */
import { type FourStateHint, makeHintLabelFormatter } from '@/lib/hint'

export type StructuredPlanHint = FourStateHint

export function classifyStructuredPlanHint(plan: NormalizedStructuredPlan): StructuredPlanHint {
  if (plan.steps.length === 0) return 'idle'
  if (plan.totalEstMin > 600 || (plan.steps.length === 1 && plan.dodSummary.length <= 20)) {
    return 'severe'
  }
  if (plan.totalEstMin > 240 || plan.steps.length > 15) return 'moderate'
  return 'mild'
}

const STRUCTURED_PLAN_HINT_LABEL_JA: Record<StructuredPlanHint, string> = {
  idle: 'plan なし',
  mild: '健全',
  moderate: '要 review',
  severe: '要分割',
}

export const formatStructuredPlanHintJa = makeHintLabelFormatter(
  classifyStructuredPlanHint,
  STRUCTURED_PLAN_HINT_LABEL_JA,
)

/**
 * iter513 basics: 並列実行機会があるかを 1 行判定。critical path < total est_min なら
 * 並列化機会あり (true)、線形 / 全並列 / cycle なら false。
 *
 * 用途: caller が「この plan は並列で速くできる?」 を 1 行 boolean で判別、
 * UI badge 表示 / Slack 通知の簡易フラグ。
 */
export function hasParallelOpportunity(plan: NormalizedStructuredPlan): boolean {
  if (plan.steps.length <= 1) return false
  const critical = computePlanCriticalPathMin(plan)
  if (critical === null) return false // cycle
  return critical < plan.totalEstMin
}

/**
 * iter944 ai-automation: 並列化による speedup 比 (= totalEstMin / criticalMin) を返す。
 *
 * - 1.0 = 線形 (= 並列化機会なし)
 * - 2.0 = 並列で半分の時間
 * - N.0 = 全 N step が同時並列可能 (全 step 独立 / diamond の理想形)
 * - null = cycle (criticalMin null) もしくは steps 空
 *
 * 用途: AI plan 受信時の chip 「並列化で 1.5x 短縮可」、Slack 通知の優先度判定。
 * `hasParallelOpportunity` の数値版 (= boolean だけでは「どれくらい速くなるか」が出ない)。
 *
 * 計算精度: 共通 `round1` (lib/round-decimal) で 1 桁丸めて返す、test 安定。
 */
export function computePlanSpeedupRatio(plan: NormalizedStructuredPlan): number | null {
  if (plan.steps.length === 0) return null
  const critical = computePlanCriticalPathMin(plan)
  if (critical === null || critical === 0) return null
  return round1(plan.totalEstMin / critical)
}

/**
 * iter944 ai-automation: speedup ratio を chip 文言に整形。
 *   '並列化で 2.0x 短縮可'   (ratio > 1.0)
 *   '線形 (並列化機会なし)'  (ratio === 1.0)
 *   '不定 (cycle)'           (ratio === null)
 *
 * 1.0 ぴったり (= 線形) と それ以外 を区別。1 桁丸めで「1.0x」 のような無意味表示を避ける
 * (= 1.0 は「線形」、>1.0 のみ「Nx 短縮可」)。
 */
export function formatPlanSpeedupRatioJa(ratio: number | null): string {
  if (ratio === null) return '不定 (cycle)'
  if (ratio <= 1.0) return '線形 (並列化機会なし)'
  return `並列化で ${ratio}x 短縮可`
}

// 内部 helper を test しやすく named export
export { extractFirstJsonObject }
