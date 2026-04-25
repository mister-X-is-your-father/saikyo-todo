import { createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

import { notifications } from '@/lib/db/schema'

export const NotificationSelectSchema = createSelectSchema(notifications)
export type Notification = z.infer<typeof NotificationSelectSchema>

/**
 * 通知 type 別の payload 形 (現状は heartbeat のみ。将来 mention / invite を追加)。
 * payload は jsonb なので Service 層では unknown 扱いし、UI で type 分岐する。
 */
export interface HeartbeatPayload {
  itemId: string
  stage: '7d' | '3d' | '1d' | 'overdue'
  dueDate: string
  daysUntilDue: number
}
