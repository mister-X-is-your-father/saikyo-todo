'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { NotificationPreference } from '@/lib/db/schema'
import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { NotificationPreferenceUpdate } from './repository'
import type { Notification } from './schema'
import { notificationService, type ResolvedNotificationPreference } from './service'

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

export async function getNotificationPreferencesAction(): Promise<
  Result<ResolvedNotificationPreference>
> {
  return await actionWrap(() => notificationService.getPreferences())
}

export async function updateNotificationPreferencesAction(
  patch: NotificationPreferenceUpdate,
): Promise<Result<NotificationPreference>> {
  return await actionWrap(() => notificationService.updatePreferences(patch))
}
