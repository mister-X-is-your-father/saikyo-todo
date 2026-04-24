/**
 * Researcher Agent 関連の Server Action。
 *
 * - `decomposeItemAction`: AI 分解 (Item → 子 Item 群)
 * - `researchItemAction`: AI 調査 (Item → Doc 生成)
 *
 * 長時間処理 (最大 ~30s) なので将来 pg-boss 経由の非同期化 + realtime push に移行予定。
 * MVP は inline でレスポンス返却で十分。
 */
'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { actionWrap } from '@/lib/action-wrap'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { ValidationError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { type ResearcherRunOutput, researcherService } from './researcher-service'

const DecomposeItemActionInputSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid(),
  extraHint: z.string().max(500).optional(),
  /** 省略時はサーバ側で randomUUID を生成。UI から制御したい時だけ渡す。 */
  idempotencyKey: z.string().uuid().optional(),
})

export async function decomposeItemAction(input: unknown): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = DecomposeItemActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    // ws-member gate (越境 + viewer/外部遮断)
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')

    return await researcherService.decomposeItem({
      workspaceId: parsed.data.workspaceId,
      itemId: parsed.data.itemId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
    // UI 側は TanStack Query の invalidateQueries(['items', wsId]) で refetch するため
    // revalidatePath は不要
  })
}

export async function researchItemAction(input: unknown): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = DecomposeItemActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')

    return await researcherService.researchItem({
      workspaceId: parsed.data.workspaceId,
      itemId: parsed.data.itemId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
  })
}
