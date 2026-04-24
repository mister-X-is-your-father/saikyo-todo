'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { Result } from '@/lib/result'

import type { Doc } from './schema'
import { docService } from './service'

export async function createDocAction(input: unknown): Promise<Result<Doc>> {
  return await actionWrap(() => docService.create(input))
}

export async function updateDocAction(input: unknown): Promise<Result<Doc>> {
  return await actionWrap(() => docService.update(input))
}

export async function softDeleteDocAction(input: unknown): Promise<Result<Doc>> {
  return await actionWrap(() => docService.softDelete(input))
}
