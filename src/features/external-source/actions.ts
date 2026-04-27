'use server'

import { eq } from 'drizzle-orm'

import { actionWrap } from '@/lib/action-wrap'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { externalSources } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { ExternalSource } from './schema'
import { externalSourceService } from './service'
import { type PullResult, pullSource } from './worker'

export async function createSourceAction(input: unknown): Promise<Result<ExternalSource>> {
  return await actionWrap(() => externalSourceService.create(input))
}

export async function updateSourceAction(input: unknown): Promise<Result<ExternalSource>> {
  return await actionWrap(() => externalSourceService.update(input))
}

export async function listSourcesAction(workspaceId: string): Promise<Result<ExternalSource[]>> {
  return await actionWrap(() => externalSourceService.list(workspaceId))
}

export async function deleteSourceAction(id: string): Promise<Result<{ id: string }>> {
  return await actionWrap(() => externalSourceService.softDelete(id))
}

/**
 * Phase 6.15 iter124: 手動 Pull trigger。
 * member 以上で workspace 内 source を pull できる。
 * 実体は worker.ts の pullSource (admin 操作だが member の意思で起動するので妥当)。
 */
export async function triggerSourcePullAction(sourceId: string): Promise<Result<PullResult>> {
  return await actionWrap(async () => {
    if (!sourceId) return err(new ValidationError('sourceId 必須'))

    // workspace member 確認 (admin op の前にちゃんと許可を取る)
    const rows = await adminDb
      .select({
        workspaceId: externalSources.workspaceId,
        deletedAt: externalSources.deletedAt,
      })
      .from(externalSources)
      .where(eq(externalSources.id, sourceId))
      .limit(1)
    const src = rows[0]
    if (!src || src.deletedAt) return err(new ValidationError('Source が見つかりません'))
    await requireWorkspaceMember(src.workspaceId, 'member')

    const r = await pullSource(sourceId, 'manual')
    return ok(r)
  })
}
