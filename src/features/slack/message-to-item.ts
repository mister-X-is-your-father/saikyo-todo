/**
 * iter1425 (queue Slack ワンポチでタスク化 substrate): Slack message を saikyo-todo item の
 * 下書き (title / description) に変換する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md Slack ワンポチでタスク化):
 *   - Slack の Message Action から item を作る際、message 本文を title + 引用付き description に
 *     整形する。「message link は description に自動引用」 (ユーザ要望)。
 *   - signature-verify.ts (webhook 検証) / dispatcher.ts (送信) とは別軸の入力変換層。
 *
 * AI 不使用・副作用無し。pure helper + Vitest 単体で網羅。
 */
export interface SlackMessageInput {
  /** message 本文 */
  text: string
  /** message permalink (任意) */
  permalink?: string | null
  /** channel 名 (任意、# は付けない生の名前) */
  channelName?: string | null
  /** 投稿者表示名 (任意) */
  userName?: string | null
}

export interface SlackItemDraft {
  title: string
  description: string
}

const TITLE_MAX = 80

function firstNonEmptyLine(text: string): string {
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t !== '') return t
  }
  return ''
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

export function buildItemFromSlackMessage(input: SlackMessageInput): SlackItemDraft {
  const text = (input.text ?? '').trim()
  const head = firstNonEmptyLine(text)
  const title = head === '' ? 'Slack メッセージ' : truncate(head, TITLE_MAX)

  // 本文を markdown 引用化
  const quote =
    text === ''
      ? '> (本文なし)'
      : text
          .split('\n')
          .map((l) => (l === '' ? '>' : `> ${l}`))
          .join('\n')

  const footer: string[] = []
  const permalink = (input.permalink ?? '').trim()
  if (permalink) footer.push(`元メッセージ: ${permalink}`)

  const srcParts: string[] = []
  const channel = (input.channelName ?? '').trim()
  const user = (input.userName ?? '').trim()
  if (channel) srcParts.push(`#${channel}`)
  if (user) srcParts.push(user)
  if (srcParts.length > 0) footer.push(`投稿: ${srcParts.join(' / ')}`)

  const description = footer.length > 0 ? `${quote}\n\n${footer.join('\n')}` : quote
  return { title, description }
}
