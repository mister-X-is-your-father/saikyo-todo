import { z } from 'zod'

import { externalImports, externalSources } from '@/lib/db/schema'

export type ExternalSource = typeof externalSources.$inferSelect
export type ExternalImport = typeof externalImports.$inferSelect

/**
 * Phase 6.15 iter120: 取込元 kind 別 config の zod スキーマ。
 * 詳細フィールドは pull worker (次 iter) で必要に応じて拡張する。
 */
export const YamoryConfigSchema = z.object({
  token: z.string().min(1),
  projectIds: z.array(z.string().min(1)).optional(),
  /** API base (default https://api.yamory.io)。社内 proxy / 検証環境向けに上書き可能 */
  baseUrl: z.string().url().optional(),
  /** {projectId} 置換テンプレート (default /v3/{projectId}/vulnerabilities) */
  endpointTemplate: z.string().min(1).optional(),
  /** response から item 配列を取り出す dot-path (default items) */
  itemsPath: z.string().min(1).optional(),
  /** id field (default id) */
  idPath: z.string().min(1).optional(),
  /** title field (default title) */
  titlePath: z.string().min(1).optional(),
  /** due date field (default due_date)。ISO 8601 (yyyy-mm-dd…) を期待 */
  duePath: z.string().min(1).optional(),
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

// iter1135: name.max(200) / scheduleCron.min(1).max(100) には ja message が無く zod default
// 英語が露出。refine "patch is empty" は完全英語。iter1086/1092/1126-1134 ja convention で
// 全 message ja 化。
export const CreateSourceInputSchema = z.discriminatedUnion('kind', [
  z.object({
    workspaceId: z.string().uuid(),
    name: z
      .string()
      .min(1, 'Source 名を入力してください')
      .max(200, 'Source 名は 200 文字以内で入力してください'),
    kind: z.literal('yamory'),
    config: YamoryConfigSchema,
    scheduleCron: z
      .string()
      .min(1, 'cron 式を入力してください')
      .max(100, 'cron 式は 100 文字以内で入力してください')
      .nullable()
      .default(null),
  }),
  z.object({
    workspaceId: z.string().uuid(),
    name: z
      .string()
      .min(1, 'Source 名を入力してください')
      .max(200, 'Source 名は 200 文字以内で入力してください'),
    kind: z.literal('custom-rest'),
    config: CustomRestConfigSchema,
    scheduleCron: z
      .string()
      .min(1, 'cron 式を入力してください')
      .max(100, 'cron 式は 100 文字以内で入力してください')
      .nullable()
      .default(null),
  }),
])
export type CreateSourceInput = z.infer<typeof CreateSourceInputSchema>

export const UpdateSourceInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      name: z
        .string()
        .min(1, 'Source 名を入力してください')
        .max(200, 'Source 名は 200 文字以内で入力してください')
        .optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      enabled: z.boolean().optional(),
      scheduleCron: z
        .string()
        .min(1, 'cron 式を入力してください')
        .max(100, 'cron 式は 100 文字以内で入力してください')
        .nullable()
        .optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' }),
})
export type UpdateSourceInput = z.infer<typeof UpdateSourceInputSchema>
