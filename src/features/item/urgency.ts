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
import { formatNonZeroCounts } from '@/lib/format-counts'

import { type DueProximityKind, getDueProximity } from './due-proximity'
import type { Item } from './schema'

/** Item から urgency 計算に必要なフィールドだけ抜き出した structural subset */
export type UrgencyFields = Pick<Item, 'priority' | 'dueDate' | 'isMust' | 'doneAt' | 'archivedAt'>

const PRIORITY_WEIGHTS: Record<number, number> = {
  1: 100,
  2: 70,
  3: 40,
  4: 10,
}

/**
 * iter295 refactor: dueProximity bonus の閾値を `getDueProximity` の kind に
 * 集約。今までは urgency.ts 内で diffDays を再計算 + parseIsoDate を重複定義
 * していたが、due-proximity.ts に同じ thresholds (overdue<0 / today=0 / tomorrow=1
 * / thisWeek<=6 / later) があるので kind→bonus のテーブル lookup に置換 (動作変更ゼロ)。
 */
const DUE_PROXIMITY_BONUS: Record<DueProximityKind, number> = {
  overdue: 50,
  today: 35,
  tomorrow: 20,
  thisWeek: 10,
  later: 0,
  noDate: 0,
}

const DUE_PROXIMITY_LABEL: Record<DueProximityKind, string> = {
  overdue: '期限切れ',
  today: '期限当日',
  tomorrow: '期限明日',
  thisWeek: '期限今週内',
  later: '期限今後',
  noDate: '期限未設定',
}

export function computeUrgency(item: UrgencyFields, today: Date = new Date()): number {
  if (item.doneAt || item.archivedAt) return 0

  const base = PRIORITY_WEIGHTS[item.priority] ?? 10
  const { kind } = getDueProximity(item.dueDate, today)
  const due = DUE_PROXIMITY_BONUS[kind]
  const must = item.isMust ? 30 : 0

  return base + due + must
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

  const { kind } = getDueProximity(item.dueDate, today)
  const dueBonus = DUE_PROXIMITY_BONUS[kind]
  if (dueBonus > 0) {
    factors.push({ label: DUE_PROXIMITY_LABEL[kind], bonus: dueBonus })
  }

  if (item.isMust) {
    factors.push({ label: 'MUST', bonus: 30 })
  }

  const score = factors.reduce((sum, f) => sum + f.bonus, 0)
  return { score, factors }
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

/**
 * iter294 ai-automation: urgency 数値を「tier (緊急 / 高 / 中 / 低 / 対象外)」
 * に粗粒度分類する pure helper + group/count/format。
 *
 * iter287 (`getDueProximity`) / iter289 (`groupItemsByDueProximity` 等) と同じ
 * 「数値 → bucket → 集計 → 文字列」 substrate を urgency 軸でも揃える。
 * iter292-A (`explainUrgency` / `formatUrgencyExplanation`) は item 単独の
 * 内訳を文字列化するのに対し、本 iter は **item 群を tier 別に集計する** 軸。
 * iter292-B (`groupItemsByPriority` / `countItemsByPriority` 等) は priority
 * のみで tier 化するのに対し、本 helper は priority + dueDate + MUST を全部
 * 加味した urgency score 由来で tier 化するので「期限切れの p3 が緊急に上がる」
 * のような proximity 由来の格上げが反映される。
 *
 * AI 朝 brief / pm-agent prompt が `緊急 2 / 高 5 / 中 12 / 低 30 / 対象外 8`
 * のような 1 行 summary を 1 関数 (`formatUrgencyTierCounts`) で出せる。UI 側
 * でも item チップ / dashboard widget が同じ tier 文字列を流用できる。
 *
 * tier 境界 (computeUrgency の score を踏まえた heuristic):
 *  - `critical` (緊急)  … score ≥ 100。p1 単独 / p2+overdue / p1+today / p3+overdue+must
 *  - `high`     (高)    … 50 ≤ score < 100。p2 / p3+today / p3+overdue / p4+overdue+must
 *  - `medium`   (中)    … 20 ≤ score < 50。p3 / p4+today / p4+thisWeek+must (50 は high 側)
 *  - `low`      (低)    … 0 < score < 20。p4 単独 (=10)
 *  - `none`    (対象外) … score ≤ 0 or NaN/Infinity。done/archive 済と同じ扱い
 */
export type UrgencyTier = 'critical' | 'high' | 'medium' | 'low' | 'none'

const TIER_ORDER: readonly UrgencyTier[] = ['critical', 'high', 'medium', 'low', 'none'] as const

const TIER_LABEL: Record<UrgencyTier, string> = {
  critical: '緊急',
  high: '高',
  medium: '中',
  low: '低',
  none: '対象外',
}

/** score (= computeUrgency の戻り値) を tier に分類。NaN/Infinity/負値 fail-soft で 'none'。 */
export function urgencyTier(score: number): UrgencyTier {
  if (!Number.isFinite(score) || score <= 0) return 'none'
  if (score >= 100) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}

/** UI / prompt 用の日本語短ラベル ('緊急' / '高' / '中' / '低' / '対象外')。 */
export function urgencyTierLabel(tier: UrgencyTier): string {
  return TIER_LABEL[tier]
}

export type UrgencyTierGroups<T> = Record<UrgencyTier, T[]>

/**
 * items を urgency tier 別の配列に振り分ける (元配列順で stable)。
 * 各 tier は必ず空配列で初期化されるので `groups.critical.length` のような
 * undefined チェック不要のアクセスができる。done/archive 済は 'none' に集まる。
 */
export function groupItemsByUrgencyTier<T extends UrgencyFields>(
  items: readonly T[],
  today: Date = new Date(),
): UrgencyTierGroups<T> {
  const groups: UrgencyTierGroups<T> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    none: [],
  }
  for (const it of items) {
    groups[urgencyTier(computeUrgency(it, today))].push(it)
  }
  return groups
}

