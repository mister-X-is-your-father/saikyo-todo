/**
 * queue: AP-2 substrate — notification.* part 群 (read 系特化)。
 *
 * 既存 notificationService を thin wrap する形で part 化:
 *   - notification.list (workspace 内の自分宛通知一覧、unreadOnly / limit filter)
 *
 * 設計メモ:
 *   - notificationService.list は requireWorkspaceMember(viewer) を内部で呼ぶ +
 *     Result<Notification[]> を返す
 *   - workspaceId は ctx 経由 (input に直接含めない、AP-1 規約)
 *   - read scope (= AP-5 / AP-6 で read scope key で許可可能)
 *   - AC-5「AI 同僚 persona」 で AI が「自分 (viewer user) 宛の未読通知を確認して
 *     対応必要なものを提案」 経路の substrate
 *   - notify.send は service-side trigger (mention / heartbeat / invite 等内部 hook
 *     生成限定) のため AP-2 で write part は提供しない (= 設計上、AI が直接
 *     notification を作成できない安全側に倒す)
 */
import 'server-only'

import { z } from 'zod'

import { NotificationSelectSchema } from '@/features/notification/schema'
import { notificationService } from '@/features/notification/service'

import { definePart, unwrapPartResult } from '../types'

// iter1159: limit.min(1).max(200) に ja message 無く zod default 英語が露出。
const NotificationListInput = z.object({
  unreadOnly: z.boolean().optional(),
  limit: z
    .number()
    .int()
    .min(1, '取得件数は 1 以上で指定してください')
    .max(200, '取得件数は 200 件以下で指定してください')
    .optional(),
})

export const notificationListPart = definePart({
  id: 'notification.list',
  label: '自分宛通知一覧を取得',
  description:
    'workspace 内の viewer user 宛通知一覧 (unreadOnly / limit filter optional、default 新しい順 50 件) を返す。副作用なし、read scope。',
  category: 'notify',
  sideEffect: 'read',
  input: NotificationListInput,
  output: z.array(NotificationSelectSchema),
  run: async (input, ctx) => {
    const r = await notificationService.list(ctx.workspaceId, {
      ...(input.unreadOnly !== undefined ? { unreadOnly: input.unreadOnly } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    })
    return unwrapPartResult('notification.list', r)
  },
})
