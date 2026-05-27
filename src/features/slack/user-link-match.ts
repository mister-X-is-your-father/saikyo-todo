/**
 * iter1426 (queue Slack ワンポチ / 連絡待ち Slack 連携 substrate): Slack user と workspace
 * member を email で auto-link する候補を算出する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md Slack ワンポチ「初回は email match で auto link」 / WT-6):
 *   - slack_user_links を初期構築する際、Slack user の email と workspace member の email を
 *     突き合わせて自動リンク候補を出す (= 手動マッピングの手間削減)。
 *   - email 突合のみ (大小無視 + trim)、両者に email があり一致する時だけ候補化。
 *
 * AI 不使用・副作用無し。pure helper + Vitest 単体で網羅。
 */
export interface SlackUserLike {
  slackUserId: string
  email?: string | null
}

export interface WorkspaceMemberLike {
  userId: string
  email?: string | null
}

export interface SlackUserLinkSuggestion {
  slackUserId: string
  userId: string
  /** 突合に使った email (正規化前の member 側) */
  matchedEmail: string
}

function normEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function matchSlackUsersByEmail(
  slackUsers: readonly SlackUserLike[],
  members: readonly WorkspaceMemberLike[],
): SlackUserLinkSuggestion[] {
  // email(正規化) → member。重複 email は先勝ち。
  const byEmail = new Map<string, WorkspaceMemberLike>()
  for (const m of members) {
    const key = normEmail(m.email)
    if (key === '') continue
    if (!byEmail.has(key)) byEmail.set(key, m)
  }

  const suggestions: SlackUserLinkSuggestion[] = []
  const seenSlack = new Set<string>()
  for (const su of slackUsers) {
    if (seenSlack.has(su.slackUserId)) continue
    const key = normEmail(su.email)
    if (key === '') continue
    const member = byEmail.get(key)
    if (!member) continue
    seenSlack.add(su.slackUserId)
    suggestions.push({
      slackUserId: su.slackUserId,
      userId: member.userId,
      matchedEmail: (member.email ?? '').trim(),
    })
  }
  return suggestions
}
