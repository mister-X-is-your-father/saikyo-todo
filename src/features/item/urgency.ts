/**
 * iter279 ai-automation: Item の「緊急度 (urgency)」スコアを計算する pure helper。
 *
 * AI agent (PM Agent / Researcher) が「次にやるべき item」を提案する時、
 * priority / dueDate / isMust を組み合わせた優先順位を一貫して決められる
 * 数値を返す substrate。今までは sort 条件を component ごとに inline で
 * 書いていた (`(a.priority ?? 4) - (b.priority ?? 4)` 等) が、AI prompt から
 * 「上位 5 件」を選ぶには component sort では届かない。
 *
 * 算出ロジック (heuristic):
 *  - base = priority weight (p1=100, p2=70, p3=40, p4=10、null=10)
 *  - dueDate proximity bonus:
 *    + 期限切れ (今日より前) は +50
 *    + 今日 (今日が dueDate) は +35
 *    + 明日は +20
 *    + 今週内 (+2..+6 日) は +10
 *    + それ以降は 0
 *  - MUST bonus: +30 (絶対落とせない)
 *  - 完了済 (doneAt あり) は固定 0 (= 候補から外れる)
 *  - archive 済 (archivedAt あり) も 0
 *
 * 上限なし (priority + due + must で最大 100+50+30=180)、最低は 0。
 * sort 用に `compareUrgency(a, b)` も提供 (高 → 低)。
 */
import type { Item } from './schema'

/** Item から urgency 計算に必要なフィールドだけ抜き出した structural subset */
export type UrgencyFields = Pick<Item, 'priority' | 'dueDate' | 'isMust' | 'doneAt' | 'archivedAt'>

const PRIORITY_WEIGHTS: Record<number, number> = {
  1: 100,
  2: 70,
  3: 40,
  4: 10,
}

export function computeUrgency(item: UrgencyFields, today: Date = new Date()): number {
  if (item.doneAt || item.archivedAt) return 0

  const base = PRIORITY_WEIGHTS[item.priority] ?? 10
  const due = dueProximityBonus(item.dueDate, today)
  const must = item.isMust ? 30 : 0

  return base + due + must
}

function dueProximityBonus(dueDate: string | null | undefined, today: Date): number {
  if (!dueDate) return 0
  const todayBase = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dueBase = parseIsoDate(dueDate)
  if (!dueBase) return 0
  const diffDays = Math.round((dueBase.getTime() - todayBase.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return 50 // overdue
  if (diffDays === 0) return 35 // today
  if (diffDays === 1) return 20 // tomorrow
  if (diffDays <= 6) return 10 // this week
  return 0
}

function parseIsoDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d)
}

/** sort 用 (高 urgency が先頭)。Array.prototype.sort の comparator に渡せる。 */
export function compareUrgency<T extends UrgencyFields>(today: Date = new Date()) {
  return (a: T, b: T) => computeUrgency(b, today) - computeUrgency(a, today)
}

/**
 * iter292 ai-automation: urgency score の内訳 (factor 一覧) を返す pure helper。
 *
 * AI brief / pm-agent prompt が「この Item が urgent な理由」を文字列化したり、
 * UI tooltip が「p1 priority +100 / 期限切れ +50 / MUST +30 = 180」のような
 * 内訳を表示するための substrate。今までは `computeUrgency` が合計値しか返さず、
 * 「なぜ urgent なのか」は caller が再計算する必要があった。
 *
 * 戻り値は `{ score, factors }`:
 *   - `score` = `computeUrgency(item, today)` と完全一致 (合計値)
 *   - `factors` = `{ label, bonus }[]` の配列。bonus が 0 の factor は省略
 *     (= 「+0 のものは並べない」)。done/archive は score=0、factors=[{label: '完了済', bonus: 0}] 等
 *     のような sentinel ではなく、空配列 + score=0 で表現。
 *
 * label は日本語で、UI / prompt 双方で読める短ラベル:
 *   - `p1 priority` / `p2 priority` / `p3 priority` / `p4 priority` (priority weight)
 *   - `期限切れ` / `期限当日` / `期限明日` / `期限今週内` (due proximity)
 *   - `MUST` (isMust)
 */
export interface UrgencyFactor {
  label: string
  bonus: number
}

export interface UrgencyExplanation {
  score: number
  factors: UrgencyFactor[]
}

const PRIORITY_LABEL: Record<number, string> = {
  1: 'p1 priority',
  2: 'p2 priority',
  3: 'p3 priority',
  4: 'p4 priority',
}

export function explainUrgency(item: UrgencyFields, today: Date = new Date()): UrgencyExplanation {
  if (item.doneAt || item.archivedAt) return { score: 0, factors: [] }

  const factors: UrgencyFactor[] = []
  const baseLabel = PRIORITY_LABEL[item.priority] ?? 'p4 priority'
  const baseBonus = PRIORITY_WEIGHTS[item.priority] ?? 10
  factors.push({ label: baseLabel, bonus: baseBonus })

  const dueBonus = dueProximityBonus(item.dueDate, today)
  if (dueBonus > 0) {
    factors.push({ label: dueProximityLabelFor(dueBonus), bonus: dueBonus })
  }

  if (item.isMust) {
    factors.push({ label: 'MUST', bonus: 30 })
  }

  const score = factors.reduce((sum, f) => sum + f.bonus, 0)
  return { score, factors }
}

function dueProximityLabelFor(bonus: number): string {
  if (bonus === 50) return '期限切れ'
  if (bonus === 35) return '期限当日'
  if (bonus === 20) return '期限明日'
  if (bonus === 10) return '期限今週内'
  return '期限今後'
}

/** AI prompt 行 / UI tooltip 用の "p1 priority +100 / 期限切れ +50 / MUST +30" 形式。 */
export function formatUrgencyExplanation(explanation: UrgencyExplanation): string {
  if (explanation.factors.length === 0) return 'urgency 0 (完了済 / archive)'
  const parts = explanation.factors.map((f) => `${f.label} +${f.bonus}`)
  return `${parts.join(' / ')} = ${explanation.score}`
}

/**
 * iter284 ai-automation: AI 朝 brief / pm-agent / dashboard widget が
 * 「次にやるべき N 件」を取り出すための便利 helper。
 *
 * 仕様:
 *  - urgency=0 (= done / archive 済) は除外
 *  - 高 urgency が先頭、上限 `n` 件に切り詰め
 *  - 同 urgency の中での順序は元配列順を保つ (stable sort)
 */
export function selectTopUrgentItems<T extends UrgencyFields>(
  items: readonly T[],
  n: number,
  today: Date = new Date(),
): T[] {
  if (n <= 0) return []
  // 元配列に urgency を詰めて、urgency=0 を弾いてから sort + slice
  const enriched = items
    .map((it, i) => ({ it, i, u: computeUrgency(it, today) }))
    .filter((e) => e.u > 0)
  enriched.sort((a, b) => {
    if (b.u !== a.u) return b.u - a.u
    return a.i - b.i // tie breaker: 元順
  })
  return enriched.slice(0, n).map((e) => e.it)
}
