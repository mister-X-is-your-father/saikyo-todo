'use client'

/**
 * Agent 関連 TanStack Query mutation hooks。
 *
 * `useDecomposeItem` は Researcher Agent に Item の分解を依頼する。
 * 同期待ちのため isPending が長く (数秒〜30s) なるので、呼び出し側は
 * pending 中は UI をスピナー表示すべし。
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { itemKeys } from '@/features/item/hooks'

import { decomposeItemAction, researchItemAction } from './actions'

export interface DecomposeItemVariables {
  workspaceId: string
  itemId: string
  extraHint?: string
  idempotencyKey?: string
}

export function useDecomposeItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: DecomposeItemVariables) =>
      unwrap(
        await decomposeItemAction({
          workspaceId: vars.workspaceId,
          itemId: vars.itemId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
    onSuccess: () => {
      // 子 Item が新規作成されるのでリスト再取得
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export interface ResearchItemVariables {
  workspaceId: string
  itemId: string
  extraHint?: string
  idempotencyKey?: string
}

// useResearchItem は workspaceId を vars.workspaceId から受ける (useDecomposeItem とは
// シグネチャが異なる点に注意: Doc 新規作成は items キャッシュ invalidate が不要のため
// factory 引数で workspace を bind する必要がない)
export function useResearchItem() {
  return useMutation({
    mutationFn: async (vars: ResearchItemVariables) =>
      unwrap(
        await researchItemAction({
          workspaceId: vars.workspaceId,
          itemId: vars.itemId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
  })
}
