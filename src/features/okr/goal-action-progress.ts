/**
 * iter1424 (queue 目標達成サポート substrate): goal に紐付く action items の達成度を
 * 算出する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 目標達成サポート + 繰り返しタスク):
 *   - goal_action_items (goal_id, item_id, weight) で goal とそれを実現する item を紐付け、
 *     dashboard 「目標達成度 chart」 で done 比率を見せる。
 *   - 本 helper は done/total + 重み付き % を deterministic に算出 → goal-health.ts の
 *     `computeGoalHealth({ pct })` 入力に渡せる (= 時間軸 health と組み合わせ)。
 *
 * weight: 各 action item の重要度 (default 1)。重み付き達成率 = Σ(done の weight) / Σweight。
 * 不正 weight (負 / 非有限) は 1 に正規化。
 *
 * AI 不使用・副作用無し。pure helper + Vitest 単体で網羅。
 */
import { rateToPct } from '@/lib/format-rate'

export interface ActionItemProgressInput {
  done: boolean
  /** 重要度 (default 1、負/非有限は 1 に正規化) */
  weight?: number | null
}

export interface GoalActionProgress {
  total: number
  doneCount: number
  /** 件数ベース達成率 % (整数)、total=0 → 0 */
  pct: number
  /** 重み付き達成率 % (整数)、total=0 → 0 */
  weightedPct: number
}

function normWeight(w: number | null | undefined): number {
  if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) return 1
  return w
}

export function computeGoalActionProgress(
  items: readonly ActionItemProgressInput[],
): GoalActionProgress {
  const total = items.length
  if (total === 0) return { total: 0, doneCount: 0, pct: 0, weightedPct: 0 }

  let doneCount = 0
  let totalWeight = 0
  let doneWeight = 0
  for (const it of items) {
    const w = normWeight(it.weight)
    totalWeight += w
    if (it.done) {
      doneCount += 1
      doneWeight += w
    }
  }

  const pct = rateToPct(doneCount / total)
  const weightedPct = totalWeight === 0 ? 0 : rateToPct(doneWeight / totalWeight)
  return { total, doneCount, pct, weightedPct }
}

/**
 * chip / chart label 用 1 行。
 *   '目標達成 60% (3/5)'                 (= 重みなし or 重み均一)
 *   '目標達成 70% (3/5、重み付き)'        (= weightedPct ≠ pct)
 *   '紐付け action なし'                  (total 0)
 */
export function formatGoalActionProgressJa(p: GoalActionProgress): string {
  if (p.total === 0) return '紐付け action なし'
  if (p.weightedPct !== p.pct) {
    return `目標達成 ${p.weightedPct}% (${p.doneCount}/${p.total}、重み付き)`
  }
  return `目標達成 ${p.pct}% (${p.doneCount}/${p.total})`
}
