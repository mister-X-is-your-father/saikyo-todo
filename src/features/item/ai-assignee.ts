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
 * AssigneeKindCounts を日本語短文で要約。
 * - 0 件 → "未割当"
 * - AI のみ → "AI N 件"
 * - user のみ → "メンバー N 件"
 * - mixed → "AI A / メンバー U (合計 T 件)"
 *
 * KanbanCard の "AI 担当" chip / Item summary panel / Sprint swimlane lane summary
 * で使える共通フォーマット。formatAgentRoleLabelJa が role 単位の label に対し、
 * 本 helper は item 全体の assignee 分布の概要 label。
 */
export function formatAssigneeKindSummaryJa(counts: AssigneeKindCounts): string {
  if (counts.total === 0) return '未割当'
  if (counts.ai > 0 && counts.user === 0) return `AI ${counts.ai} 件`
  if (counts.user > 0 && counts.ai === 0) return `メンバー ${counts.user} 件`
  return `AI ${counts.ai} / メンバー ${counts.user} (合計 ${counts.total} 件)`
}

/**
 * iter547 ai-automation: items 群を「協業モード」で集計する pure helper。
 *
 * 1 item の AssigneeKindCounts (AI / user / total) から `CollaborationMode` を判定:
 *   'unassigned' — total=0 (= 未割当、漏れリスク)
 *   'ai-only'    — ai>0 && user=0 (= AI 専属、自律実行)
 *   'user-only'  — user>0 && ai=0 (= 人間専属、従来運用)
 *   'mixed'      — ai>0 && user>0 (= 協業、人間 ↔ AI ターン)
 *
 * dashboard / AI prompt が「workspace 内 item の協業 distribution」 を 1 行で出すための
 * 軸。fluffy 撲滅原則 (= AI に文章書かせない) で、collaboration の分布を直 chip で
 * 視認可能にする。
 */
export type CollaborationMode = 'unassigned' | 'ai-only' | 'user-only' | 'mixed'

export function classifyCollaborationMode(counts: AssigneeKindCounts): CollaborationMode {
  if (counts.total === 0) return 'unassigned'
  if (counts.ai > 0 && counts.user === 0) return 'ai-only'
  if (counts.user > 0 && counts.ai === 0) return 'user-only'
  return 'mixed'
}

const COLLAB_MODE_LABEL_JA: Record<CollaborationMode, string> = {
  unassigned: '未割当',
  'ai-only': 'AI 専属',
  'user-only': '人間専属',
  mixed: '協業',
}

export function collaborationModeLabelJa(mode: CollaborationMode): string {
  return COLLAB_MODE_LABEL_JA[mode]
}

/**
 * iter547 ai-automation: CollaborationMode → 共通 5 段 Severity bridge。
 * dashboard chip の tone bind 用。
 *
 *   'unassigned' → 'warn'  (= 未割当 = 漏れリスク、要対応)
 *   'ai-only'    → 'info'  (= AI 自律、進行中)
 *   'user-only'  → 'ok'    (= 人間運用、healthy default)
 *   'mixed'      → 'ok'    (= 協業、healthy default)
 *
 * unassigned は warn で「誰の責任か曖昧」 risk を可視化。
 */
const COLLAB_MODE_SEVERITY: Record<CollaborationMode, 'ok' | 'info' | 'warn' | 'danger' | 'muted'> =
  {
    unassigned: 'warn',
    'ai-only': 'info',
    'user-only': 'ok',
    mixed: 'ok',
  }

export function collaborationModeSeverity(
  mode: CollaborationMode,
): 'ok' | 'info' | 'warn' | 'danger' | 'muted' {
  return COLLAB_MODE_SEVERITY[mode]
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
