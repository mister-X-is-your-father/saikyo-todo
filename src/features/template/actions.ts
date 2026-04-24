'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { Template, TemplateItem } from './schema'
import { templateItemService, templateService } from './service'

export async function createTemplateAction(input: unknown): Promise<Result<Template>> {
  return await actionWrap(() => templateService.create(input))
}

export async function updateTemplateAction(input: unknown): Promise<Result<Template>> {
  return await actionWrap(() => templateService.update(input))
}

export async function softDeleteTemplateAction(input: unknown): Promise<Result<Template>> {
  return await actionWrap(() => templateService.softDelete(input))
}

export async function listTemplatesAction(
  workspaceId: string,
  filter?: { kind?: 'manual' | 'recurring' },
): Promise<Result<Template[]>> {
  try {
    const list = await templateService.list(workspaceId, filter ?? {})
    return ok(list)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function addTemplateItemAction(input: unknown): Promise<Result<TemplateItem>> {
  return await actionWrap(() => templateItemService.add(input))
}

export async function updateTemplateItemAction(input: unknown): Promise<Result<TemplateItem>> {
  return await actionWrap(() => templateItemService.update(input))
}

export async function removeTemplateItemAction(input: unknown): Promise<Result<{ id: string }>> {
  return await actionWrap(() => templateItemService.remove(input))
}

export async function listTemplateItemsAction(templateId: string): Promise<Result<TemplateItem[]>> {
  try {
    const list = await templateItemService.listByTemplate(templateId)
    return ok(list)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
