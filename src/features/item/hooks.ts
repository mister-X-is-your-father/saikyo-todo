'use client'

/**
 * Item の TanStack Query hooks。Server Action (Result<T>) を unwrap して
 * Query に "throw on err" で通すラッパ経由。
 *
 * - 楽観更新が効くのは updateStatus / move (リスト再取得前にユーザが見る順序が変わるもの)
 * - create / delete はシンプルな invalidate のみ (race 回避)
 */
import { useMemo } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Fuse from 'fuse.js'

import { unwrap } from '@/lib/result-unwrap'

import {
  archiveItemAction,
  bulkSoftDeleteItemAction,
  bulkUpdateItemStatusAction,
  createItemAction,
  listItemAssigneesAction,
  listItemsAction,
  listItemTagIdsAction,
  moveItemAction,
  reorderItemAction,
  setItemAssigneesAction,
  setItemTagsAction,
  softDeleteItemAction,
  toggleCompleteItemAction,
  unarchiveItemAction,
  updateItemAction,
  updateItemStatusAction,
} from './actions'
import type { AssigneeRef } from './repository'
import type {
  CreateItemInput,
  Item,
  MoveItemInput,
  ReorderItemInput,
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

/**
 * ワンクリック完了/未完了切替。楽観更新 (checkbox の即応性重視)。
 * status を一旦 'done'/'todo' 文字列で暫定置換 (サーバ側が実 key を決める)。
 */
export function useToggleCompleteItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number; complete: boolean }) =>
      unwrap(await toggleCompleteItemAction(input)),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Item[]>({ queryKey: [...itemKeys.all, workspaceId] })
      const provisionalStatus = input.complete ? 'done' : 'todo'
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData<Item[]>(
          key,
          prev.map((it) =>
            it.id === input.id
              ? {
                  ...it,
                  status: provisionalStatus,
                  doneAt: input.complete ? new Date() : null,
                }
              : it,
          ),
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

/**
 * siblings の並び替え。UX の即時フィードバックが重要なので楽観更新。
 * prev/next から新 position を計算するのはサーバ側なので、クライアントは
 * 手元の並びを "id 配列の順序" で暫定的に書き換え、サーバ確定後に再取得で整合。
 */
export function useReorderItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReorderItemInput) => unwrap(await reorderItemAction(input)),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Item[]>({ queryKey: [...itemKeys.all, workspaceId] })
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData<Item[]>(key, reorderInArray(prev, input))
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

/**
 * 楽観更新用: position は知らないが、prev/next の相対位置に target を並べ替える。
 * - prev の後ろ (prev != null): prev の直後に target を置く
 * - next の前 (next != null かつ prev == null): next の直前
 */
function reorderInArray(items: Item[], input: ReorderItemInput): Item[] {
  const target = items.find((i) => i.id === input.id)
  if (!target) return items
  const without = items.filter((i) => i.id !== input.id)
  if (input.prevSiblingId) {
    const idx = without.findIndex((i) => i.id === input.prevSiblingId)
    if (idx < 0) return items
    return [...without.slice(0, idx + 1), target, ...without.slice(idx + 1)]
  }
  if (input.nextSiblingId) {
    const idx = without.findIndex((i) => i.id === input.nextSiblingId)
    if (idx < 0) return items
    return [...without.slice(0, idx), target, ...without.slice(idx)]
  }
  return items
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

export function useArchiveItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await archiveItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useUnarchiveItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await unarchiveItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export const itemRelationKeys = {
  assignees: (itemId: string) => ['items', 'assignees', itemId] as const,
  tagIds: (itemId: string) => ['items', 'tagIds', itemId] as const,
}

export function useItemAssignees(itemId: string | undefined) {
  return useQuery({
    queryKey: itemId ? itemRelationKeys.assignees(itemId) : ['items', 'assignees', 'noop'],
    queryFn: async () => unwrap(await listItemAssigneesAction(itemId!)),
    enabled: Boolean(itemId),
  })
}

export function useSetItemAssignees(workspaceId: string, itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assignees: AssigneeRef[]) =>
      unwrap(await setItemAssigneesAction({ itemId, assignees })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemRelationKeys.assignees(itemId) })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useItemTagIds(itemId: string | undefined) {
  return useQuery({
    queryKey: itemId ? itemRelationKeys.tagIds(itemId) : ['items', 'tagIds', 'noop'],
    queryFn: async () => unwrap(await listItemTagIdsAction(itemId!)),
    enabled: Boolean(itemId),
  })
}

export function useSetItemTags(workspaceId: string, itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tagIds: string[]) => unwrap(await setItemTagsAction({ itemId, tagIds })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemRelationKeys.tagIds(itemId) })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

/**
 * Client 側 fuzzy 検索 (fuse.js)。title / description の両方を見て
 * 先頭 limit 件を返す。cache された items に対して実行するので追加の
 * server call 無し。query が空なら全件 (position 順のまま) を返す。
 */
export function useSearchItems(
  workspaceId: string,
  query: string,
  options: { limit?: number } = {},
) {
  const { data } = useItems(workspaceId)
  const { limit = 30 } = options
  return useMemo(() => {
    if (!data) return []
    const q = query.trim()
    if (q === '') return data.slice(0, limit)
    const fuse = new Fuse(data, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'description', weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    })
    return fuse.search(q, { limit }).map((r) => r.item)
  }, [data, query, limit])
}

export function useBulkUpdateItemStatus(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { ids: string[]; status: string }) =>
      unwrap(await bulkUpdateItemStatusAction({ workspaceId, ...input })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useBulkSoftDeleteItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { ids: string[] }) =>
      unwrap(await bulkSoftDeleteItemAction({ workspaceId, ...input })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}
