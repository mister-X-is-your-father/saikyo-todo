import { createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

import { notifications } from '@/lib/db/schema'

export const NotificationSelectSchema = createSelectSchema(notifications)
export type Notification = z.infer<typeof NotificationSelectSchema>

/**
 * 通知 type 別の payload 形。
 * payload は jsonb なので Service 層では unknown 扱いし、UI (notification-bell) で type 分岐する。
 *
 * type の対応関係:
 *   - 'heartbeat'    → HeartbeatPayload     (MUST item の期日接近 / 超過; heartbeatService が生成)
 *   - 'mention'      → MentionPayload       (Comment 本文中の @user 言及; commentService が生成)
 *   - 'invite'       → InvitePayload        (workspace への招待 / 追加; workspaceService が生成)
 *   - 'sync-failure' → SyncFailurePayload   (外部同期 worker の失敗; time-entry worker 等が生成)
 */
export interface HeartbeatPayload {
  itemId: string
  stage: '7d' | '3d' | '1d' | 'overdue'
  dueDate: string
  daysUntilDue: number
}

export interface MentionPayload {
  itemId: string
  commentId: string
  /** 言及した人の表示名 (auth.users.id ではなく、UI に出す名前そのもの) */
  mentionedBy: string
  /** comment 本文の先頭 200 文字程度を切り出して保存 (ベル popover でプレビュー用) */
  preview: string
}

export interface InvitePayload {
  workspaceId: string
  workspaceName: string
  /** 招待した人の表示名 */
  invitedBy: string
  /** 招待時の役割 ('owner' | 'admin' | 'member' | 'viewer' いずれか) */
  role: string
}

export interface SyncFailurePayload {
  /** 失敗源 (固定の代表値 + 自由文字列も許可) */
  source: 'time-entry' | 'mock-timesheet' | string
  /** 失敗理由 (Error.message を 2000 文字でクリップ済み想定) */
  reason: string
  /** 関連エンティティ ID (time-entry なら time_entries.id) */
  entryId?: string
}
