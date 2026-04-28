/**
 * iter294 ai-automation: MUST item の中から「落としそうな」リスク item を抽出する pure helper。
 *
 * MVP の核 (CLAUDE.md): 「MUST 絶対落とさない」。AI agent (PM Pre-mortem / 朝 brief /
 * dashboard widget) が「今このまま放置すると落ちる MUST」を 1 関数で取り出せる substrate。
 * 今までは pm-service / dashboard が独自 SQL や inline filter で「期限近い MUST」を
 * 抽出していた → 同 heuristic を pure 関数として固定し、prompt や UI で再利用可能に。
 *
 * リスク判定 (heuristic):
 *  - `item.isMust === true`
 *  - `doneAt == null && archivedAt == null` (未完 + 未 archive)
 *  - `dueDate` の getDueProximity が `'overdue'` / `'today'` / `'tomorrow'` /
 *    `'thisWeek'` のいずれか (= `withinDays` 以下、default 6)
 *  - `dueDate` 未設定 (`'noDate'`) は除外 (= 「期限が無い MUST」は別 issue として
 *    本関数では拾わない、caller 側で「dueDate 無 MUST」を別経路で検知する想定)
 *
 * 並び順: due-proximity の severity 降順 (overdue → today → tomorrow → thisWeek)、
 * 同 severity 内では urgency.computeUrgency 降順 (priority + must の合計重み)、
 * urgency も同なら元配列順 (stable)。
 *
 * 戻り値は元 item と analysis を bundle した `{ item, proximity, urgency }`。
 */
import { type DueProximity, type DueProximityKind, getDueProximity } from './due-proximity'
import { computeUrgency, type UrgencyFields } from './urgency'

/** 本関数が必要とする Item の structural subset。 */
export type MustRiskFields = UrgencyFields & {
  id?: string
  title?: string
  dueDate: string | null | undefined
}

export interface MustRiskEntry<T extends MustRiskFields> {
  item: T
  proximity: DueProximity
  urgency: number
}

const RISK_KINDS: ReadonlySet<DueProximityKind> = new Set([
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
])

/** severity 大きい順に並べる時の重み。soft / hard 区別不要なので 4 段階のみ。 */
const SEVERITY_RANK: Record<DueProximityKind, number> = {
  overdue: 4,
  today: 3,
  tomorrow: 2,
  thisWeek: 1,
  later: 0,
  noDate: 0,
}

export interface SelectAtRiskMustOptions {
  /** thisWeek の上限。default 6 (= today+6 まで)。0 を渡すと overdue + today のみ。 */
  withinDays?: number
}

/**
 * MUST + 期限近接の組み合わせで「落ちそう」と判定された items を返す。
 * 結果配列は severity 高順で並ぶ。`withinDays` を 0 にすると今日以前 (overdue/today) のみ。
 */
export function selectAtRiskMust<T extends MustRiskFields>(
  items: readonly T[],
  options: SelectAtRiskMustOptions = {},
  today: Date | string = new Date(),
): MustRiskEntry<T>[] {
  const { withinDays = 6 } = options
  const enriched: MustRiskEntry<T>[] = []
  for (const it of items) {
    if (!it.isMust) continue
    if (it.doneAt || it.archivedAt) continue
    const proximity = getDueProximity(it.dueDate, today)
    if (!RISK_KINDS.has(proximity.kind)) continue
    if (proximity.diffDays !== undefined && proximity.diffDays > withinDays) continue
    enriched.push({ item: it, proximity, urgency: computeUrgency(it, toDate(today)) })
  }
  enriched.sort((a, b) => {
    const ra = SEVERITY_RANK[a.proximity.kind]
    const rb = SEVERITY_RANK[b.proximity.kind]
    if (ra !== rb) return rb - ra
    return b.urgency - a.urgency
  })
  return enriched
}

/**
 * AI prompt 用 1 行サマリ: `MUST at-risk 3: [期限切れ] resume 提出 (p1) / [今日] 連絡 (p2) / [明日] レポート (p1)`。
 * 0 件の場合は `'MUST at-risk 0 (該当なし)'`。
 * `title` 欠落時は `'(無題)'` で fallback。
 */
export function formatAtRiskMustSummary<T extends MustRiskFields>(
  entries: readonly MustRiskEntry<T>[],
): string {
  if (entries.length === 0) return 'MUST at-risk 0 (該当なし)'
  const parts = entries.map((e) => {
    const title = e.item.title ?? '(無題)'
    const priority = e.item.priority ?? 4
    return `[${e.proximity.label}] ${title} (p${priority})`
  })
  return `MUST at-risk ${entries.length}: ${parts.join(' / ')}`
}

function toDate(input: Date | string): Date {
  if (input instanceof Date) return input
  // ISO 'YYYY-MM-DD' を local midnight として解釈 (urgency.ts と同じ慣例)
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date()
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
