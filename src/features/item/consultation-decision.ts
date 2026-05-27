/**
 * iter1421 (queue 相談特化 substrate): 相談 item の「これに決めた」 決定記録を
 * description 追記用 markdown に整形する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 相談特化機能):
 *   - consultation-tally.ts は投票集計 + 状態判定を担う。本 helper は requester が
 *     「これに決めた」 で確定した時の **決定記録 markdown** を組み立てる。
 *   - service が item.description 末尾に本 block を追記 + status を close する想定。
 *   - 決定内容 / 理由 / 決定者 / 日付 を構造化して残す = 後で「なぜそう決めたか」 を辿れる。
 *
 * AI 不使用・副作用無し。pure helper + Vitest 単体で網羅。
 */
import { formatUtcISO, parseDateOrNull } from '@/lib/date/iso'

export interface ConsultationDecisionInput {
  /** 採用した選択肢の label */
  chosenOptionLabel: string
  /** 決定理由 (任意) */
  reason?: string | null
  /** 決定者の表示名 (任意) */
  decidedBy?: string | null
  /** 決定日時 (Date or ISO) */
  decidedAt: Date | string
}

export function buildConsultationDecisionRecord(input: ConsultationDecisionInput): string {
  const date = parseDateOrNull(input.decidedAt)
  const dateStr = date ? formatUtcISO(date) : ''
  const heading = dateStr ? `## 決定 (${dateStr})` : '## 決定'

  const lines: string[] = ['---', heading, `- 選択: ${input.chosenOptionLabel.trim()}`]

  const reason = (input.reason ?? '').trim()
  if (reason) lines.push(`- 理由: ${reason}`)

  const decidedBy = (input.decidedBy ?? '').trim()
  if (decidedBy) lines.push(`- 決定者: ${decidedBy}`)

  return lines.join('\n')
}

/**
 * 既存 description に決定記録を追記した全文を返す。
 * description が空なら記録のみ、非空なら空行を挟んで連結。
 */
export function appendConsultationDecision(
  description: string | null | undefined,
  input: ConsultationDecisionInput,
): string {
  const record = buildConsultationDecisionRecord(input)
  const base = (description ?? '').trimEnd()
  return base === '' ? record : `${base}\n\n${record}`
}
