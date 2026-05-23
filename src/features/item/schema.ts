import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { items } from '@/lib/db/schema'

import { violatesMustDodInvariant } from './must-dod'

export const ItemSelectSchema = createSelectSchema(items)
export type Item = z.infer<typeof ItemSelectSchema>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIME = /^\d{2}:\d{2}(:\d{2})?$/
// iter1156: ISO_DATE / ISO_TIME regex に ja message 無く zod default 英語が露出。
// 各 callsite で個別 message を渡す代わりに、共通 message 定数で統一。
const ISO_DATE_MSG = 'YYYY-MM-DD 形式で入力してください'
const ISO_TIME_MSG = 'HH:MM 形式で入力してください'

// iter1129: title.max(500) には ja message が無く zod default 英語が露出 (min(1) は ja message
// あり)。iter1086/1092/1126-1128 ja convention で max 制約も日本語化。Update.patch も同統一。
export const CreateItemInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z
      .string()
      .min(1, 'タイトルを入力してください')
      .max(500, 'タイトルは 500 文字以内で入力してください'),
    description: z.string().default(''),
    status: z.string().min(1, 'ステータスを指定してください').default('todo'),
    parentItemId: z.string().uuid().nullish(),
    startDate: z.string().regex(ISO_DATE, ISO_DATE_MSG).nullish(),
    dueDate: z.string().regex(ISO_DATE, ISO_DATE_MSG).nullish(),
    dueTime: z.string().regex(ISO_TIME, ISO_TIME_MSG).nullish(),
    scheduledFor: z.string().regex(ISO_DATE, ISO_DATE_MSG).nullish(),
    priority: z.number().int().min(1).max(4).default(4),
    isMust: z.boolean().default(false),
    dod: z.string().nullish(),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((v, ctx) => {
    // iter1155 refactor: 旧 inline `isMust && (!dod || dod.trim().length === 0)` を
    // `violatesMustDodInvariant` helper (item/must-dod.ts) に集約 (iter255 で抽出した helper を
    // schema 側に逆 import)。
    if (violatesMustDodInvariant(v)) {
      ctx.addIssue({ code: 'custom', path: ['dod'], message: 'MUST には DoD が必要です' })
    }
    if (v.startDate && v.dueDate && v.startDate > v.dueDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: '期限は開始日以降にしてください' })
    }
  })
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>

export const UpdateItemInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z
        .string()
        .min(1, 'タイトルを入力してください')
        .max(500, 'タイトルは 500 文字以内で入力してください')
        .optional(),
      description: z.string().optional(),
      status: z.string().min(1, 'ステータスを指定してください').optional(),
      startDate: z.string().regex(ISO_DATE, ISO_DATE_MSG).nullish(),
      dueDate: z.string().regex(ISO_DATE, ISO_DATE_MSG).nullish(),
      dueTime: z.string().regex(ISO_TIME, ISO_TIME_MSG).nullish(),
      scheduledFor: z.string().regex(ISO_DATE, ISO_DATE_MSG).nullish(),
      priority: z.number().int().min(1).max(4).optional(),
      isMust: z.boolean().optional(),
      dod: z.string().nullish(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: '更新する項目がありません',
    }),
})
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>

export const UpdateStatusInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: z.string().min(1, 'ステータスを指定してください'),
  position: z.string().optional(), // fractional indexing 文字列
})
export type UpdateStatusInput = z.infer<typeof UpdateStatusInputSchema>

export const SoftDeleteItemInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type SoftDeleteItemInput = z.infer<typeof SoftDeleteItemInputSchema>

export const MoveItemInputSchema = z.object({
  id: z.string().uuid(),
  // null で root に移動
  newParentItemId: z.string().uuid().nullable(),
})
export type MoveItemInput = z.infer<typeof MoveItemInputSchema>

/**
 * siblings 間の並び替え。対象を prev と next の間に差し込む。
 * 両方 null なら単独 item (意味なし、ValidationError)。片方 null は端挿入。
 */
export const ReorderItemInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  prevSiblingId: z.string().uuid().nullable(),
  nextSiblingId: z.string().uuid().nullable(),
})
export type ReorderItemInput = z.infer<typeof ReorderItemInputSchema>

/**
 * 連絡待ちモード WT-1 (queue: 連絡待ち WT-1)
 * GTD Waiting For を時間軸 + 通知 channel で独立管理する jsonb state。
 * 詳細: ~/.claude/plans/saikyo-waiting-mode-plan.md §2.1
 */
// iter1142: WaitingForState の max/min に ja message 付与 (iter1086/1092/1126-1141 sweep)。
export const WaitingForStateSchema = z
  .object({
    kind: z.enum(['internal', 'external']),
    targetUserId: z.string().uuid().nullish(),
    targetContactId: z.string().uuid().nullish(),
    targetLabel: z
      .string()
      .min(1, '連絡先ラベルを入力してください')
      .max(200, '連絡先ラベルは 200 文字以内で入力してください'),
    requestedAt: z.string().datetime(),
    reminderCadenceDays: z
      .number()
      .int()
      .min(1, 'リマインダー間隔は 1 日以上で指定してください')
      .max(365, 'リマインダー間隔は 365 日以内で指定してください')
      .nullish(),
    lastRemindedAt: z.string().datetime().nullish(),
    slackChannelId: z.string().max(64, 'Slack channel ID は 64 文字以内').nullish(),
    note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'internal' && !v.targetUserId) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetUserId'],
        message: 'internal の場合 targetUserId が必要',
      })
    }
    if (v.kind === 'external' && !v.targetContactId) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetContactId'],
        message: 'external の場合 targetContactId が必要',
      })
    }
  })
export type WaitingForState = z.infer<typeof WaitingForStateSchema>

export const SetWaitingForInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  state: WaitingForStateSchema,
})
export type SetWaitingForInput = z.infer<typeof SetWaitingForInputSchema>

export const ClearWaitingForInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type ClearWaitingForInput = z.infer<typeof ClearWaitingForInputSchema>
