import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { itemIoArtifacts, itemStakeholders } from '@/lib/db/schema'

export const ItemIoArtifactSelectSchema = createSelectSchema(itemIoArtifacts)
export type ItemIoArtifact = z.infer<typeof ItemIoArtifactSelectSchema>

export const ItemStakeholderSelectSchema = createSelectSchema(itemStakeholders)
export type ItemStakeholder = z.infer<typeof ItemStakeholderSelectSchema>

// ----- items.goal -----
export const SetItemGoalInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  goal: z.string().max(2000).nullable(),
})
export type SetItemGoalInput = z.infer<typeof SetItemGoalInputSchema>

// ----- I/O artifacts -----
export const ArtifactKindSchema = z.enum(['input', 'output'])
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>

export const AddItemIoArtifactInputSchema = z
  .object({
    itemId: z.string().uuid(),
    kind: ArtifactKindSchema,
    label: z.string().min(1).max(200),
    url: z.string().url().nullish(),
    filePath: z.string().max(500).nullish(),
    mime: z.string().max(120).nullish(),
    description: z.string().max(2000).nullish(),
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
