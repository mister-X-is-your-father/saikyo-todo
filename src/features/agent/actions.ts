/**
 * Researcher / PM Agent 関連の Server Action。
 *
 * - `decomposeItemAction`: AI 分解 (Item → 子 Item 群, Researcher)
 * - `researchItemAction`: AI 調査 (Item → Doc 生成, Researcher)
 * - `runStandupAction`: PM Daily Stand-up 実行
 *
 * 長時間処理 (最大 ~30s) なので将来 pg-boss 経由の非同期化 + realtime push に移行予定。
 * MVP は inline でレスポンス返却で十分。
 */
'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { actionWrap } from '@/lib/action-wrap'
import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { adminDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { type PmRunOutput, pmService } from './pm-service'
import { agentInvocationRepository } from './repository'
import { type ResearcherRunOutput, researcherService } from './researcher-service'

const DecomposeItemActionInputSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid(),
  extraHint: z.string().max(500).optional(),
  /** 省略時はサーバ側で randomUUID を生成。UI から制御したい時だけ渡す。 */
  idempotencyKey: z.string().uuid().optional(),
  /**
   * 省略時 true (staging mode)。Researcher の出力は agent_decompose_proposals に置かれ、
   * ユーザーが UI で承認するまで items に書かれない。バッチ等で旧挙動が欲しい時のみ false。
   */
  staging: z.boolean().optional(),
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
      ...(parsed.data.staging !== undefined ? { staging: parsed.data.staging } : {}),
    })
    // UI 側は TanStack Query の invalidateQueries(['items', wsId]) で refetch するため
    // revalidatePath は不要
  })
}

/**
 * Phase 6.15 iter148: Claude Max OAuth + claude CLI 経由で AI 分解する。
 * `decomposeItemAction` は Anthropic SDK 直接利用 (env 必要) だったため、
 * `.env.local` に ANTHROPIC_API_KEY が無い環境では失敗していた。本 action は
 * claude CLI subprocess + MCP 経由なので env 不要 (Max プラン OAuth で認証)。
 *
 * Note: proposal staging は通らない (claude CLI MCP は RESEARCHER_TOOLS のみ
 * 公開で、create_item を直接呼ばせるため)。staging が欲しい場合は
 * `decomposeItemAction` を使う。UI 側の切替は次 iter で。
 */
export async function decomposeItemViaClaudeAction(
  input: unknown,
): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = DecomposeItemActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')
    return await researcherService.decomposeItemViaClaude({
      workspaceId: parsed.data.workspaceId,
      itemId: parsed.data.itemId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
  })
}

/**
 * Phase 6.15 iter128: Goal を Researcher に分解させる action。
 * member 以上のみ。チームコンテキスト (workspace_settings.team_context) は service 側で inject。
 */
const DecomposeGoalActionInputSchema = z.object({
  workspaceId: z.string().uuid(),
  goalId: z.string().uuid(),
  extraHint: z.string().max(2000).optional(),
  idempotencyKey: z.string().optional(),
})

export async function decomposeGoalAction(input: unknown): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = DecomposeGoalActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')

    return await researcherService.decomposeGoal({
      workspaceId: parsed.data.workspaceId,
      goalId: parsed.data.goalId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
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

const StandupActionInputSchema = z.object({
  workspaceId: z.string().uuid(),
  idempotencyKey: z.string().uuid().optional(),
})

const CancelInvocationInputSchema = z.object({
  invocationId: z.string().uuid(),
})

/**
 * 実行中 (queued / running) の agent_invocation を中止する。
 * status='cancelled' に立てるだけで、実体の executeToolLoop は次の iteration の
 * shouldAbort チェックで自然停止 → researcherService / pmService の catch 経路で
 * 監査ログ + finishedAt が詰められる。
 *
 * 既に completed / failed / cancelled の行は no-op。
 */
export interface CancelInvocationOutput {
  invocationId: string
  /** 'cancelled' = この呼び出しで cancelled に遷移、'noop' = 既に終了済で何もしなかった */
  status: 'cancelled' | 'noop'
}

export async function cancelInvocationAction(
  input: unknown,
): Promise<Result<CancelInvocationOutput>> {
  return await actionWrap<CancelInvocationOutput>(async () => {
    const parsed = CancelInvocationInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const inv = await adminDb.transaction((tx) =>
      agentInvocationRepository.findById(tx, parsed.data.invocationId),
    )
    if (!inv) return err(new NotFoundError('invocation が見つかりません'))
    const { user } = await requireWorkspaceMember(inv.workspaceId, 'member')

    if (inv.status !== 'queued' && inv.status !== 'running') {
      // 既に終了済 — 何もしない (ユーザーには成功扱いで返す)
      return ok<CancelInvocationOutput>({ invocationId: inv.id, status: 'noop' })
    }
    await adminDb.transaction(async (tx) => {
      await agentInvocationRepository.update(tx, parsed.data.invocationId, {
        status: 'cancelled',
      })
      await recordAudit(tx, {
        workspaceId: inv.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'agent_invocation',
        targetId: inv.id,
        action: 'cancel_request',
        before: { status: inv.status },
        after: { status: 'cancelled' },
      })
    })
    return ok<CancelInvocationOutput>({ invocationId: inv.id, status: 'cancelled' })
  })
}

export async function runStandupAction(input: unknown): Promise<Result<PmRunOutput>> {
  return await actionWrap(async () => {
    const parsed = StandupActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')

    return await pmService.runStandup({
      workspaceId: parsed.data.workspaceId,
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
  })
}
