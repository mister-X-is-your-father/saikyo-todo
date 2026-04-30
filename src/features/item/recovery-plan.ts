/**
 * iter528 (queue fluffy-5 recovery→widget substrate): MUST 救済プラン の
 * pure data substrate。
 *
 * fluffy 撲滅原則 (FEEDBACK_QUEUE.md META):
 *   - AI に「遅延要因 / 代替案 / 代替担当」 文章 (一般論 fluffy) を書かせない
 *   - item の実 data (依存先 / 期限超過 日数 / 担当人数 / priority / estimate)
 *     から具体的 action 3 選 を deterministic に出す
 *   - widget は本 helper の output を直接 render するだけ (fluffy 文章不要)
 *
 * 対象: overdue MUST item のみ (= 「これ落としたらヤバい」の救済)。
 * isApplicable=false なら actions=[] (= 救済不要 = MUST でない or 期限内)。
 *
 * Action 候補 (heuristic 優先順、上位 3 つを返す):
 *   - unblock:    blockedByIds.length > 0 → 依存先解消
 *   - reassign:   担当 1 人 + heavyAssignees.includes(その人) → 別担当に振替
 *   - split:      priority ≤ 2 + estimateMinutes ≥ 60 → 細分化 (60 min 以上の重い item)
 *   - reschedule: 期限超過 日数 ≥ 1 → 期限再設定 + 計画 commit
 *   - escalate:   上記いずれにも該当しなければ最終手段
 *
 * AI 不使用、副作用無し、依存無し。pure helper + Vitest 単体 test で網羅。
 */

export interface RecoveryPlanItemFields {
  id: string
  title: string
  status: string | null | undefined
  dueDate?: string | null | undefined
  isMust?: boolean | null | undefined
  priority?: number | null | undefined
  /** 本 item を blocking している items の id (= blocked-by)。空配列なら依存無し */
  blockedByIds?: readonly string[] | null | undefined
  /** 見積分。null なら estimate 無し */
  estimateMinutes?: number | null | undefined
  /** 担当 user id。空配列なら未割当 */
  assigneeIds?: readonly string[] | null | undefined
}

export type RecoveryActionKind = 'unblock' | 'reassign' | 'split' | 'reschedule' | 'escalate'

export interface RecoveryAction {
  /** 1 (最優先) – 3 */
  rank: number
  kind: RecoveryActionKind
  /** UI 表示用の短い title */
  title: string
  /** 1 行 reason、なぜこの action を勧めるかの根拠 (data 由来) */
  rationale: string
}

export interface RecoveryPlan {
  itemId: string
  /** 救済対象 = overdue MUST のみ true。false なら actions=[] (救済不要) */
  isApplicable: boolean
  /** 推奨 action 上位 3 つ (rank=1..3、空 = 救済不要) */
  actions: RecoveryAction[]
}

export interface RecoveryPlanOptions {
  /** ISO YYYY-MM-DD。default は実行時 today (caller が必ず渡すこと推奨) */
  today: string
  /** 「負荷が高い担当」のリスト (= reassign 候補から外す側、別 helper で計算)。default 空 */
  heavyAssignees?: readonly string[]
}

function dayDiffISO(a: string, b: string): number {
  const ad = Date.parse(`${a}T00:00:00Z`)
  const bd = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(ad) || !Number.isFinite(bd)) return Number.NaN
  return Math.round((bd - ad) / (24 * 60 * 60 * 1000))
}

