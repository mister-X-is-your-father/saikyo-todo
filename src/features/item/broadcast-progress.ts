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
 * broadcast task かどうかの判定 (= assignee が 2 名以上、または task が 'broadcast' marker を持つ)。
 * 後日 marker 経路 (`items.custom_fields.broadcast=true`) を追加する想定で、本 helper は assignee
 * count で gate するシンプル版。
 */
export function isBroadcastCandidate(assignees: readonly AssigneeRef[]): boolean {
  return assignees.length >= 2
}

/**
 * iter1369 (queue: 全員 broadcast 依頼): まだ done になっていない assignee (= 未対応者) を返す。
 *
 * broadcast P0 の本丸は「誰がやった / やってないが一目で分かる」 (作業漏れ防止)。
 * summarizeBroadcastProgress は件数 (N/M) を出すが「誰が残っているか」 の primitive が無かった。
 * 本 helper は rows の元順序を保ったまま done=false の ref だけ抽出し、UI の laggard 強調 /
 * リマインド nudge / brief「未: A, B」 の base にする (ref → 表示名解決は呼び出し側が担当)。
 *
 * fullyDone (全員完了) なら空配列、未着手だらけなら全 assignee が返る。
 */
export function pickBroadcastLaggards(summary: BroadcastProgressSummary): AssigneeRef[] {
  return summary.rows.filter((r) => !r.done).map((r) => r.ref)
}
