'use server'

import { actionWrap } from '@/lib/action-wrap'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

export interface TriggerEngineerInput {
  itemId: string
  baseBranch?: string
  autoPr?: boolean
}

/**
 * Item に対して Engineer Agent を起動する Server Action。
 *
 * 同期では走らせず pg-boss に enqueue (worker で処理) するため、UI は invocation の
 * 進捗を agent_invocations テーブル経由 (既存の useAgentInvocationProgress hook 等) で
 * 監視する。
 */
export async function triggerEngineerAgentAction(
  input: TriggerEngineerInput,
): Promise<Result<{ jobId: string | null; targetItemId: string }>> {
  return await actionWrap(async () => {
    if (!input.itemId) return err(new ValidationError('itemId 必須'))
    const user = await requireUser()
    // RLS 経由で引く: 別 workspace の item は見えず NotFound 扱いになる (情報漏洩防止)
    const item = await withUserDb(user.id, (tx) => itemRepository.findById(tx, input.itemId))
    if (!item) return err(new NotFoundError('Item が見つかりません'))
    await requireWorkspaceMember(item.workspaceId, 'member')

    // singletonKey は user 別 + 秒粒度 timestamp。
    //   - user を含めないと「同じ Item を別ユーザが起動 → 1 件目以外 silent skip」の罠
    //   - 完全一意にすると重複防止が効かないので、5 秒バケットで二度押し抑制を維持
    const bucket = Math.floor(Date.now() / 5_000)
    const jobId = await enqueueJob(
      'engineer-run',
      {
        workspaceId: item.workspaceId,
        itemId: input.itemId,
        baseBranch: input.baseBranch ?? 'main',
        autoPr: !!input.autoPr,
        triggeredByUserId: user.id,
        triggeredAt: new Date().toISOString(),
      },
      { singletonKey: `engineer-run-${item.workspaceId}-${input.itemId}-${user.id}-${bucket}` },
    )
    return ok({ jobId, targetItemId: input.itemId })
  })
}
