'use server'

import { revalidatePath } from 'next/cache'

import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { Doc } from './schema'
import { docService } from './service'

async function wrap<T>(fn: () => Promise<Result<T>>, revalidate?: string): Promise<Result<T>> {
  try {
    const result = await fn()
    if (result.ok && revalidate) revalidatePath(revalidate, 'layout')
    return result
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function createDocAction(input: unknown): Promise<Result<Doc>> {
  return await wrap(() => docService.create(input))
}

export async function updateDocAction(input: unknown): Promise<Result<Doc>> {
  return await wrap(() => docService.update(input))
}

export async function softDeleteDocAction(input: unknown): Promise<Result<Doc>> {
  return await wrap(() => docService.softDelete(input))
}
