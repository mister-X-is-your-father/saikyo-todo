/**
 * AI assignee 判定 pure helpers。
 *
 * FEEDBACK_QUEUE.md P0 「AI 自動実行モード (assignee=AI + plan + Slack)」 scope A
 * の substrate。Item に紐付いた assignee 配列から AI agent を識別 / 抽出 / 件数集計
 * する関数群。Item.assignees は既に `(actor_type, actor_id)` の 2-tuple で
 * `actor_type='agent'` を許容しているため schema 拡張は不要 (iter506 確認)。
 *
 * 用途:
 *   - UI: ItemEditDialog / KanbanCard で「AI assigned」 badge を出すか判断
 *   - Service: 自動実行 trigger 候補の filter (assignee に AI が居る Item のみ)
 *   - 通知: Slack escalation の対象 Item を絞る
 *
 * pure 関数のみ (DB / I/O 無し) — vitest で単体検証可能。
 */
import type { AgentRole } from '@/features/agent/schema'

import type { AssigneeRef } from './repository'

/**
 * agentRepository.listByWorkspace の返り値が必要な field だけを取り出した
 * 軽量 shape (test では生のオブジェクトリテラルで mock しやすい)。
 * 完全な Agent 型は server-only な drizzle 派生で client 不可なので、ここでは
 * 構造的部分型で受ける。
 */
export interface AgentLikeForAssignee {
  id: string
  role: string
  displayName?: string | null
}

/** AssigneeRef が AI agent (actor_type='agent') を指しているか。 */
export function isAiAssignee(ref: AssigneeRef): boolean {
  return ref.actorType === 'agent'
}

/** AI assignee のみ抽出。順序は input を保持。 */
export function extractAiAssignees(refs: readonly AssigneeRef[]): AssigneeRef[] {
  return refs.filter(isAiAssignee)
}

/** human user assignee のみ抽出。順序は input を保持。 */
export function extractUserAssignees(refs: readonly AssigneeRef[]): AssigneeRef[] {
  return refs.filter((r) => r.actorType === 'user')
}

/** AI agent が 1 つ以上含まれているか。空配列なら false。 */
export function hasAiAssignee(refs: readonly AssigneeRef[]): boolean {
  return refs.some(isAiAssignee)
}

/** 全員 AI (= 人間 user 不在) かつ 1 件以上ある場合 true。空配列は false。 */
export function isFullyAiAssigned(refs: readonly AssigneeRef[]): boolean {
  return refs.length > 0 && refs.every(isAiAssignee)
}

/** AI agent と人間 user が混在する mixed assignment か。 */
export function isMixedAssignment(refs: readonly AssigneeRef[]): boolean {
  return refs.some(isAiAssignee) && refs.some((r) => r.actorType === 'user')
}

export interface AssigneeKindCounts {
  ai: number
  user: number
  total: number
}

/** AI / user / 合計の 3 値で件数を返す。other actorType (将来追加) は無視 (将来 strict 化時は別 helper)。 */
export function countAssigneesByKind(refs: readonly AssigneeRef[]): AssigneeKindCounts {
  let ai = 0
  let user = 0
  for (const r of refs) {
    if (r.actorType === 'agent') ai += 1
    else if (r.actorType === 'user') user += 1
  }
  return { ai, user, total: refs.length }
}

/**
 * agents 行を AssigneeRef[] に map (actor_type='agent' / actor_id=agent.id)。
 * AssigneePicker で AI 選択肢を render する時、value 内の AI assignee と
 * 比較するために使う。
 */
export function agentsToAssigneeRefs(agents: readonly AgentLikeForAssignee[]): AssigneeRef[] {
  return agents.map((a) => ({ actorType: 'agent', actorId: a.id }))
}

const AGENT_ROLE_LABEL_JA: Record<AgentRole, string> = {
  pm: 'PM',
  researcher: 'リサーチャー',
  engineer: 'エンジニア',
  reviewer: 'レビューワー',
}

/**
 * Agent.role の表示用日本語ラベル。AssigneePicker の選択肢 / KanbanCard の
 * 「AI 担当」 chip 等で使う。未知の role は "AI" + role 文字列で fallback
 * (将来 role enum 拡張時にも壊れない)。
 */
export function formatAgentRoleLabelJa(role: string): string {
  if (role in AGENT_ROLE_LABEL_JA) {
    return `AI ${AGENT_ROLE_LABEL_JA[role as AgentRole]}`
  }
  return `AI ${role}`
}

/** 2 つの AssigneeRef が同一 actor を指すか (actor_type + actor_id 両方一致)。 */
export function assigneeRefEquals(a: AssigneeRef, b: AssigneeRef): boolean {
  return a.actorType === b.actorType && a.actorId === b.actorId
}

/**
 * AssigneeRef[] に ref が含まれていたら除き、無ければ末尾に追加する toggle。
 * AssigneePicker の click ハンドラで使用 (user / agent どちらの kind でも同じ logic)。
 * input は readonly、新しい配列を返す (immutable パターン)。
 */
export function toggleAssigneeRef(refs: readonly AssigneeRef[], ref: AssigneeRef): AssigneeRef[] {
  const idx = refs.findIndex((r) => assigneeRefEquals(r, ref))
  if (idx >= 0) {
    return [...refs.slice(0, idx), ...refs.slice(idx + 1)]
  }
  return [...refs, ref]
}

/**
 * Item が「Plan を生成」 button を出すべき状態かを判定。
 * - status='done' は完了済なので Plan 不要
 * - assignees に AI が居ないなら gate (AI 担当 Item のみ)
 * UI button の disabled / 表示有無に使う。
 */
export function canGeneratePlan(params: {
  status: string
  assignees: readonly AssigneeRef[]
}): boolean {
  if (params.status === 'done') return false
  return hasAiAssignee(params.assignees)
}
