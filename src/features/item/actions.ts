'use server'

import { revalidatePath } from 'next/cache'

import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { Item } from './schema'
import { itemService } from './service'

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

export async function createItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.create(input))
}

export async function updateItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.update(input))
}

export async function updateItemStatusAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.updateStatus(input))
}

export async function softDeleteItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.softDelete(input))
}
