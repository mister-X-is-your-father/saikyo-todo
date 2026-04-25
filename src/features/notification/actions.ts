'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { Notification } from './schema'
import { notificationService } from './service'

export async function listNotificationsAction(
  workspaceId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Result<Notification[]>> {
  try {
    return await notificationService.list(workspaceId, options)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function unreadNotificationCountAction(workspaceId: string): Promise<Result<number>> {
  try {
    return await notificationService.unreadCount(workspaceId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<Result<Notification | null>> {
  return await actionWrap(() => notificationService.markRead(notificationId))
}

export async function markAllNotificationsReadAction(workspaceId: string): Promise<Result<number>> {
  return await actionWrap(() => notificationService.markAllRead(workspaceId))
}
