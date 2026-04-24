import { z } from 'zod'

import { ItemSelectSchema } from '@/features/item/schema'

/**
 * MUST サマリ: 期限/WIP 警告 + MUST Item 一覧。
 * 一画面の Dashboard ヘッダに使う。
 */
export interface MustSummary {
  /** MUST item 一覧 (due_date asc nulls last、done type も含む現スナップショット) */
  items: z.infer<typeof ItemSelectSchema>[]
  /** workspace_settings.wip_limit_must (既定 5) */
  wipLimit: number
  /** 現在 in_progress type の MUST item 数 */
  wipInProgress: number
  /** wipInProgress > wipLimit */
  wipExceeded: boolean
  /** 未完了 (done type ではない) かつ due_date < today */
  overdueCount: number
  /** 未完了 かつ due_date in [today, today+7d] */
  dueSoonCount: number
}

export interface BurndownPoint {
  /** ISO date 'YYYY-MM-DD' (workspace tz ではなく UTC date で十分、UI 側で整形) */
  date: string
  /** その日時点で open な MUST item 数 (created ≤ d, done_at > d or null, deleted ≤ d でない) */
  open: number
  /** その日までに close された MUST item 数 (done_at ≤ d) */
  closed: number
}

export const GetBurndownInputSchema = z.object({
  workspaceId: z.string().uuid(),
  days: z.number().int().positive().max(90).default(14),
})
export type GetBurndownInput = z.infer<typeof GetBurndownInputSchema>
