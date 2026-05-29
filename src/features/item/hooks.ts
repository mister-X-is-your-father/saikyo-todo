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

import { positionBetween, positionsBetween } from '@/lib/db/fractional-position'
import { unwrap } from '@/lib/result-unwrap'

import {
  archiveItemAction,
  bulkSoftDeleteItemAction,
  bulkUpdateItemStatusAction,
  clearItemBaselineAction,
  clearItemChuteMarksAction,
  clearItemWaitingForAction,
  createItemAction,
  listItemAssigneesAction,
  listItemsAction,
  listItemTagIdsAction,
  listSprintItemAssigneesAction,
  listWorkspaceItemAssigneesAction,
  markItemCompletedAction,
  markItemStartedAction,
  moveItemAction,
  reorderItemAction,
  setItemAssigneesAction,
  setItemBaselineAction,
  setItemTagsAction,
  setItemWaitingForAction,
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
    // iter1013: Kanban の cross-column DnD で `useReorderItem` (iter437 fix) と
    // 同じ flicker 防止 pattern に揃える。`await qc.cancelQueries(...)` は
    // microtask 境界を生み、setQueryData が次 tick まで遅延 → 「列を移した瞬間
    // 元列に card が残って見える」 flicker の root cause になり得るため、
    // `void` で fire-and-forget + 非 async onMutate に変更し setQueryData を
    // synchronously 走らせる (2026-04-30 user 要望「並び順 / 列が一瞬戻る」
    // root cause の同 pattern 防止)。
    onMutate: (input) => {
      void qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
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
    // iter1013: useReorderItem (iter437 fix) と同じ flicker 防止 pattern に揃える。
    // checkbox 即応性 (click 直後の strikethrough / fade) は user expectation が
    // 高く、await の microtask 境界で次 tick まで遅延すると違和感が出るため、
    // `void` で fire-and-forget + 非 async onMutate に変更。
    onMutate: (input) => {
      void qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
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
    onMutate: (input) => {
      // **重要**: cancelQueries は `await` せず fire-and-forget で。
      // `await` で microtask 境界が生まれると setQueryData が次 tick まで遅延し、
      // ユーザに「ドラッグ確定の一瞬だけ古い順序が見える」 flicker が発生する
      // (2026-04-30 ユーザ報告 root cause)。setQueryData を **synchronously** 走らせ
      // ることで、drop と同 frame で新順序が描画される。
      void qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
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
 * 楽観更新用: server の reorder ロジックと **完全に同じ挙動** で position を予測。
 *
 * server (item/service.ts) の動作:
 *   - prev.position < next.position (no collision): `positionBetween(prev, next)` で moved のみ更新
 *   - collision (prev>=next): 同 parent 全 sibling を bucket rebalance (positionsBetween で均等再割当)
 *
 * 楽観更新もこれを **正確にミラー** する。これで server refetch 時に他 sibling の
 * position が変わらず、隣接 sibling の「ビクッ」 視覚不整合を防ぐ
 * (2026-04-30 ユーザ報告: 「移動後 上側タスクがビクっと動く」 の根治)。
 *
 * 旧仕様 (常に bucket rebalance) は flicker は防げたが、server が surgical update
 * をするので refetch で他 sibling の position が server 値に巻き戻り → 視覚的に
 * 隣接 sibling が「微小に動いて見える」 という別 bug になっていた。
 */
function reorderInArray(items: Item[], input: ReorderItemInput): Item[] {
  const target = items.find((i) => i.id === input.id)
  if (!target) return items
  const sameParent = items.filter((i) => i.parentPath === target.parentPath && !i.deletedAt)
  const others = items.filter((i) => !(i.parentPath === target.parentPath && !i.deletedAt))
  // (position, id) で **byte-order (ASCII)** sort = UI の compareSiblings と完全一致。
  // localeCompare だと 'Zz' < 'a0' が逆判定されて先頭挿入 bug の root cause になる。
  sameParent.sort((a, b) => {
    if (a.position < b.position) return -1
    if (a.position > b.position) return 1
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  })
  // prev / next item を pull
  const prevItem = input.prevSiblingId ? sameParent.find((s) => s.id === input.prevSiblingId) : null
  const nextItem = input.nextSiblingId ? sameParent.find((s) => s.id === input.nextSiblingId) : null
  const prevPos = prevItem?.position ?? null
  const nextPos = nextItem?.position ?? null
  const collision = prevPos !== null && nextPos !== null && prevPos.localeCompare(nextPos) >= 0

  if (!collision) {
    // 通常 path: target の position だけ更新 (server と一致)
    let newPos: string
    try {
      newPos = positionBetween(prevPos, nextPos)
    } catch {
      // 想定外の path、念のため bucket rebalance に fallback
      return bucketRebalanceClient(target, sameParent, others, input)
    }
    return items.map((i) => (i.id === target.id ? { ...i, position: newPos } : i))
  }

  // collision path: 全 sibling 再均等化 (server と一致)
  return bucketRebalanceClient(target, sameParent, others, input)
}

/**
 * collision 時の bucket rebalance (server item/service.ts の rebalance と同方針)。
 * 全 sibling に positionsBetween(null, null, N) で均等位置を再割当。
 */
function bucketRebalanceClient(
  target: Item,
  sameParent: Item[],
  others: Item[],
  input: ReorderItemInput,
): Item[] {
  const fromIdx = sameParent.findIndex((s) => s.id === target.id)
  if (fromIdx < 0) return [...others, ...sameParent]
  const moved = sameParent.splice(fromIdx, 1)[0]!
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

/**
 * iter1437 (mode-F flicker): archive/unarchive に楽観 update を追加。
 * /archive view (`archivedAt !== null` でフィルタ) で復元時、dashboard/taskchute view
 * (`!archivedAt` でフィルタ) で archive 時に、refetch (~200-500ms) 完了まで
 * 元 list に item が残って見える flicker root cause。`useReorderItem` iter437 と
 * 同 fire-and-forget pattern で setQueryData を sync 走らせ drop と同 frame で反映。
 */
function archiveMutationConfig(workspaceId: string, archived: boolean) {
  return (qc: ReturnType<typeof useQueryClient>) => ({
    onMutate: (input: { id: string }) => {
      void qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Item[]>({ queryKey: [...itemKeys.all, workspaceId] })
      const archivedAt = archived ? new Date() : null
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData<Item[]>(
          key,
          prev.map((it) => (it.id === input.id ? { ...it, archivedAt } : it)),
        )
      }
      return { snapshots }
    },
    onError: (
      _e: unknown,
      _input: unknown,
      ctx: { snapshots: [unknown, Item[] | undefined][] } | undefined,
    ) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useArchiveItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await archiveItemAction(input)),
    ...archiveMutationConfig(workspaceId, true)(qc),
  })
}

export function useUnarchiveItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await unarchiveItemAction(input)),
    ...archiveMutationConfig(workspaceId, false)(qc),
  })
}

