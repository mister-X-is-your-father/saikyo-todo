/**
 * iter524 (queue fluffy-2 premortem→widget substrate): Sprint リスクボード の
 * pure data substrate。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI に「失敗候補 / 原因 / 対策」 文章 (一般論 fluffy) を書かせない
 *   - dueProximity / isMust / status='blocked' / blockingCount / priority から
 *     deterministic な risk score を計算、top N の score 根拠 + 1 行理由を返す
 *   - widget は本 helper の output を直接 render するだけ (fluffy 文章不要)
 *
 * Risk score = sum of:
 *   - dueProximity:  overdue → 30, dueDate=today → 25, ≤3d → 18, ≤7d → 8, none/未来 → 0
 *   - isMust:        +15
 *   - blockedStatus: +25 (status='blocked')
 *   - priority:      (4 - priority) * 4 (1→12, 4→0、priority=1 が最高)
 *   - blockingCount: blockingCount * 5 (= 他 item を blocking している数)
 *
 * assigneeLoad: assigneeId -> { itemCount, mustCount, totalScore } (= 「人当たりの負荷」)
 *
 * AI 不使用、副作用無し、依存無し (date 比較は ISO string 同士で). pure helper +
 * Vitest 単体 test で網羅。
 *
 * 既存資産との関係:
 *   - `today/operation-board.ts` の `eisenhowerScore` と概念は近いが、本 helper は
 *     **sprint 全体での失敗リスク** を可視化、operation-board は **今日 1 日の推奨**
 *     を出すので scope が異なる (片方は sprint planning、片方は daily standup)。
 */

export interface RiskBoardItemFields {
  id: string
  title: string
  status: string | null | undefined
  dueDate?: string | null | undefined
  /** 1=最高、4=最低 (既存 priority 仕様)。null なら 4 として扱う */
  priority?: number | null | undefined
  isMust?: boolean | null | undefined
  /** 本 item が他 item を blocking している数 (= 後続 item から見た blocked-by 数の逆)。
   *  caller が item_dependencies から事前に計算して渡す。 */
  blockingCount?: number | null | undefined
  /** 担当 user id (= item_assignees の actor_id 抽出)。複数可、空配列なら未割当 */
  assigneeIds?: readonly string[] | null | undefined
}

export interface RiskBoardEntry<T extends RiskBoardItemFields> {
  item: T
  riskScore: number
  /** 1 行 reason chip 用 (短く)、score の主因を 0-4 個 (空 = score 0 = 安全) */
  reasons: string[]
}

export interface RiskBoardAssigneeLoad {
  itemCount: number
  mustCount: number
  /** assignee 担当 item の score 累積 (人当たり負荷の単一指標) */
  totalScore: number
}

export interface SprintRiskBoardSummary<T extends RiskBoardItemFields> {
  /** 全 item の score 降順 sort 済 (UI で table 全表示する想定) */
  all: RiskBoardEntry<T>[]
  /** score 上位 N 件 (default 5) */
  topRisk: RiskBoardEntry<T>[]
  /** assignee id → load (担当無しは集計に含まれない) */
  assigneeLoad: Map<string, RiskBoardAssigneeLoad>
}

export interface SprintRiskBoardOptions {
  /** ISO YYYY-MM-DD。default は実行時 todayISO 相当 (本 helper は省略時 不正値扱いせず
   *  「dueProximity 未計算」だけ skip。caller が today を渡すこと推奨) */
  today?: string
  /** topRisk の件数 (default 5) */
  topN?: number
}

const DEFAULT_TOP_N = 5

function dayDiffISO(a: string, b: string): number {
  // a, b ともに ISO YYYY-MM-DD. b - a (日)。同日 → 0、a が後 → 負。
  const ad = Date.parse(`${a}T00:00:00Z`)
  const bd = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(ad) || !Number.isFinite(bd)) return Number.NaN
  return Math.round((bd - ad) / (24 * 60 * 60 * 1000))
}

function computeRiskScore<T extends RiskBoardItemFields>(
  it: T,
  today: string | undefined,
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // dueProximity
  if (it.dueDate && today) {
    const diff = dayDiffISO(today, it.dueDate)
    if (Number.isFinite(diff)) {
      if (diff < 0) {
        score += 30
        reasons.push(`期限超過 ${-diff} 日`)
      } else if (diff === 0) {
        score += 25
        reasons.push('今日が期限')
      } else if (diff <= 3) {
        score += 18
        reasons.push(`期限まで ${diff} 日`)
      } else if (diff <= 7) {
        score += 8
        reasons.push(`期限まで ${diff} 日`)
      }
    }
  }

  // MUST
  if (it.isMust) {
    score += 15
    reasons.push('MUST')
  }

  // blocked
  if (it.status === 'blocked') {
    score += 25
    reasons.push('blocked 状態')
  }

  // priority (1=最高)
  const p = typeof it.priority === 'number' ? it.priority : 4
  const pBoost = (4 - p) * 4
  if (pBoost > 0) {
    score += pBoost
    if (p <= 2) reasons.push(`priority ${p}`)
  }

  // blocking count
  const bc = typeof it.blockingCount === 'number' ? Math.max(0, it.blockingCount) : 0
  if (bc > 0) {
    score += bc * 5
    reasons.push(`${bc} 件を blocking`)
  }

  return { score, reasons }
}

export function buildSprintRiskBoard<T extends RiskBoardItemFields>(
  items: readonly T[],
  options: SprintRiskBoardOptions = {},
): SprintRiskBoardSummary<T> {
  const topN = options.topN ?? DEFAULT_TOP_N

  const all: RiskBoardEntry<T>[] = items.map((it) => {
    const { score, reasons } = computeRiskScore(it, options.today)
    return { item: it, riskScore: score, reasons }
  })
  // score 降順、tie は dueDate 早い順 (= より緊急)、さらに tie は id で安定 sort
  all.sort((a, b) => {
    if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore
    const ad = a.item.dueDate ?? '￿'
    const bd = b.item.dueDate ?? '￿'
    if (ad !== bd) return ad < bd ? -1 : 1
    return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0
  })

  const topRisk = all.slice(0, topN)

  const assigneeLoad = new Map<string, RiskBoardAssigneeLoad>()
  for (const entry of all) {
    const aids = entry.item.assigneeIds ?? []
    for (const aid of aids) {
      const cur = assigneeLoad.get(aid) ?? { itemCount: 0, mustCount: 0, totalScore: 0 }
      cur.itemCount += 1
      if (entry.item.isMust) cur.mustCount += 1
      cur.totalScore += entry.riskScore
      assigneeLoad.set(aid, cur)
    }
  }

  return { all, topRisk, assigneeLoad }
}

// 内部 helper を test しやすく named export
export { computeRiskScore, dayDiffISO }
