/**
 * Heartbeat 関連の Server Action。
 * MVP では手動起動のみ (Day 25 で pg_cron 化予定)。
 */
'use server'

import { z } from 'zod'

import { actionWrap } from '@/lib/action-wrap'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { ValidationError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { type HeartbeatScanResult, heartbeatService } from './service'

const ScanInputSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function scanHeartbeatAction(input: unknown): Promise<Result<HeartbeatScanResult>> {
  return await actionWrap(async () => {
    const parsed = ScanInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')
    return await heartbeatService.scanWorkspace(parsed.data.workspaceId)
  })
}
