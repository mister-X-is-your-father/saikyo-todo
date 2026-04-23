'use client'

/**
 * Item の TanStack Query hooks。Server Action (Result<T>) を unwrap して
 * Query に "throw on err" で通すラッパ経由。
 *
 * - 楽観更新が効くのは updateStatus / move (リスト再取得前にユーザが見る順序が変わるもの)
 * - create / delete はシンプルな invalidate のみ (race 回避)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AppError } from '@/lib/errors'
import { AppError as AppErrorClass } from '@/lib/errors'
import type { Result } from '@/lib/result'

import {
  createItemAction,
  listItemsAction,
  moveItemAction,
  softDeleteItemAction,
  updateItemAction,
  updateItemStatusAction,
} from './actions'
import type {
  CreateItemInput,
  Item,
  MoveItemInput,
  SoftDeleteItemInput,
  UpdateItemInput,
  UpdateStatusInput,
} from './schema'

type ItemFilter = { status?: string; isMust?: boolean }

export const itemKeys = {
  all: ['items'] as const,
  list: (workspaceId: string, filter?: ItemFilter) =>
    [...itemKeys.all, workspaceId, filter ?? {}] as const,
  detail: (id: string) => [...itemKeys.all, 'detail', id] as const,
}

function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.value
  // AppError は Result 経由で渡ってくる。Query の onError は Error を受け取るので
  // そのまま throw する。元の instanceof 情報が sera 越しで失われるケースに備えて
  // AppErrorClass 相当を再構築する (code / message 情報は保持)。
  if (r.error instanceof Error) throw r.error
  const e = r.error as AppError
  throw Object.assign(new AppErrorClass(e.code ?? 'UNKNOWN', e.message ?? 'Unknown error'), e)
}

export function useItems(workspaceId: string, filter?: ItemFilter) {
  return useQuery({
    queryKey: itemKeys.list(workspaceId, filter),
    queryFn: async () => unwrap(await listItemsAction(workspaceId, filter)),
    enabled: Boolean(workspaceId),
  })
}

export function useCreateItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateItemInput) => unwrap(await createItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useUpdateItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateItemInput) => unwrap(await updateItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

/**
 * status 変更は楽観更新 (ユーザの操作感が最優先、DnD で即座に反映が必要)。
 */
export function useUpdateItemStatus(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateStatusInput) => unwrap(await updateItemStatusAction(input)),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Item[]>({ queryKey: [...itemKeys.all, workspaceId] })
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData<Item[]>(
          key,
          prev.map((it) => (it.id === input.id ? { ...it, status: input.status } : it)),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useMoveItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MoveItemInput) => unwrap(await moveItemAction(input)),
    onSuccess: () => {
      // ツリー構造 (parent_path) が変わるので list 全体を再取得
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useSoftDeleteItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SoftDeleteItemInput) => unwrap(await softDeleteItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}