/**
 * iter520 (queue TC-2): TaskChute 打刻 ▶ — items.started_at を now() にセット。
 * doneAt とは独立、再打刻は不可 (二重打刻防止)。
 */
export function useMarkItemStarted(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await markItemStartedAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

/**
 * iter520 (queue TC-2): TaskChute 打刻 ■ — items.completed_at を now() にセット。
 */
export function useMarkItemCompleted(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await markItemCompletedAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

/**
 * iter520 (queue TC-2): 打刻取消 — started_at / completed_at を NULL に戻す。
 */
export function useClearItemChuteMarks(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await clearItemChuteMarksAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

/**
 * iter (queue WT-1): 連絡待ち state を set。
 */
export function useSetItemWaitingFor(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: unknown) => unwrap(await setItemWaitingForAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

/** iter (queue WT-1): 連絡待ち state を解除 (返答が来た)。 */
export function useClearItemWaitingFor(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; expectedVersion: number }) =>
      unwrap(await clearItemWaitingForAction(input)),
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
    // iter1403: iter1402 (tag) と同型。onSuccess-invalidate のみで assignee option の checkmark /
    // trigger chip 反映に server round-trip 待ち (~1s lag)。AssigneePicker の value は bare
    // AssigneeRef[] で名前は members/agents から別途解決するため、mutation input をそのまま
    // 楽観 setQueryData できる (名前欠落なし)。iter437/1013 pattern を展開。
    onMutate: (assignees) => {
      void qc.cancelQueries({ queryKey: itemRelationKeys.assignees(itemId) })
      const prev = qc.getQueryData<AssigneeRef[]>(itemRelationKeys.assignees(itemId))
      qc.setQueryData<AssigneeRef[]>(itemRelationKeys.assignees(itemId), assignees)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(itemRelationKeys.assignees(itemId), ctx.prev)
    },
    onSettled: () => {
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
    // iter1402: 旧実装は onSuccess-invalidate のみで、tag option の checkmark / trigger chip が
    // 反映されるまで server round-trip 待ち (実測 ~1s の lag)。iter437/1013 の onMutate 楽観
    // update pattern を tag 付与にも展開 (非 async + void cancelQueries で同 frame に setQueryData)。
    onMutate: (tagIds) => {
      void qc.cancelQueries({ queryKey: itemRelationKeys.tagIds(itemId) })
      const prev = qc.getQueryData<string[]>(itemRelationKeys.tagIds(itemId))
      qc.setQueryData<string[]>(itemRelationKeys.tagIds(itemId), tagIds)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(itemRelationKeys.tagIds(itemId), ctx.prev)
    },
    onSettled: () => {
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
