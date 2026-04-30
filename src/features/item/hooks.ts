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

import { positionsBetween } from '@/lib/db/fractional-position'
import { unwrap } from '@/lib/result-unwrap'

import {
  archiveItemAction,
  bulkSoftDeleteItemAction,
  bulkUpdateItemStatusAction,
  clearItemBaselineAction,
  createItemAction,
  listItemAssigneesAction,
  listItemsAction,
  listItemTagIdsAction,
  listSprintItemAssigneesAction,
  listWorkspaceItemAssigneesAction,
  moveItemAction,
  reorderItemAction,
  setItemAssigneesAction,
  setItemBaselineAction,
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
 * 楽観更新用: 同 parent の sibling 全てに新 position を割り当てる。
 *
 * **重要**: array order だけ変えて position field を据え置きにすると、
 * 描画側 (subtasks-panel など) が `compareSiblings` で position 基準に
 * 再 sort して **元順序に戻す flicker** が発生する。
 * したがって、target の position だけでなく **同 parent 全 sibling** に
 * 新 position を均等再生成して付与する (server 側 bucket rebalance と同手法)。
 *
 * これでサーバ確定前でも UI の sort が新順序を維持する。
 */
function reorderInArray(items: Item[], input: ReorderItemInput): Item[] {
  const target = items.find((i) => i.id === input.id)
  if (!target) return items
  const sameParent = items.filter(
    (i) => i.parentPath === target.parentPath && !i.deletedAt,
  )
  const others = items.filter(
    (i) => !(i.parentPath === target.parentPath && !i.deletedAt),
  )
  // (position, id) で sort = UI の compareSiblings と一致
  sameParent.sort(
    (a, b) => a.position.localeCompare(b.position) || a.id.localeCompare(b.id),
  )
  const fromIdx = sameParent.findIndex((s) => s.id === target.id)
  if (fromIdx < 0) return items
  const moved = sameParent.splice(fromIdx, 1)[0]!
  // prev/next ID から target index を決定
  const prevIdx = input.prevSiblingId
    ? sameParent.findIndex((s) => s.id === input.prevSiblingId)
    : -1
  const nextIdx = input.nextSiblingId
    ? sameParent.findIndex((s) => s.id === input.nextSiblingId)
    : -1
  let toIdx: number
  if (prevIdx >= 0) toIdx = prevIdx + 1
  else if (nextIdx >= 0) toIdx = nextIdx
  else toIdx = sameParent.length
  sameParent.splice(toIdx, 0, moved)
  // 全 sibling に均等な position を割り当て (server 側 bucket rebalance と同方針)
  const newPositions = positionsBetween(null, null, sameParent.length)
  const updatedSiblings = sameParent.map((s, i) => ({ ...s, position: newPositions[i]! }))
  return [...others, ...updatedSiblings]
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

export function useSetItemBaseline(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await setItemBaselineAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useClearItemBaseline(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await clearItemBaselineAction(input)),
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

/**
 * iter474: sprint 配下 items の assignees を bulk fetch (Sprint swim-lane Gantt
 * UI 用、N+1 query 回避)。caller は `data?.[itemId] ?? []` で getAssignees
 * callback として渡せる。sprintId が null/undefined なら disabled。
 */
export function useSprintItemAssignees(workspaceId: string, sprintId: string | null | undefined) {
  return useQuery({
    queryKey: ['items', 'sprint-assignees', workspaceId, sprintId ?? 'none'] as const,
    queryFn: async () =>
      unwrap(await listSprintItemAssigneesAction({ workspaceId, sprintId: sprintId! })),
    enabled: Boolean(workspaceId && sprintId),
  })
}

/**
 * iter476: workspace 全 items の assignees を bulk fetch (member-capacity 用、
 * sprint 横断 N+1 回避)。caller は `data?.[itemId] ?? []` で getAssignees
 * callback として渡せる。
 */
export function useWorkspaceItemAssignees(workspaceId: string) {
  return useQuery({
    queryKey: ['items', 'workspace-assignees', workspaceId] as const,
    queryFn: async () => unwrap(await listWorkspaceItemAssigneesAction(workspaceId)),
    enabled: Boolean(workspaceId),
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
