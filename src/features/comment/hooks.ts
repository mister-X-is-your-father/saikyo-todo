'use client'

/**
 * Comment (Item / Doc) の TanStack Query hooks。Server Action (Result<T>) を
 * unwrap して Query に "throw on err" で通すラッパ経由。
 *
 * - list は TanStack Query で cache、mutation 成功時に invalidate
 * - create/update/softDelete は楽観更新せず invalidate のみ (スレッド整合性優先)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  createCommentOnDocAction,
  createCommentOnItemAction,
  listCommentsOnDocAction,
  listCommentsOnItemAction,
  softDeleteCommentOnDocAction,
  softDeleteCommentOnItemAction,
  updateCommentOnDocAction,
  updateCommentOnItemAction,
} from './actions'
import type {
  CreateCommentOnDocInput,
  CreateCommentOnItemInput,
  SoftDeleteCommentInput,
  UpdateCommentInput,
} from './schema'

export const commentKeys = {
  all: ['comments'] as const,
  itemList: (itemId: string) => [...commentKeys.all, 'item', itemId] as const,
  docList: (docId: string) => [...commentKeys.all, 'doc', docId] as const,
}

export function useItemComments(itemId: string | undefined) {
  return useQuery({
    queryKey: itemId ? commentKeys.itemList(itemId) : ['comments', 'noop'],
    queryFn: async () => unwrap(await listCommentsOnItemAction(itemId!)),
    enabled: Boolean(itemId),
  })
}

export function useCreateItemComment(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCommentOnItemInput) =>
      unwrap(await createCommentOnItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.itemList(itemId) })
    },
  })
}

export function useUpdateItemComment(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateCommentInput) => unwrap(await updateCommentOnItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.itemList(itemId) })
    },
  })
}

export function useSoftDeleteItemComment(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SoftDeleteCommentInput) =>
      unwrap(await softDeleteCommentOnItemAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.itemList(itemId) })
    },
  })
}

export function useDocComments(docId: string | undefined) {
  return useQuery({
    queryKey: docId ? commentKeys.docList(docId) : ['comments', 'noop'],
    queryFn: async () => unwrap(await listCommentsOnDocAction(docId!)),
    enabled: Boolean(docId),
  })
}

export function useCreateDocComment(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCommentOnDocInput) =>
      unwrap(await createCommentOnDocAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.docList(docId) })
    },
  })
}

export function useUpdateDocComment(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateCommentInput) => unwrap(await updateCommentOnDocAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.docList(docId) })
    },
  })
}

export function useSoftDeleteDocComment(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SoftDeleteCommentInput) =>
      unwrap(await softDeleteCommentOnDocAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.docList(docId) })
    },
  })
}
