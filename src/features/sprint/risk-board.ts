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

/**
 * iter527 ai-automation (queue: fluffy-2 risk-board polish): assignee 1 人当たりの load を
 * 4 段 severity に分類する pure helper。SeverityChip の tone bind に使える共通分類軸。
 *
 * 閾値 (totalScore = 担当 item 群の risk score 累積):
 *  - 'overloaded' >= 100  (= 高 risk MUST × 複数 / blocked 多発、即 escalation)
 *  - 'busy'       >= 50   (= 通常+α、注意)
 *  - 'normal'     >= 20   (= 健全)
 *  - 'light'      <  20   (= 余裕、引き受け候補)
 *
 * itemCount だけでは「ぜんぶ low risk な小タスク N 件」と「高 risk MUST 1 件」が同 weight
 * になるので totalScore (= 重み付き合計) を主指標にする。0 件 → 'light' (= 受け入れ余裕)。
 */
export type AssigneeLoadSeverity = 'overloaded' | 'busy' | 'normal' | 'light'

export function assigneeLoadSeverity(load: RiskBoardAssigneeLoad): AssigneeLoadSeverity {
  if (load.itemCount === 0) return 'light'
  if (load.totalScore >= 100) return 'overloaded'
  if (load.totalScore >= 50) return 'busy'
  if (load.totalScore >= 20) return 'normal'
  return 'light'
}

const SEVERITY_LABEL_JA: Record<AssigneeLoadSeverity, string> = {
  overloaded: '高負荷',
  busy: '繁忙',
  normal: '通常',
  light: '余裕',
}

/**
 * AI prompt / chip aria-label / SR 用 1 行サマリ:
 *   '高負荷 (item 5 件 / MUST 2 件 / 累積 score 120)'
 *   '余裕 (item 0 件)' (= 担当無し履歴)
 */
export function formatAssigneeLoadJa(load: RiskBoardAssigneeLoad): string {
  const sev = assigneeLoadSeverity(load)
  const label = SEVERITY_LABEL_JA[sev]
  if (load.itemCount === 0) return `${label} (item 0 件)`
  return `${label} (item ${load.itemCount} 件 / MUST ${load.mustCount} 件 / 累積 score ${load.totalScore})`
}

/**
 * iter552 ai-automation (queue: heavyAssignees 自動算出 — risk-board → recovery-plan bridge):
 * sprint risk board の `assigneeLoad` から「重い担当」 = recovery-plan の reassign 候補から
 * 外す側のリストを抽出する pure helper。
 *
 * 既存資産の橋渡しのみ:
 *   - input  : SprintRiskBoardSummary.assigneeLoad (Map<assigneeId, RiskBoardAssigneeLoad>)
 *   - output : assignee id 配列 (重い順、tie は id 昇順で安定)
 *   - bridge : `buildRecoveryPlan(item, { today, heavyAssignees: extractHeavyAssignees(summary) })`
 *
 * 閾値 default は 'busy' (= overloaded + busy を heavy 判定)。'overloaded' のみで絞りたい
 * caller (= MUST severe escalation) は明示指定。'normal' / 'light' は heavy 扱いしない
 * (recovery-plan の reassign 候補 = 「他の余裕ある人」 が居なくなる)。
 *
 * 出力順は totalScore 降順 → tie は id 昇順 (deterministic、UI で chip 並べる時に安定)。
 *
 * AI 不使用、副作用無し、既存 helper のみ依存。
 */
const SEVERITY_RANK: Record<AssigneeLoadSeverity, number> = {
  overloaded: 3,
  busy: 2,
  normal: 1,
  light: 0,
}

export function extractHeavyAssignees<T extends RiskBoardItemFields>(
  summary: SprintRiskBoardSummary<T>,
  threshold: AssigneeLoadSeverity = 'busy',
): string[] {
  const minRank = SEVERITY_RANK[threshold]
  const matched: { id: string; load: RiskBoardAssigneeLoad }[] = []
  for (const [id, load] of summary.assigneeLoad) {
    if (SEVERITY_RANK[assigneeLoadSeverity(load)] >= minRank) {
      matched.push({ id, load })
    }
  }
  matched.sort((a, b) => {
    if (a.load.totalScore !== b.load.totalScore) return b.load.totalScore - a.load.totalScore
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  return matched.map((m) => m.id)
}

/**
 * AI prompt / dashboard chip 用 sprint 全体の board サマリ 1 行:
 *   'リスクあり 5 件 (top: 期限超過 12 日 score 60 / 今日が期限 score 50)'
 *   '安全 (リスク item なし)' (= 全 score 0)
 *
 * 上位 entry 2 件を「reason 先頭 + score」で並べる (詳細は widget 側で展開)。
 */
export function formatSprintRiskBoardJa<T extends RiskBoardItemFields>(
  summary: SprintRiskBoardSummary<T>,
): string {
  const risky = summary.all.filter((e) => e.riskScore > 0)
  if (risky.length === 0) return '安全 (リスク item なし)'
  const top = summary.topRisk.slice(0, 2)
  const tops = top
    .map((e) => {
      const head = e.reasons[0] ?? '(reason 不明)'
      return `${head} score ${e.riskScore}`
    })
    .join(' / ')
  return `リスクあり ${risky.length} 件 (top: ${tops})`
}

// 内部 helper を test しやすく named export
export { computeRiskScore, dayDiffISO }
