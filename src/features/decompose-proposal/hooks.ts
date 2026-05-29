'use client'

/**
 * AI 分解 staging hooks。`useDecomposeItem` 完了後にこの hook で proposal 一覧を pull、
 * 行ごとに採用 / 却下 / 編集する。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { itemKeys } from '@/features/item/hooks'

import {
  acceptProposalAction,
  listPendingProposalsAction,
  rejectAllPendingProposalsAction,
  rejectProposalAction,
  updateProposalAction,
} from './actions'

export const proposalKeys = {
  all: ['decompose-proposals'] as const,
  pendingByParent: (parentItemId: string) =>
    ['decompose-proposals', 'pending', parentItemId] as const,
}

export function usePendingProposals(parentItemId: string | null | undefined) {
  return useQuery({
    queryKey: proposalKeys.pendingByParent(parentItemId ?? ''),
    queryFn: async () => unwrap(await listPendingProposalsAction(parentItemId!)),
    enabled: !!parentItemId,
    staleTime: 0,
  })
}

export function useAcceptProposal(workspaceId: string, parentItemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await acceptProposalAction({ id })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useRejectProposal(parentItemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await rejectProposalAction({ id })),
    // iter1445 (mode-F): 「却下」 button click 後 ~200-500ms 待ちで proposal が
    // 一覧から消えない flicker (useDeleteWorkflow iter1442 / useSoftDeleteSchedule
    // iter1444 / useDeleteKeyResult iter1441 と同 root cause)。
    // fire-and-forget cancelQueries + sync setQueryData で proposal を即除外、
    // onError rollback、onSettled で正規 invalidate。
    onMutate: (id: string) => {
      void qc.cancelQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(
        proposalKeys.pendingByParent(parentItemId),
      )
      if (snapshot) {
        qc.setQueryData(
          proposalKeys.pendingByParent(parentItemId),
          snapshot.filter((p) => p.id !== id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(proposalKeys.pendingByParent(parentItemId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
    },
  })
}

export function useRejectAllPendingProposals(parentItemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => unwrap(await rejectAllPendingProposalsAction({ parentItemId })),
    // iter1446 (mode-F): 「全て却下」 button click 後 ~200-500ms 待ちで proposal 一覧が
    // 残る flicker (useRejectProposal iter1445 と同 root cause、一括版)。fire-and-forget
    // cancelQueries + sync setQueryData で proposal 一覧を空配列に置換、snapshot 保存
    // して onError rollback、onSettled で正規 invalidate。
    onMutate: () => {
      void qc.cancelQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
      const snapshot = qc.getQueryData(proposalKeys.pendingByParent(parentItemId))
      qc.setQueryData(proposalKeys.pendingByParent(parentItemId), [])
      return { snapshot }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(proposalKeys.pendingByParent(parentItemId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
    },
  })
}

export interface UpdateProposalVariables {
  id: string
  patch: {
    title?: string
    description?: string
    isMust?: boolean
    dod?: string | null
  }
}

export function useUpdateProposal(parentItemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: UpdateProposalVariables) => unwrap(await updateProposalAction(vars)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
    },
  })
}
