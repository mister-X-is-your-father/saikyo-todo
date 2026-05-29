'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  addTemplateItemAction,
  createTemplateAction,
  createTemplateFromItemAction,
  instantiateTemplateAction,
  listTemplateItemsAction,
  listTemplatesAction,
  removeTemplateItemAction,
  softDeleteTemplateAction,
  updateTemplateAction,
  updateTemplateItemAction,
} from './actions'
import type {
  AddTemplateItemInput,
  CreateTemplateFromItemInput,
  CreateTemplateInput,
  InstantiateTemplateInput,
  RemoveTemplateItemInput,
  SoftDeleteTemplateInput,
  UpdateTemplateInput,
  UpdateTemplateItemInput,
} from './schema'

export const templateKeys = {
  all: ['templates'] as const,
  list: (workspaceId: string, filter?: { kind?: 'manual' | 'recurring' }) =>
    [...templateKeys.all, workspaceId, filter ?? {}] as const,
  items: (templateId: string) => [...templateKeys.all, 'items', templateId] as const,
}

export function useTemplates(workspaceId: string, filter?: { kind?: 'manual' | 'recurring' }) {
  return useQuery({
    queryKey: templateKeys.list(workspaceId, filter),
    queryFn: async () => unwrap(await listTemplatesAction(workspaceId, filter)),
    enabled: Boolean(workspaceId),
  })
}

export function useTemplateItems(templateId: string | null) {
  return useQuery({
    queryKey: templateKeys.items(templateId ?? ''),
    queryFn: async () => unwrap(await listTemplateItemsAction(templateId as string)),
    enabled: Boolean(templateId),
  })
}

export function useCreateTemplate(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => unwrap(await createTemplateAction(input)),
    // iter1482 (mode-F、Add 系): /templates で Template 作成後 ~200-500ms 待ちで card が
    // 現れない flicker (useCreateWorkflow iter1481 と同 root cause、Template 版)。
    // templateKeys.list は filter (kind=manual/recurring) を含む queryKey なので
    // getQueriesData で複数 cache 横断 append。filter mismatch (kind != filter) の
    // cache には append しない方針 (UI 上 list が wrong filter で 1 item 多く見える bug 回避)。
    onMutate: (input: CreateTemplateInput) => {
      void qc.cancelQueries({ queryKey: [...templateKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Array<{ id: string }>>({
        queryKey: [...templateKeys.all, workspaceId],
      })
      const tempEntry = {
        id: `temp-${crypto.randomUUID()}`,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? '',
        kind: input.kind ?? 'manual',
        scheduleCron: input.scheduleCron ?? null,
        variablesSchema: input.variablesSchema ?? {},
        tags: input.tags ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0,
        deletedAt: null,
        createdBy: '',
      }
      for (const [key, prev] of snapshots) {
        if (!Array.isArray(prev)) continue
        // key の最後の filter object に kind フィルタが付いていたら mismatch 時 skip
        const filter = key[key.length - 1] as { kind?: string } | undefined
        if (filter && filter.kind && filter.kind !== tempEntry.kind) continue
        qc.setQueryData(key, [...prev, tempEntry])
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...templateKeys.all, workspaceId] })
    },
  })
}

/**
 * 既存 Item ツリー (parent + 子孫 items) を Template として保存。
 * 成功時に templates 一覧 cache を invalidate し、新しい Template が
 * /<wsId>/templates ページに即出現するようにする。
 */
export function useCreateTemplateFromItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTemplateFromItemInput) =>
      unwrap(await createTemplateFromItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...templateKeys.all, workspaceId] })
    },
  })
}

export function useUpdateTemplate(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => unwrap(await updateTemplateAction(input)),
    // iter1452 (mode-F): Template 編集 form 保存後 ~200-500ms 待ちで visible
    // name / description / cron / variables が更新前のまま見える flicker
    // (useUpdateWorkflow iter1451 / useUpdateGoal iter1450 と同 root cause、Template 版)。
    // templateKeys.list は filter (kind=manual/recurring) を含む queryKey なので
    // getQueriesData で複数 cache 横断 patch merge。
    onMutate: (input: UpdateTemplateInput) => {
      void qc.cancelQueries({ queryKey: [...templateKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Array<{ id: string } & Record<string, unknown>>>({
        queryKey: [...templateKeys.all, workspaceId],
      })
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData(
          key,
          prev.map((t) => (t.id === input.id ? { ...t, ...input.patch } : t)),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...templateKeys.all, workspaceId] })
    },
  })
}

