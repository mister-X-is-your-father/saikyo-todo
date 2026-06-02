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

import { dayDiffISO } from '@/lib/date/iso'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

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

// iter1029 refactor: 旧 local `dayDiffISO` (= risk-board.ts と完全同一) を
// `@/lib/date/iso#dayDiffISO` に集約。

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
 * iter545 ai-automation polish: RecoveryActionKind → SeverityChip tone bridge。
 * 「escalate」 が最深刻 (= 自動推論できなかった + 上位者判断必要)、unblock / reassign
 * は中程度、split / reschedule は軽め。chip 配色決定用。
 *
 * 'unblock'    → 'warn'   (= 依存解消、他 item の影響あり)
 * 'reassign'   → 'warn'   (= 担当移譲、コミュニケーション要)
 * 'split'      → 'info'   (= 細分化、自分で完結する)
 * 'reschedule' → 'info'   (= 期限調整、計画見直しのみ)
 * 'escalate'   → 'danger' (= 自動推論不能 + 上位者へ)
 */
const ACTION_KIND_SEVERITY: Record<RecoveryActionKind, Severity> = {
  unblock: 'warn',
  reassign: 'warn',
  split: 'info',
  reschedule: 'info',
  escalate: 'danger',
}

export function recoveryActionKindSeverity(kind: RecoveryActionKind): Severity {
  return ACTION_KIND_SEVERITY[kind]
}

/**
 * iter538 ai-automation: `Record<RecoveryActionKind, number>` (救済 action 種別 別件数)
 * を `Record<Severity, number>` (5 段 severity 別件数) に集約する pure helper。
 *
 * iter533-537 と同 pattern (= 6 ドメイン目)。caller は
 * `formatSeverityCountsJa(recoveryActionKindCountsToSeverityCounts(counts))` で
 * 「救済 action 全件 distribution」 を 1 行 severity サマリ として AI prompt /
 * Slack 通知 / dashboard summary に出せる。
 *
 * 各 kind は `ACTION_KIND_SEVERITY` (iter545) で集約:
 *   unblock / reassign → warn   (= 中程度、コミュニケーション要)
 *   split / reschedule → info   (= 軽度、自分で完結)
 *   escalate           → danger (= 最深刻、上位者判断必要)
 *
 * 集約後の合計件数は kind 合計と一致 (集約だけで増減しない)。recovery action は
 * ok / muted bucket には出ない (= 「救済不要」 は本 helper で扱わない、
 * formatRecoveryPlanJa の sentinel "救済不要" で別表現)。
 */
// iter1690 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1687-1689 (due-proximity / goal-health / bias) に続く外部 file 追従 5 件目。
// 振る舞い不変: ACTION_KIND_SEVERITY (unblock+reassign→warn lossy / split+reschedule→info lossy /
// escalate→danger) の domain mapping は本 file 責務、boilerplate (空 Record + 順序配列 +
// for-loop + ?? 0) を 1 行委譲に縮約。inline `RECOVERY_ACTION_KIND_ORDER` 配列も
// `aggregateCountsBySeverity` が `Object.keys` で走査するため不要に。
export function recoveryActionKindCountsToSeverityCounts(
  counts: Record<RecoveryActionKind, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, recoveryActionKindSeverity)
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

/**
 * iter489 ai-automation: 推奨 1 番目の救済 action を抽出 (= rank 1 = 最優先 candidate)。
 *
 * - isApplicable=false → null (= 救済不要)
 * - actions[0] が rank 1、buildRecoveryPlan の slice(0,3) で先頭に来る
 * - actions[] 空 → null (理論上 buildRecoveryPlan は最低 escalate 1 件返すが防御)
 *
 * 用途: chip 「次の一手: 依存先解消」、Slack escalation の最優先アクション提示、
 * AI 朝 brief の MUST 救済セクション 1 行目。
 */
export function pickTopRecoveryAction(plan: RecoveryPlan): RecoveryAction | null {
  if (!plan.isApplicable || plan.actions.length === 0) return null
  return plan.actions[0] ?? null
}

/**
 * iter489 ai-automation: pickTopRecoveryAction の出力を chip 文言に整形。
 *   '次の一手: 依存先解消'
 *   '次の一手: 担当再分配'
 *   '次の一手: なし' (= 救済不要)
 *
 * caller は本文字列を chip aria-label / Slack 通知 / AI brief 1 行目に直 埋め込み。
 */
export function formatTopRecoveryActionJa(action: RecoveryAction | null): string {
  if (action === null) return '次の一手: なし'
  return `次の一手: ${recoveryActionKindLabelJa(action.kind)}`
}

/**
 * iter1003 basics: RecoveryPlan の actions[] を `Record<RecoveryActionKind, number>`
 * に集約する pure helper。
 *
 * 既存 `recoveryActionKindCountsToSeverityCounts` (iter538) が「kind counts → severity counts」
 * を担当する一方、その input (= kind counts) を生成する helper が無く caller が inline で
 * `for (const a of plan.actions) counts[a.kind]++` を書く必要があった。本 helper で
 * canonical flow を完成:
 *
 *   const kindCounts = countRecoveryActionsByKind(plan)
 *   const sevCounts = recoveryActionKindCountsToSeverityCounts(kindCounts)
 *   formatSeverityCountsJa(sevCounts)
 *
 * 仕様:
 *   - 各 kind の件数 (= 救済 plan 内の出現回数、通常 max 1 件 / kind だが汎用形)
 *   - 全 kind を 0 で initialize (空欄無し、formatSeverityCountsJa が均一な分布を扱える)
 *   - isApplicable=false / actions=[] → 全 0
 *
 * 用途: dashboard 救済 chip 群、Slack daily digest「救済 action 分布」、AI 朝 brief。
 */
export function countRecoveryActionsByKind(
  plan: Pick<RecoveryPlan, 'actions'>,
): Record<RecoveryActionKind, number> {
  const counts: Record<RecoveryActionKind, number> = {
    unblock: 0,
    reassign: 0,
    split: 0,
    reschedule: 0,
    escalate: 0,
  }
  for (const a of plan.actions) {
    counts[a.kind] += 1
  }
  return counts
}
