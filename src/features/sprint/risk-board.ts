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
 * iter952 ai-automation: assignee 別 severity 分布の集計。
 *
 * sprint planning chip / dashboard summary で「高負荷 2人 / 繁忙 1人 / 通常 3人 / 余裕 0人」
 * を出すための pure helper。`assigneeLoadSeverity` を各 assignee に適用して 4 軸 counts を作る。
 *
 * 用途:
 *   - sprint risk-board widget の team summary chip
 *   - AI Slack 通知での「team 全体は X 状態」 1 行
 *   - Pre-mortem prompt の前提 context (heavy 担当の数で warning 出すかの判定)
 *
 * 担当無し (assigneeLoad.size === 0) → 全 0 のレコードを返す (UI 側で「未割当」分岐を判別可)。
 *
 * `extractHeavyAssignees` (id 配列) と並ぶ、severity 別の数量集計版。
 */
export interface AssigneeLoadSeverityCounts {
  overloaded: number
  busy: number
  normal: number
  light: number
}

export function countAssigneesBySeverity<T extends RiskBoardItemFields>(
  summary: SprintRiskBoardSummary<T>,
): AssigneeLoadSeverityCounts {
  const counts: AssigneeLoadSeverityCounts = { overloaded: 0, busy: 0, normal: 0, light: 0 }
  for (const load of summary.assigneeLoad.values()) {
    counts[assigneeLoadSeverity(load)] += 1
  }
  return counts
}

/**
 * iter952 ai-automation: severity counts を chip 文言に整形。
 *   '高負荷 2人 / 繁忙 1人 / 通常 3人 / 余裕 0人'   (全担当)
 *   '高負荷 2人 / 繁忙 1人 / 通常 3人'              (余裕 0 は省略)
 *   '余裕 5人'                                       (全員 light)
 *   '担当なし'                                       (assigneeLoad 空)
 *
 * 0 人の severity は省略 (= 視覚 noise 削減)、全 0 (= 担当無し) は「担当なし」一語、
 * 全員同一 severity の場合も「X N人」 1 軸表示。
 */
export function formatAssigneeLoadSeverityCountsJa(counts: AssigneeLoadSeverityCounts): string {
  const total = counts.overloaded + counts.busy + counts.normal + counts.light
  if (total === 0) return '担当なし'
  const parts: string[] = []
  if (counts.overloaded > 0) parts.push(`${SEVERITY_LABEL_JA.overloaded} ${counts.overloaded}人`)
  if (counts.busy > 0) parts.push(`${SEVERITY_LABEL_JA.busy} ${counts.busy}人`)
  if (counts.normal > 0) parts.push(`${SEVERITY_LABEL_JA.normal} ${counts.normal}人`)
  if (counts.light > 0) parts.push(`${SEVERITY_LABEL_JA.light} ${counts.light}人`)
  return parts.join(' / ')
}

/**
 * iter959 ai-automation: 最もリスクが高い 1 item を抽出 (= summary.topRisk[0] の null-safe wrapper)。
 *
 * sprint planning で「最初に確認する 1 件」 chip / Pre-mortem prompt の「最重 1 item」 context 用。
 * pickMostLoadedAssignee と並ぶ「単一 最重 抽出」 pattern の item 軸版。
 *
 * 仕様:
 *   - summary.all は score 降順 sort 済 (buildSprintRiskBoard 時点)、本 helper は topRisk[0] を返す
 *   - 空 items / 全 score 0 (= 安全 sprint) → null sentinel (= caller は alert 非表示判断)
 *   - topRisk[0] が score 0 なら null 扱い (= 「リスクある item は無し」 → 表示しない)
 *
 * 既存 helper との関係:
 *   - `formatSprintRiskBoardJa`: top 2 を `/` で連結 (= 詳細 chip 文言)
 *   - `summary.topRisk`: top N 配列 (= widget の table)
 *   - 本 helper: 単一 最重 item (= 1 chip alert / Slack 1 行)
 */
export function pickRiskiestItem<T extends RiskBoardItemFields>(
  summary: SprintRiskBoardSummary<T>,
): RiskBoardEntry<T> | null {
  const top = summary.topRisk[0]
  if (!top || top.riskScore === 0) return null
  return top
}

