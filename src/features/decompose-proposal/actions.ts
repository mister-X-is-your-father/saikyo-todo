'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { Result } from '@/lib/result'

import type { Item } from '@/features/item/schema'

import type { DecomposeProposal } from './schema'
import { decomposeProposalService } from './service'

export async function listPendingProposalsAction(
  parentItemId: string,
): Promise<Result<DecomposeProposal[]>> {
  return await actionWrap(() => decomposeProposalService.listPending(parentItemId))
}

export async function listAllProposalsAction(
  parentItemId: string,
): Promise<Result<DecomposeProposal[]>> {
  return await actionWrap(() => decomposeProposalService.listAll(parentItemId))
}

export async function updateProposalAction(input: unknown): Promise<Result<DecomposeProposal>> {
  return await actionWrap(() => decomposeProposalService.update(input))
}

export async function acceptProposalAction(
  input: unknown,
): Promise<Result<{ proposal: DecomposeProposal; item: Item }>> {
  return await actionWrap(() => decomposeProposalService.accept(input))
}

export async function rejectProposalAction(input: unknown): Promise<Result<DecomposeProposal>> {
  return await actionWrap(() => decomposeProposalService.reject(input))
}

export async function rejectAllPendingProposalsAction(
  input: unknown,
): Promise<Result<{ count: number }>> {
  return await actionWrap(() => decomposeProposalService.rejectAllPending(input))
}
