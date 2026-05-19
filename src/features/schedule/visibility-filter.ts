/**
 * iter (queue schedule public/private substrate): schedule slot の visibility filter pure 関数。
 *
 * Calendar slot に 「公開 (workspace 全体に見える) / プライベート (本人のみ)」 を持たせる feature
 * の data 軸。ユーザ要望:
 *   - 学習 / 前倒し / バッファ 時間を 「上司や他メンバーから見えない形で」 ブロックしたい
 *   - 結果的に成果に繋がる
 *
 * 設計判断:
 *   - schedule に `visibility` 列 (`'workspace' | 'private'`、default `'workspace'`) を持たせる
 *   - RLS でも SELECT を gate するが、UI 側で 「他人の private を一切表示しない」 のは確実に
 *     pure 判定 (= 二重防御 + offline 時の cache filter)
 *   - private を作った本人 (`createdBy = currentUserId`) には常に見える
 *
 * 詳細: FEEDBACK_QUEUE.md schedule public/private entry
 */

export type ScheduleVisibility = 'workspace' | 'private'

export interface ScheduleVisibilityCheckable {
  visibility: ScheduleVisibility
  /** schedule を作った user id (= 本人だけ private を見られる) */
  createdBy: string
}

/**
 * 1 件の schedule が `viewerId` から見えるか判定。
 * - workspace: 全員見える
 * - private:   作った本人 (createdBy === viewerId) だけ見える
 */
export function isScheduleVisibleTo(
  schedule: ScheduleVisibilityCheckable,
  viewerId: string,
): boolean {
  if (schedule.visibility === 'workspace') return true
  return schedule.createdBy === viewerId
}

/**
 * schedule 配列を `viewerId` 視点で filter (= 見えるものだけ返す)。
 * Calendar view が「他人の private を視界に入れない」 ために消費。
 */
export function filterSchedulesForViewer<T extends ScheduleVisibilityCheckable>(
  schedules: readonly T[],
  viewerId: string,
): T[] {
  return schedules.filter((s) => isScheduleVisibleTo(s, viewerId))
}

/**
 * private schedule の件数 (= 自分視点で「裏で進めてる」 件数)。
 * Dashboard chip 「裏ブロック N 件」 用。
 */
export function countOwnPrivateSchedules(
  schedules: readonly ScheduleVisibilityCheckable[],
  viewerId: string,
): number {
  return schedules.filter((s) => s.visibility === 'private' && s.createdBy === viewerId).length
}
