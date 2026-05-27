/**
 * iter1423 (queue タスク metadata 拡張 substrate): 人によるレビュー依頼 (item_review_requests)
 * の status 集約 pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md タスク metadata 拡張「レビュー依頼できる機能」):
 *   - item に対する review request (status pending / approved / changes_requested) を集約し、
 *     「未解決のレビューがあるか」「全部承認済みか」 を deterministic に判定する。
 *   - ai-review-request.ts (AC-2 = AI が checklist を返す) とは別軸: 本 helper は **人間の
 *     レビュー依頼 lifecycle** の状態集約 (chip / 完了ゲート用)。
 *
 * AI 不使用・副作用無し。pure helper + Vitest 単体で網羅。
 */
export type ReviewRequestStatus = 'pending' | 'approved' | 'changes_requested'

export interface ReviewRequestRow {
  status: ReviewRequestStatus
}

export interface ReviewRequestSummary {
  total: number
  pending: number
  approved: number
  changesRequested: number
  /** pending か changes_requested が 1 件でもある = 未解決 */
  hasOpen: boolean
  /** total>0 かつ全件 approved */
  allApproved: boolean
}

export function summarizeReviewRequests(rows: readonly ReviewRequestRow[]): ReviewRequestSummary {
  let pending = 0
  let approved = 0
  let changesRequested = 0
  for (const r of rows) {
    if (r.status === 'pending') pending += 1
    else if (r.status === 'approved') approved += 1
    else changesRequested += 1
  }
  const total = rows.length
  return {
    total,
    pending,
    approved,
    changesRequested,
    hasOpen: pending > 0 || changesRequested > 0,
    allApproved: total > 0 && approved === total,
  }
}

/**
 * 完了ゲート / chip tone:
 *   - 'danger' : changes_requested >= 1 (= 要修正、最優先)
 *   - 'warn'   : pending >= 1 (= 承認待ち)
 *   - 'ok'     : 全件 approved
 *   - 'idle'   : レビュー依頼なし
 */
export function reviewRequestTone(
  summary: ReviewRequestSummary,
): 'ok' | 'warn' | 'danger' | 'idle' {
  if (summary.total === 0) return 'idle'
  if (summary.changesRequested > 0) return 'danger'
  if (summary.pending > 0) return 'warn'
  return 'ok'
}

/**
 * chip / Slack / aria-label 用 1 行。
 *   'レビュー: 承認 2 / 要修正 1 / 待ち 0'
 *   '全レビュー承認済 (3)'
 *   'レビュー依頼なし'
 */
export function formatReviewRequestSummaryJa(summary: ReviewRequestSummary): string {
  if (summary.total === 0) return 'レビュー依頼なし'
  if (summary.allApproved) return `全レビュー承認済 (${summary.approved})`
  return `レビュー: 承認 ${summary.approved} / 要修正 ${summary.changesRequested} / 待ち ${summary.pending}`
}
