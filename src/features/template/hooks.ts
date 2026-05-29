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
    onSuccess: () => {
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
    onSuccess: () => {
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.items(templateId) })
    },
  })
}

export function useUpdateTemplateItem(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTemplateItemInput) =>
      unwrap(await updateTemplateItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.items(templateId) })
    },
  })
}

export function useRemoveTemplateItem(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RemoveTemplateItemInput) =>
      unwrap(await removeTemplateItemAction(input)),
    onSuccess: () => {
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
