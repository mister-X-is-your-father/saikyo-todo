'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  addTemplateItemAction,
  createTemplateAction,
  listTemplateItemsAction,
  listTemplatesAction,
  removeTemplateItemAction,
  softDeleteTemplateAction,
  updateTemplateAction,
  updateTemplateItemAction,
} from './actions'
import type {
  AddTemplateItemInput,
  CreateTemplateInput,
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
    onSuccess: () => {
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
