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
import type { AssigneeRef } from './repository'

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
