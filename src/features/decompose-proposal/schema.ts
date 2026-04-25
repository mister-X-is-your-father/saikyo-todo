import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { agentDecomposeProposals } from '@/lib/db/schema'

export const ProposalSelectSchema = createSelectSchema(agentDecomposeProposals)
export type DecomposeProposal = z.infer<typeof ProposalSelectSchema>

export const ProposalStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>

export const UpdateProposalInputSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(5000).optional(),
      isMust: z.boolean().optional(),
      dod: z.string().max(2000).nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新項目がありません' }),
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