/**
 * iter958 basics: 最も負荷の高い 1 assignee を抽出。
 *
 * sprint planning で「最初に救済する 1 人」を決めるための pure helper。
 * extractHeavyAssignees (配列、threshold 別) と並ぶ単一抽出版。
 *
 * 仕様:
 *   - 比較指標: assigneeLoad.totalScore (= 負荷の重み付き合計、score 加重)
 *   - tie-break: id 昇順 (deterministic、UI 表示で安定)
 *   - 空 assigneeLoad (担当無し) → null
 *   - 全員 totalScore=0 (= light) でも 1 人返す (= caller が threshold 判定したい場合は
 *     assigneeLoadSeverity(load) で別途検査)
 *
 * 用途:
 *   - SprintRiskBoardWidget の「最初に救済する人」chip (= 「@user1 (高負荷)」)
 *   - AI Pre-mortem prompt の context 「最重 1 人は X、reassign 候補」
 *   - Slack 通知「@user1 が高負荷、relief 要検討」
 */
export interface RiskBoardMostLoadedAssignee {
  id: string
  load: RiskBoardAssigneeLoad
  severity: AssigneeLoadSeverity
}

export function pickMostLoadedAssignee<T extends RiskBoardItemFields>(
  summary: SprintRiskBoardSummary<T>,
): RiskBoardMostLoadedAssignee | null {
  let best: { id: string; load: RiskBoardAssigneeLoad } | null = null
  for (const [id, load] of summary.assigneeLoad) {
    if (best === null) {
      best = { id, load }
      continue
    }
    if (load.totalScore > best.load.totalScore) {
      best = { id, load }
    } else if (load.totalScore === best.load.totalScore && id < best.id) {
      best = { id, load }
    }
  }
  if (best === null) return null
  return { id: best.id, load: best.load, severity: assigneeLoadSeverity(best.load) }
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

/**
 * iter962 ai-automation: 「最重 item + 最重担当」を 1 行に統合した alert summary。
 *
 * iter958 pickMostLoadedAssignee + iter959 pickRiskiestItem の出力を合成して、
 * Slack 通知 / AI Pre-mortem prompt / dashboard top alert chip 用の 1 行 ja-JP に整形。
 *
 * 出力例:
 *   - '最重 item: 期限超過 12 日 score 60 / 最重担当: u1abc12... (高負荷)'  (両方あり)
 *   - '最重 item: 期限超過 12 日 score 60'  (担当無し / 全員 light)
 *   - '最重担当: u1abc12... (高負荷)'        (リスク item 無し)
 *   - '安全 sprint (リスク item / 担当負荷なし)'  (どちらも null)
 *
 * `formatSprintRiskBoardJa` (top 2 reason 連結) と並ぶ高 level summary、本 helper は
 * 「単一 alert」 で「最初に見せる 1 行」 を担当 (= 詳細 chip は widget の table 側で展開)。
 *
 * assigneeNames option: id → 表示名 マップ (未指定 / 該当無し → id の先頭 8 文字 + '...')。
 */
export function formatSprintRiskBoardAlertJa<T extends RiskBoardItemFields>(
  summary: SprintRiskBoardSummary<T>,
  assigneeNames?: Record<string, string>,
): string {
  const riskiest = pickRiskiestItem(summary)
  const mostLoaded = pickMostLoadedAssignee(summary)
  const parts: string[] = []
  if (riskiest !== null) {
    const head = riskiest.reasons[0] ?? '(reason 不明)'
    parts.push(`最重 item: ${head} score ${riskiest.riskScore}`)
  }
  if (mostLoaded !== null && mostLoaded.severity !== 'light') {
    const name = assigneeNames?.[mostLoaded.id] ?? `${mostLoaded.id.slice(0, 8)}...`
    const sevLabel = SEVERITY_LABEL_JA[mostLoaded.severity]
    parts.push(`最重担当: ${name} (${sevLabel})`)
  }
  if (parts.length === 0) return '安全 sprint (リスク item / 担当負荷なし)'
  return parts.join(' / ')
}

// 内部 helper を test しやすく named export
export { computeRiskScore, dayDiffISO }
