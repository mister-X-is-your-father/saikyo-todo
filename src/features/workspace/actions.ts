'use server'

import { revalidatePath } from 'next/cache'

import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { type CreateWorkspaceInput } from './schema'
import { workspaceService } from './service'

export async function createWorkspaceAction(
  input: CreateWorkspaceInput,
): Promise<Result<{ id: string }>> {
  try {
    const result = await workspaceService.create(input)
    if (result.ok) {
      revalidatePath('/')
    }
    return result
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
