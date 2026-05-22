import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { workspaces } from '@/lib/db/schema'

export const WorkspaceSelectSchema = createSelectSchema(workspaces)
export type WorkspaceRow = z.infer<typeof WorkspaceSelectSchema>

// iter1092: name の schema max(100) が form HTML maxLength={50} / hint "最大 50 文字" と不一致
// (schema が緩すぎ、超過時 error は zod default 英語)、slug max(50) も message 無く zod default。
// form 意図 (50 文字) を source of truth として schema を max(50) に揃え + ja message を全付与
// (iter1086 mock-timesheet 同 ja convention)。
export const CreateWorkspaceInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace 名を入力してください')
    .max(50, 'Workspace 名は 50 文字以内で入力してください'),
  slug: z
    .string()
    .min(2, 'slug は 2 文字以上で入力してください')
    .max(50, 'slug は 50 文字以内で入力してください')
    .regex(/^[a-z0-9-]+$/, 'slug は 英小文字 / 数字 / ハイフンのみで入力してください'),
})
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>