/**
 * iter392 ai-automation: 指定 tier 集合に該当する items だけを stable 順序で抽出。
 *
 * `groupItemsByUrgencyTier` は 5 tier 全部を返すが、本 helper は「actionable」
 * (= critical + high) 等の subset を 1 配列で取り出す薄い filter。AI 朝 brief /
 * pm-agent / dashboard が「今すぐ動くべき items 一覧」を 1 関数で出せる。
 *
 * 仕様:
 *   - input: items + tiers (string[] / readonly、Set 化して O(1) 判定)
 *   - 出力: 対象 tier に属する items を **元配列順** で返す stable 順序
 *   - tiers が空なら空配列
 *   - selectTopUrgentItems (top-N) と相補: 本 helper は「tier filter 全件」、
 *     selectTopUrgentItems は「score 降順 N 件」
 */
export function pickItemsByUrgencyTiers<T extends UrgencyFields>(
  items: readonly T[],
  tiers: readonly UrgencyTier[],
  today: Date = new Date(),
): T[] {
  if (tiers.length === 0) return []
  const tierSet = new Set(tiers)
  const out: T[] = []
  for (const it of items) {
    if (tierSet.has(urgencyTier(computeUrgency(it, today)))) out.push(it)
  }
  return out
}

/** items を tier 別の件数に圧縮 (group せず数だけ欲しい AI prompt 用)。 */
export function countItemsByUrgencyTier<T extends UrgencyFields>(
  items: readonly T[],
  today: Date = new Date(),
): Record<UrgencyTier, number> {
  const counts: Record<UrgencyTier, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  }
  for (const it of items) {
    counts[urgencyTier(computeUrgency(it, today))] += 1
  }
  return counts
}

/**
 * AI prompt 行 / dashboard chip 用の 1 行 summary。件数 0 の tier は省略、
 * tier 順 (critical → high → medium → low → none) を保つ。全 0 なら '0 件'。
 */
export function formatUrgencyTierCounts(counts: Record<UrgencyTier, number>): string {
  return formatNonZeroCounts(counts, TIER_ORDER, TIER_LABEL)
}

/**
 * iter393 basics: urgency tier counts から「要対応 chip」を出すかの severity を決める helper。
 *
 * dashboard chip は actionable subset (critical / high) が 1 件以上のときだけ
 * 出したい (= medium / low / none しか無い workspace は UI 静か)。tone は:
 *   - `severe` … critical > 0 (赤、強警告)
 *   - `warn`   … critical = 0 かつ high > 0 (琥珀、警戒)
 *   - `idle`   … 上記以外 (= chip 非表示、progressive disclosure)
 *
 * slip-days / must-hygiene と同じ「重度 / 軽度 / 静か」 3 値モデル。chip の
 * tone class とは独立 (chip 側で 'severe' は red 直接 / 'warn' は chipTone3Class)。
 */
export type UrgencyTierSeverity = 'severe' | 'warn' | 'idle'

export function urgencyTierCountsSeverity(
  counts: Record<UrgencyTier, number>,
): UrgencyTierSeverity {
  if (counts.critical > 0) return 'severe'
  if (counts.high > 0) return 'warn'
  return 'idle'
}
