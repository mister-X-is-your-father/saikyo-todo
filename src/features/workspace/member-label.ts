/**
 * iter666 refactor: workspace member の displayName ラベル fallback helper。
 *
 * `assignee-picker.tsx` / `comment-thread.tsx` の 2 callsite で
 * `members?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6)`
 * の inline 重複を解消。displayName が null/未取得な場合の short-id fallback (頭 6 文字)
 * を 1 source of truth に固定。
 *
 * 構造的部分型: `{ userId: string; displayName: string | null }` を持つ任意の row
 * を受け付ける (= `WorkspaceMemberRow` を server-only 経由で取り回さなくても client
 * component で直接呼べる)。
 */

export interface MemberLabelRow {
  userId: string
  displayName: string | null
}

export function memberLabel(
  members: readonly MemberLabelRow[] | null | undefined,
  userId: string,
): string {
  return members?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 6)
}
