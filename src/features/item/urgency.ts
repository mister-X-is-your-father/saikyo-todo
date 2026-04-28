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
