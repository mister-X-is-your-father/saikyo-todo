import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { workspaces } from '@/lib/db/schema'

export const WorkspaceSelectSchema = createSelectSchema(workspaces)
export type WorkspaceRow = z.infer<typeof WorkspaceSelectSchema>

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().min(1, 'Workspace 名を入力してください').max(100),
  slug: z
    .string()
    .min(2, '2 文字以上')
    .max(50)
    .regex(/^[a-z0-9-]+$/, '英小文字 / 数字 / ハイフンのみ'),
})
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>