export function useSoftDeleteTemplate(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SoftDeleteTemplateInput) =>
      unwrap(await softDeleteTemplateAction(input)),
    // iter1443 (mode-F): Template 削除 button click 後 ~200-500ms 待ちで card が
    // 消えない flicker (useDeleteWorkflow iter1442 / useDeleteKeyResult iter1441
    // と同 root cause)。fire-and-forget cancelQueries + sync setQueryData で
    // 全 filter 別 list cache から filter 除外、onError rollback、onSettled で
    // 正規 invalidate。templateKeys.list は filter を含む queryKey なので
    // getQueriesData で複数 cache 横断取得。
    onMutate: (input: SoftDeleteTemplateInput) => {
      void qc.cancelQueries({ queryKey: [...templateKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Array<{ id: string }>>({
        queryKey: [...templateKeys.all, workspaceId],
      })
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData(
          key,
          prev.filter((t) => t.id !== input.id),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...templateKeys.all, workspaceId] })
    },
  })
}

export function useAddTemplateItem(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddTemplateItemInput) => unwrap(await addTemplateItemAction(input)),
    // iter1476 (mode-F、Add 系): Template 編集 dialog で TemplateItem 追加後
    // ~200-500ms 待ちで row が現れない flicker (useAddItemArtifact iter1475 と
    // 同 root cause、TemplateItem 版)。temp id で仮 row append、server canonical
    // fetch (onSettled invalidate) で正規 id に上書き。
    onMutate: (input: AddTemplateItemInput) => {
      void qc.cancelQueries({ queryKey: templateKeys.items(templateId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        templateKeys.items(templateId),
      )
      if (snapshot) {
        const tempEntry = {
          id: `temp-${crypto.randomUUID()}`,
          templateId: input.templateId,
          title: input.title,
          description: input.description ?? '',
          parentPath: input.parentPath ?? '',
          statusInitial: input.statusInitial ?? 'todo',
          dueOffsetDays: input.dueOffsetDays ?? null,
          isMust: input.isMust ?? false,
          dod: input.dod ?? null,
          defaultAssignees: input.defaultAssignees ?? [],
          agentRoleToInvoke: input.agentRoleToInvoke ?? null,
          createdAt: new Date(),
        }
        qc.setQueryData(templateKeys.items(templateId), [...snapshot, tempEntry])
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(templateKeys.items(templateId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.items(templateId) })
    },
  })
}

export function useUpdateTemplateItem(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTemplateItemInput) =>
      unwrap(await updateTemplateItemAction(input)),
    // iter1462 (mode-F): TemplateItem 編集保存後 ~200-500ms 待ちで visible title /
    // dueOffset / MUST badge が更新前のまま見える flicker (useUpdateTemplate iter1452 と
    // 同 root cause、template item 編集版)。fire-and-forget cancelQueries + sync
    // setQueryData で id match の item を input.patch で merge spread。
    onMutate: (input: UpdateTemplateItemInput) => {
      void qc.cancelQueries({ queryKey: templateKeys.items(templateId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        templateKeys.items(templateId),
      )
      if (snapshot) {
        qc.setQueryData(
          templateKeys.items(templateId),
          snapshot.map((t) => (t.id === input.id ? { ...t, ...input.patch } : t)),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(templateKeys.items(templateId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.items(templateId) })
    },
  })
}

export function useRemoveTemplateItem(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RemoveTemplateItemInput) =>
      unwrap(await removeTemplateItemAction(input)),
    // iter1462 (mode-F): TemplateItem 削除 (✕ click) 後 ~200-500ms 待ちで row が
    // 残って見える flicker (useDeleteWorkflow iter1442 / useDeleteKeyResult iter1441
    // と同 root cause、template item 版)。
    onMutate: (input: RemoveTemplateItemInput) => {
      void qc.cancelQueries({ queryKey: templateKeys.items(templateId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(templateKeys.items(templateId))
      if (snapshot) {
        qc.setQueryData(
          templateKeys.items(templateId),
          snapshot.filter((t) => t.id !== input.id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(templateKeys.items(templateId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.items(templateId) })
    },
  })
}

/**
 * Template を instantiate。成功時に items キャッシュを invalidate するので、
 * workspace ボードに戻ると新しい root item が出現する。
 */
export function useInstantiateTemplate(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InstantiateTemplateInput) =>
      unwrap(await instantiateTemplateAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['items', workspaceId] })
    },
  })
}
