/**
 * iter (queue broadcast substrate): 「全員に broadcast 依頼」 task の進捗 matrix 集計 pure 関数。
 *
 * 「全員にこの設定やっといて」 ユースケース: 1 task に複数 assignee + 各人の done state を持つ。
 * 既存 `item_assignees` (多 actor 受け持ち) は OK だが、「assignee 別 done」 を保存する場所が
 * 既存 schema に無い → 別 table `item_assignee_progress (item_id, actor_type, actor_id, done_at)`
 * が必要 (本 commit は pure 集計 helper のみ提供、schema は別 iter)。
 *
 * 詳細: FEEDBACK_QUEUE.md broadcast entry (方式 B 採用)
 */

import type { AssigneeRef } from './repository'

export interface AssigneeProgress {
  actorType: 'user' | 'agent'
  actorId: string
  doneAt: Date | null
}

export interface BroadcastProgressRow {
  ref: AssigneeRef
  done: boolean
  doneAt: Date | null
}

export interface BroadcastProgressSummary {
  rows: BroadcastProgressRow[]
  /** 全 assignee 数 (= rows.length) */
  total: number
  /** done 済 assignee 数 */
  doneCount: number
  /** done 比率 0..1 */
  ratio: number
  /** 全員完了か (= doneCount === total && total > 0) */
  fullyDone: boolean
  /** UI badge / chip 用 "N/M 完了" 表示 */
  label: string
}

/**
 * assignees + progress rows から「誰が done か」 matrix を返す。
 *
 * - assignees にあって progress に無い → done=false (= 未着手)
 * - progress にあって assignees に無い → 無視 (= assignee 解除後の残骸)
 * - 同じ ref の progress が重複してたら最新 doneAt を採用
 */
export function summarizeBroadcastProgress(
  assignees: readonly AssigneeRef[],
  progressRows: readonly AssigneeProgress[],
): BroadcastProgressSummary {
  // progress の dedupe map (最新 doneAt)
  const progressMap = new Map<string, Date | null>()
  for (const p of progressRows) {
    const key = `${p.actorType}:${p.actorId}`
    const existing = progressMap.get(key)
    if (existing === undefined || (p.doneAt && (!existing || p.doneAt > existing))) {
      progressMap.set(key, p.doneAt)
    }
  }

  const rows: BroadcastProgressRow[] = assignees.map((ref) => {
    const key = `${ref.actorType}:${ref.actorId}`
    const doneAt = progressMap.get(key) ?? null
    return { ref, done: doneAt !== null, doneAt }
  })

  const total = rows.length
  const doneCount = rows.filter((r) => r.done).length
  const ratio = total === 0 ? 0 : doneCount / total
  const fullyDone = total > 0 && doneCount === total

  return {
    rows,
    total,
    doneCount,
    ratio,
    fullyDone,
    label: `${doneCount}/${total} 完了`,
  }
}

/**
 * iter1337 basics: まだ done していない assignee の ref 一覧 (= 催促対象)。
 *
 * `summarizeBroadcastProgress` の rows から done=false のものを抽出 (assignee 表示順を保つ)。
 * broadcast task の「まだやってない人」 を 1 関数で取り、UI のリマインド button /
 * 「未: alice, bob」 表示に使う (= 漏れ防止: 全員完了まで誰が残ってるか能動可視)。
 * fullyDone (全員完了) / total=0 なら空配列。
 */
export function pendingBroadcastAssignees(summary: BroadcastProgressSummary): AssigneeRef[] {
  return summary.rows.filter((r) => !r.done).map((r) => r.ref)
}

/**
 * broadcast task かどうかの判定 (= assignee が 2 名以上、または task が 'broadcast' marker を持つ)。
 * 後日 marker 経路 (`items.custom_fields.broadcast=true`) を追加する想定で、本 helper は assignee
 * count で gate するシンプル版。
 */
export function isBroadcastCandidate(assignees: readonly AssigneeRef[]): boolean {
  return assignees.length >= 2
}
