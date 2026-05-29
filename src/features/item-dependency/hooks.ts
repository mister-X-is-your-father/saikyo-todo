'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { itemKeys } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import {
  addItemDependencyAction,
  listItemDependenciesAction,
  listWorkspaceBlocksDependenciesAction,
  removeItemDependencyAction,
} from './actions'
import type { AddItemDependencyInput, ItemRef, RemoveItemDependencyInput } from './schema'

export const itemDependencyKeys = {
  all: ['item-dependencies'] as const,
  forItem: (itemId: string) => [...itemDependencyKeys.all, itemId] as const,
  forWorkspace: (workspaceId: string) =>
    [...itemDependencyKeys.all, 'workspace', workspaceId] as const,
}

export function useItemDependencies(itemId: string | null) {
  return useQuery({
    queryKey: itemDependencyKeys.forItem(itemId ?? '__none__'),
    queryFn: async () => unwrap(await listItemDependenciesAction(itemId as string)),
    enabled: Boolean(itemId),
  })
}

/**
 * Workspace 横断の blocks edges (Gantt 依存線描画 / critical path 計算用)。
 */
export function useWorkspaceBlocksDependencies(workspaceId: string | null) {
  return useQuery({
    queryKey: itemDependencyKeys.forWorkspace(workspaceId ?? '__none__'),
    queryFn: async () => unwrap(await listWorkspaceBlocksDependenciesAction(workspaceId as string)),
    enabled: Boolean(workspaceId),
  })
}

/** items cache 横断で id match の最初の Item を返す (ref 構築用) */
function findItemInCaches(qc: ReturnType<typeof useQueryClient>, id: string): Item | null {
  const snapshots = qc.getQueriesData<Item[]>({ queryKey: itemKeys.all })
  for (const [, prev] of snapshots) {
    if (!Array.isArray(prev)) continue
    const hit = prev.find((it) => it.id === id)
    if (hit) return hit
  }
  return null
}

function itemToRef(it: Item): ItemRef {
  return {
    id: it.id,
    title: it.title,
    status: it.status,
    isMust: it.isMust,
    doneAt: it.doneAt,
    priority: it.priority ?? 4,
  }
}

export function useAddItemDependency(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddItemDependencyInput) =>
      unwrap(await addItemDependencyAction(input)),
    // iter1474 (mode-F): ItemEditDialog 依存 tab で「追加」 button click 後 ~200-500ms
    // 待ちで blockedBy / blocking / related list に row が現れない flicker
    // (useRemoveItemDependency iter1470 の逆向き、Group 構造への追加版)。
    // items cache 横断で「相手 Item」 を lookup して ItemRef を構築、適切な group に append。
    // createdAt は new Date() (server canonical fetch で正規 timestamp に上書きされる)。
    onMutate: (input: AddItemDependencyInput) => {
      void qc.cancelQueries({ queryKey: itemDependencyKeys.forItem(itemId) })
      const snapshot = qc.getQueryData<{
        blockedBy: Array<{ ref: ItemRef; createdAt: Date }>
        blocking: Array<{ ref: ItemRef; createdAt: Date }>
        related: Array<{ ref: ItemRef; createdAt: Date }>
      }>(itemDependencyKeys.forItem(itemId))
      const otherId = input.fromItemId === itemId ? input.toItemId : input.fromItemId
      const other = findItemInCaches(qc, otherId)
      if (snapshot && other) {
        const entry = { ref: itemToRef(other), createdAt: new Date() }
        const next = {
          ...snapshot,
          blockedBy:
            input.type === 'blocks' && input.toItemId === itemId
              ? [...snapshot.blockedBy, entry]
              : snapshot.blockedBy,
          blocking:
            input.type === 'blocks' && input.fromItemId === itemId
              ? [...snapshot.blocking, entry]
              : snapshot.blocking,
          related: input.type === 'relates_to' ? [...snapshot.related, entry] : snapshot.related,
        }
        qc.setQueryData(itemDependencyKeys.forItem(itemId), next)
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(itemDependencyKeys.forItem(itemId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: itemDependencyKeys.forItem(itemId) })
    },
  })
}

export function useRemoveItemDependency(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RemoveItemDependencyInput) =>
      unwrap(await removeItemDependencyAction(input)),
    // iter1470 (mode-F): ItemEditDialog 依存 tab で「外す」 button click 後 ~200-500ms
    // 待ちで blockedBy / blocking / related list row が残って見える flicker
    // (useDeleteWorkflow iter1442 / useRemoveTemplateItem iter1462 と同 root cause、
    //  dependency 版)。Group 構造 (blockedBy/blocking/related) に対する filter:
    //   - type='blocks' で input.toItemId === currentItem (= itemId): blockedBy から fromItemId 除外
    //   - type='blocks' で input.fromItemId === currentItem: blocking から toItemId 除外
    //   - type='relates_to': related から「もう一方の id」 を除外
    onMutate: (input: RemoveItemDependencyInput) => {
      void qc.cancelQueries({ queryKey: itemDependencyKeys.forItem(itemId) })
      const snapshot = qc.getQueryData<{
        blockedBy: Array<{ ref: { id: string } } & Record<string, unknown>>
        blocking: Array<{ ref: { id: string } } & Record<string, unknown>>
        related: Array<{ ref: { id: string } } & Record<string, unknown>>
      }>(itemDependencyKeys.forItem(itemId))
      if (snapshot) {
        const otherId = input.fromItemId === itemId ? input.toItemId : input.fromItemId
        const next = {
          ...snapshot,
          blockedBy:
            input.type === 'blocks' && input.toItemId === itemId
              ? snapshot.blockedBy.filter((e) => e.ref.id !== input.fromItemId)
              : snapshot.blockedBy,
          blocking:
            input.type === 'blocks' && input.fromItemId === itemId
              ? snapshot.blocking.filter((e) => e.ref.id !== input.toItemId)
              : snapshot.blocking,
          related:
            input.type === 'relates_to'
              ? snapshot.related.filter((e) => e.ref.id !== otherId)
              : snapshot.related,
        }
        qc.setQueryData(itemDependencyKeys.forItem(itemId), next)
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(itemDependencyKeys.forItem(itemId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: itemDependencyKeys.forItem(itemId) })
    },
  })
}
