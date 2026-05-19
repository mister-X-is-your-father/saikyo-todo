/**
 * iter (queue AC-2 substrate): 「AI に review してもらう」 1 click の action 検証 pure 関数。
 *
 * AC-2 UI button が押されたとき、item の状態から review request が valid か判定する。
 * `planHandoffToAi` (AC-1) と対称の pattern — pure 関数で deterministic 判定、UI は描画と invoke のみ。
 *
 * 判定 result kinds:
 *   - 'ready':            review request 可能 (= AI が item を読んで checklist + 改善案 1-3 件 を comment)
 *   - 'blocked-empty':    item の dod / plan / output が全て空 → review する素材が無い
 *   - 'blocked-done':     item が完了済 → 再 review 不要 (= comment 履歴で過去 review 確認)
 *   - 'duplicate':        既に pending な review request が存在 (重複防止)
 *
 * 詳細: FEEDBACK_QUEUE.md 「AI との分業/協業 シリーズ」 AC-2
 */

export type ReviewRequestStatus = 'ready' | 'blocked-empty' | 'blocked-done' | 'duplicate'

export interface ReviewRequestInput {
  status: string
  dod: string | null
  description: string
  /** comment thread に 「🤖 実行計画 (案)」 marker (PLAN_COMMENT_MARKER) が含まれるか */
  hasPlan: boolean
  /** 既に pending な AI review request が存在するか (重複防止 gate) */
  hasPendingReview: boolean
}

export interface ReviewRequestPlan {
  status: ReviewRequestStatus
  /** UI button label / toast に使う 1 行 message */
  message: string
  /** 実行可能 = button を active にする */
  actionable: boolean
}

const MIN_REVIEWABLE_LEN = 10

export function planAiReviewRequest(input: ReviewRequestInput): ReviewRequestPlan {
  if (input.status === 'done') {
    return {
      status: 'blocked-done',
      message: '完了済 task は再 review 不要 (過去 review は comment で確認)',
      actionable: false,
    }
  }

  if (input.hasPendingReview) {
    return {
      status: 'duplicate',
      message: '既に pending な AI review があります (comment tab で確認)',
      actionable: false,
    }
  }

  // review 素材があるか: dod, description, plan のいずれかが意味のある長さで存在
  const dodLen = (input.dod ?? '').trim().length
  const descLen = (input.description ?? '').trim().length
  const hasReviewableContent =
    dodLen >= MIN_REVIEWABLE_LEN || descLen >= MIN_REVIEWABLE_LEN || input.hasPlan

  if (!hasReviewableContent) {
    return {
      status: 'blocked-empty',
      message: 'review する素材がありません (dod / description / plan を先に書く)',
      actionable: false,
    }
  }

  // 何を review するか reason を組立
  const subjects: string[] = []
  if (input.hasPlan) subjects.push('Plan')
  if (dodLen >= MIN_REVIEWABLE_LEN) subjects.push('DoD')
  if (descLen >= MIN_REVIEWABLE_LEN) subjects.push('説明')
  return {
    status: 'ready',
    message: `${subjects.join(' + ')} を AI が review します`,
    actionable: true,
  }
}
