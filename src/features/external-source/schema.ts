import { z } from 'zod'

import { externalSources } from '@/lib/db/schema'

export type ExternalSource = typeof externalSources.$inferSelect

/**
 * Phase 6.15 iter120: 取込元 kind 別 config の zod スキーマ。
 * 詳細フィールドは pull worker (次 iter) で必要に応じて拡張する。
 */
export const YamoryConfigSchema = z.object({
  token: z.string().min(1),
  projectIds: z.array(z.string()).optional(),
})

export const CustomRestConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string(), z.string()).optional(),
  /** items を取り出す JSONPath (簡略: dot path)。例: "data.items" */
  itemsPath: z.string().optional(),
  /** 各 item の id field (例: "id" / "uuid") */
  idPath: z.string().min(1),
  /** title field */
  titlePath: z.string().min(1),
  /** ISO 日付 field (任意) */
  duePath: z.string().optional(),
})

export const CreateSourceInputSchema = z.discriminatedUnion('kind', [
  z.object({
    workspaceId: z.string().uuid(),
    name: z.string().min(1).max(200),
    kind: z.literal('yamory'),
    config: YamoryConfigSchema,
    scheduleCron: z.string().min(1).max(100).nullable().default(null),
  }),
  z.object({
    workspaceId: z.string().uuid(),
    name: z.string().min(1).max(200),
    kind: z.literal('custom-rest'),
    config: CustomRestConfigSchema,
    scheduleCron: z.string().min(1).max(100).nullable().default(null),
  }),
])
export type CreateSourceInput = z.infer<typeof CreateSourceInputSchema>

export const UpdateSourceInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      name: z.string().min(1).max(200).optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      enabled: z.boolean().optional(),
      scheduleCron: z.string().min(1).max(100).nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch is empty' }),
})
export type UpdateSourceInput = z.infer<typeof UpdateSourceInputSchema>
