import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { agentDecomposeProposals } from '@/lib/db/schema'

export const ProposalSelectSchema = createSelectSchema(agentDecomposeProposals)
export type DecomposeProposal = z.infer<typeof ProposalSelectSchema>

export const ProposalStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>

// iter1134: title.max(500) / description.max(5000) / dod.max(2000) には ja message が無く
// zod default 英語が露出。iter1086/1092/1126-1133 ja convention で全 max ja 化。
export const UpdateProposalInputSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      title: z
        .string()
        .min(1, 'タイトルを入力してください')
        .max(500, 'タイトルは 500 文字以内で入力してください')
        .optional(),
      description: z.string().max(5000, '説明は 5,000 文字以内で入力してください').optional(),
      isMust: z.boolean().optional(),
      dod: z.string().max(2000, 'DoD は 2,000 文字以内で入力してください').nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' }),
})
export type UpdateProposalInput = z.infer<typeof UpdateProposalInputSchema>

export const AcceptProposalInputSchema = z.object({
  id: z.string().uuid(),
})
export type AcceptProposalInput = z.infer<typeof AcceptProposalInputSchema>

export const RejectProposalInputSchema = z.object({
  id: z.string().uuid(),
})
export type RejectProposalInput = z.infer<typeof RejectProposalInputSchema>

export const BulkProposalActionInputSchema = z.object({
  parentItemId: z.string().uuid(),
})
export type BulkProposalActionInput = z.infer<typeof BulkProposalActionInputSchema>