export function buildRecoveryPlan(
  item: RecoveryPlanItemFields,
  options: RecoveryPlanOptions,
): RecoveryPlan {
  // 救済対象判定: MUST + dueDate < today + status が done/cancelled でない
  const isMust = item.isMust === true
  const overdueDays = item.dueDate ? -dayDiffISO(options.today, item.dueDate) : -1
  const isActive = item.status !== 'done' && item.status !== 'cancelled'
  const isApplicable = isMust && isActive && overdueDays >= 1 && Number.isFinite(overdueDays)

  if (!isApplicable) {
    return { itemId: item.id, isApplicable: false, actions: [] }
  }

  const candidates: RecoveryAction[] = []

  // unblock: 依存先解消
  const blockedBy = item.blockedByIds ?? []
  if (blockedBy.length > 0) {
    candidates.push({
      rank: 0,
      kind: 'unblock',
      title: `依存先 ${blockedBy.length} 件を先に片付ける`,
      rationale: `この item は ${blockedBy.length} 件に blocked。依存解消で動き出す可能性`,
    })
  }

  // reassign: 1 人担当 + その人が重い
  const assignees = item.assigneeIds ?? []
  const heavy = options.heavyAssignees ?? []
  if (assignees.length === 1 && assignees[0] !== undefined && heavy.includes(assignees[0])) {
    candidates.push({
      rank: 0,
      kind: 'reassign',
      title: '担当を再分配する (現 担当が高負荷)',
      rationale: '担当 1 人で他 item も多数抱える状態、別 member へ振替が現実的',
    })
  }

  // split: priority 高 + estimate 60min 以上
  const priority = typeof item.priority === 'number' ? item.priority : 4
  const estMin = typeof item.estimateMinutes === 'number' ? item.estimateMinutes : 0
  if (priority <= 2 && estMin >= 60) {
    candidates.push({
      rank: 0,
      kind: 'split',
      title: 'subtask に細分化する',
      rationale: `priority ${priority} で見積 ${estMin} 分。chunk が大きすぎて止まりがち、30 分単位 task に分解`,
    })
  }

  // reschedule: 期限超過 +1d 以上
  if (overdueDays >= 1) {
    candidates.push({
      rank: 0,
      kind: 'reschedule',
      title: `期限を再設定する (${overdueDays} 日超過)`,
      rationale: '計画 commit を 1 度クリアして「いつ終わらせるか」を再宣言、緊急感を取り戻す',
    })
  }

  // 上位 3 つに削る
  const top = candidates.slice(0, 3)
  if (top.length === 0) {
    // 該当 action なしの場合は escalate を最終手段で 1 つ返す
    top.push({
      rank: 1,
      kind: 'escalate',
      title: '上位者にエスカレーション',
      rationale: '救済 action が自動推論不能、状況を上位者に共有して判断を仰ぐ',
    })
  } else {
    // rank を 1..3 に振り直し
    top.forEach((a, i) => {
      a.rank = i + 1
    })
  }

  return { itemId: item.id, isApplicable: true, actions: top }
}

/**
 * iter529 ai-automation (queue: fluffy-5 recovery polish): RecoveryActionKind ごとに
 * 短い Japanese label を返す pure helper。chip / aria-label / Slack 通知で再利用。
 */
const ACTION_KIND_LABEL_JA: Record<RecoveryActionKind, string> = {
  unblock: '依存先解消',
  reassign: '担当再分配',
  split: '細分化',
  reschedule: '期限再設定',
  escalate: 'エスカレーション',
}

export function recoveryActionKindLabelJa(kind: RecoveryActionKind): string {
  return ACTION_KIND_LABEL_JA[kind]
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 recovery summary:
 *  '救済不要'                                    (= isApplicable=false)
 *  '救済 action 3 選: 依存先解消 / 担当再分配 / 期限再設定'
 *  '救済 action 1 件: エスカレーション'           (= 該当無しで escalate のみ)
 *
 * caller は本文字列をそのまま chip に埋められる。詳細は plan.actions を直接読む。
 */
export function formatRecoveryPlanJa(plan: RecoveryPlan): string {
  if (!plan.isApplicable) return '救済不要'
  if (plan.actions.length === 0) return '救済 action 候補なし'
  const labels = plan.actions.map((a) => recoveryActionKindLabelJa(a.kind))
  if (labels.length === 1) return `救済 action 1 件: ${labels[0]}`
  return `救済 action ${labels.length} 選: ${labels.join(' / ')}`
}

export { dayDiffISO }
