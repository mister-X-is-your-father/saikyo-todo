import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { itemIoArtifacts, itemStakeholders } from '@/lib/db/schema'

export const ItemIoArtifactSelectSchema = createSelectSchema(itemIoArtifacts)
export type ItemIoArtifact = z.infer<typeof ItemIoArtifactSelectSchema>

export const ItemStakeholderSelectSchema = createSelectSchema(itemStakeholders)
export type ItemStakeholder = z.infer<typeof ItemStakeholderSelectSchema>

// iter1138: goal.max(2000) / label.min(1)/max(200) / filePath.max(500) / mime.max(120) /
// description.max(2000) には ja message 無く zod default 英語が露出 (refine 系は ja message あり)。
// iter1086/1092/1126-1137 ja convention で全 max ja 化。
// ----- items.goal -----
export const SetItemGoalInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  goal: z.string().max(2000, 'ゴールは 2,000 文字以内で入力してください').nullable(),
})
export type SetItemGoalInput = z.infer<typeof SetItemGoalInputSchema>

// ----- I/O artifacts -----
export const ArtifactKindSchema = z.enum(['input', 'output'])
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>

export const AddItemIoArtifactInputSchema = z
  .object({
    itemId: z.string().uuid(),
    kind: ArtifactKindSchema,
    label: z
      .string()
      .min(1, 'ラベルを入力してください')
      .max(200, 'ラベルは 200 文字以内で入力してください'),
    url: z.string().url().nullish(),
    filePath: z.string().max(500, 'ファイルパスは 500 文字以内で入力してください').nullish(),
    mime: z.string().max(120, 'MIME 型は 120 文字以内で入力してください').nullish(),
    description: z.string().max(2000, '説明は 2,000 文字以内で入力してください').nullish(),
  })
  .superRefine((v, ctx) => {
    if (!v.label.trim()) {
      ctx.addIssue({ code: 'custom', path: ['label'], message: 'label を入力してください' })
    }
  })
export type AddItemIoArtifactInput = z.infer<typeof AddItemIoArtifactInputSchema>

export const RemoveItemIoArtifactInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type RemoveItemIoArtifactInput = z.infer<typeof RemoveItemIoArtifactInputSchema>

// ----- stakeholders -----
export const AddItemStakeholderInputSchema = z.object({
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
})
export type AddItemStakeholderInput = z.infer<typeof AddItemStakeholderInputSchema>

export const RemoveItemStakeholderInputSchema = z.object({
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
})
export type RemoveItemStakeholderInput = z.infer<typeof RemoveItemStakeholderInputSchema>
