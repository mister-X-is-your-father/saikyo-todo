/**
 * Email 通知の orchestrator。
 *
 * 各 feature service (heartbeat / comment / workspace / time-entry) から呼ばれる
 * "in-app 通知発行と同時に email を投函するか?" の判定 + 投函を 1 関数に集約する。
 *
 * - pref 取得: notification_preferences (1 行 / user)。行が無ければ default (heartbeat/mention/invite=ON, sync-failure=OFF)
 * - to_email: auth.users.email を service_role で引く
 * - dispatch 失敗は best-effort: catch して console.error。呼び出し元 (in-app 通知の親 Tx) は
 *   既に commit 済の前提
 *
 * 将来 dispatcher.ts を Resend / SMTP に切り替える時、本ファイルは無修正で済むようにする。
 */
import 'server-only'

import { eq, sql } from 'drizzle-orm'

import { notificationPreferences } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { env } from '@/env'

import { type HeartbeatEmailProps, renderHeartbeatEmail } from './templates/heartbeat'
import { type InviteEmailProps, renderInviteEmail } from './templates/invite'
import { type MentionEmailProps, renderMentionEmail } from './templates/mention'
import { renderSyncFailureEmail, type SyncFailureEmailProps } from './templates/sync-failure'
import { dispatchEmail, type EmailType } from './dispatcher'

/** 各 type の pref デフォルト (行が存在しないユーザに対して適用) */
const DEFAULT_PREFS: Record<EmailType, boolean> = {
  heartbeat: true,
  mention: true,
  invite: true,
  'sync-failure': false,
  // workflow node 経由のメールは個人 pref で gate せず常に送る (送信元が明示制御するため)
  workflow: true,
}

async function isEmailEnabled(userId: string, type: EmailType): Promise<boolean> {
  const [row] = await adminDb
    .select({
      heartbeat: notificationPreferences.emailForHeartbeat,
      mention: notificationPreferences.emailForMention,
      invite: notificationPreferences.emailForInvite,
      syncFailure: notificationPreferences.emailForSyncFailure,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1)
  if (!row) return DEFAULT_PREFS[type]
  switch (type) {
    case 'heartbeat':
      return row.heartbeat
    case 'mention':
      return row.mention
    case 'invite':
      return row.invite
    case 'sync-failure':
      return row.syncFailure
    case 'workflow':
      // workflow 経由は pref で gate しない (送信元 = workflow author の責任)
      return true
  }
}

/**
 * 通知メール内 deep link の絶対 URL を組み立てる。
 *
 * - workspaceId + itemId → /<wsId>?item=<itemId> (Item dialog deep link)
 * - workspaceId のみ      → /<wsId>
 * - どちらも無し          → /
 *
 * APP_BASE_URL は env で設定 (defaults to 'http://localhost:3001')。末尾 / は除去する。
 */
export function buildAppHref(
  opts: { workspaceId?: string | null; itemId?: string | null } = {},
): string {
  const base = env.APP_BASE_URL.replace(/\/+$/, '')
  if (opts.workspaceId && opts.itemId) {
    return `${base}/${opts.workspaceId}?item=${encodeURIComponent(opts.itemId)}`
  }
  if (opts.workspaceId) return `${base}/${opts.workspaceId}`
  return base
}

async function getUserEmail(userId: string): Promise<string | null> {
  // auth.users は service_role で読める。Drizzle 側にも `authSchema` で参照宣言があるが
  // email 列は持っていないので、parametrized 生 SQL で引く
  const result = (await adminDb.execute(
    sql`select email from auth.users where id = ${userId} limit 1`,
  )) as unknown as Array<{ email: string | null }>
  const row = Array.isArray(result) ? result[0] : undefined
  return row?.email ?? null
}

interface NotifyArgs {
  userId: string
  workspaceId?: string | null
}

export async function notifyHeartbeatEmail(args: NotifyArgs & HeartbeatEmailProps): Promise<void> {
  try {
    if (!(await isEmailEnabled(args.userId, 'heartbeat'))) return
    const to = await getUserEmail(args.userId)
    if (!to) return
    const { subject, html, text } = await renderHeartbeatEmail({
      itemTitle: args.itemTitle,
      stage: args.stage,
      dueDate: args.dueDate,
      href: args.href,
    })
    await dispatchEmail({
      workspaceId: args.workspaceId ?? null,
      userId: args.userId,
      toEmail: to,
      type: 'heartbeat',
      subject,
      html,
      text,
    })
  } catch (e) {
    console.error('[email] heartbeat dispatch failed', e)
  }
}

export async function notifyMentionEmail(args: NotifyArgs & MentionEmailProps): Promise<void> {
  try {
    if (!(await isEmailEnabled(args.userId, 'mention'))) return
    const to = await getUserEmail(args.userId)
    if (!to) return
    const { subject, html, text } = await renderMentionEmail({
      mentionedBy: args.mentionedBy,
      commentBody: args.commentBody,
      itemTitle: args.itemTitle,
      href: args.href,
    })
    await dispatchEmail({
      workspaceId: args.workspaceId ?? null,
      userId: args.userId,
      toEmail: to,
      type: 'mention',
      subject,
      html,
      text,
    })
  } catch (e) {
    console.error('[email] mention dispatch failed', e)
  }
}

export async function notifyInviteEmail(args: NotifyArgs & InviteEmailProps): Promise<void> {
  try {
    if (!(await isEmailEnabled(args.userId, 'invite'))) return
    const to = await getUserEmail(args.userId)
    if (!to) return
    const { subject, html, text } = await renderInviteEmail({
      workspaceName: args.workspaceName,
      invitedBy: args.invitedBy,
      role: args.role,
      href: args.href,
    })
    await dispatchEmail({
      workspaceId: args.workspaceId ?? null,
      userId: args.userId,
      toEmail: to,
      type: 'invite',
      subject,
      html,
      text,
    })
  } catch (e) {
    console.error('[email] invite dispatch failed', e)
  }
}

export async function notifySyncFailureEmail(
  args: NotifyArgs & SyncFailureEmailProps,
): Promise<void> {
  try {
    if (!(await isEmailEnabled(args.userId, 'sync-failure'))) return
    const to = await getUserEmail(args.userId)
    if (!to) return
    const { subject, html, text } = await renderSyncFailureEmail({
      source: args.source,
      reason: args.reason,
      entryId: args.entryId,
    })
    await dispatchEmail({
      workspaceId: args.workspaceId ?? null,
      userId: args.userId,
      toEmail: to,
      type: 'sync-failure',
      subject,
      html,
      text,
    })
  } catch (e) {
    console.error('[email] sync-failure dispatch failed', e)
  }
}
