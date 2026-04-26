/**
 * Email dispatcher (Phase 6.6 — Mock 実装)。
 *
 * 現状: `mock_email_outbox` に INSERT するだけ。実 SMTP / Resend は呼ばない。
 *
 * 将来 Resend / SMTP に差し替えるときは本ファイルの `dispatchEmail` 内部だけを置換する:
 *   - `await resend.emails.send({ from, to: email.toEmail, subject, html, text })`
 *   - 失敗時は ExternalServiceError を throw、上位で best-effort 扱い
 *   - 送信ログとして mock_email_outbox を残してもよい (監査目的なら推奨)
 *
 * I/F (`EmailToSend`) を変えなければ、呼び出し側 (heartbeat / comment / workspace / time-entry) は
 * 修正不要で済む。
 */
import 'server-only'

import { mockEmailOutbox } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

export type EmailType = 'heartbeat' | 'mention' | 'invite' | 'sync-failure'

export interface EmailToSend {
  /** workspace 単位のスレッド絞込み用。null 可 (system 全体メールなら省略) */
  workspaceId?: string | null
  /** 受信ユーザ id (auth.users.id)。null 可 (将来 newsletter 等で外部宛に送る場合) */
  userId?: string | null
  /** 受信先 email (auth.users.email から引いてきたもの) */
  toEmail: string
  type: EmailType
  subject: string
  html: string
  text: string
}

export interface DispatchResult {
  /** mock_email_outbox.id (実 SMTP/Resend 移行後は provider message id に置換) */
  id: string
}

export async function dispatchEmail(email: EmailToSend): Promise<DispatchResult> {
  // 実 SMTP/Resend に切り替えるときは ↓ ブロックだけ replace。
  const [row] = await adminDb
    .insert(mockEmailOutbox)
    .values({
      workspaceId: email.workspaceId ?? null,
      userId: email.userId ?? null,
      toEmail: email.toEmail,
      type: email.type,
      subject: email.subject,
      htmlBody: email.html,
      textBody: email.text,
      dispatchedAt: new Date(), // mock では送信成功扱い
    })
    .returning({ id: mockEmailOutbox.id })
  if (!row) throw new Error('dispatchEmail: insert returned no row')
  return { id: row.id }
}
