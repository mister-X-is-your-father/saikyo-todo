/**
 * Researcher / PM Agent 関連の Server Action。
 *
 * - `decomposeItemAction`: AI 分解 (Item → 子 Item 群, Researcher)
 * - `researchItemAction`: AI 調査 (Item → Doc 生成, Researcher)
 *
 * iter525: `runStandupAction` は fluffy AI 文章 PM Stand-up が「今日の作戦盤」 widget
 * (operation-board) に置換されたため削除。`pmService.runStandup` / `runStandupViaClaude`
 * 自体は cron-worker (pg-boss `pm-standup`) から呼ばれ続けている (Doc 自動生成、widget
 * とは別経路)。
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

import { agentInvocationRepository, agentRepository } from './repository'
import { type ResearcherRunOutput, researcherService } from './researcher-service'
import type { Agent } from './schema'

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

/**
 * Phase 6.15 iter149: Goal を Claude Max OAuth + claude CLI 経由で分解する。
 * env 不要。`decomposeGoalAction` (SDK 直接利用) との違いは researcher-service の
 * decomposeGoal vs decomposeGoalViaClaude のコメントを参照。
 */
export async function decomposeGoalViaClaudeAction(
  input: unknown,
): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = DecomposeGoalActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')
    return await researcherService.decomposeGoalViaClaude({
      workspaceId: parsed.data.workspaceId,
      goalId: parsed.data.goalId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
  })
}

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

/**
 * iter520 (queue: researcher SDK→CLI run path): AI 調査 を Claude Max OAuth +
 * claude CLI subprocess 経路で実行する Server Action。`researchItemAction` (SDK 経路、
 * env 必要) の regression 修正。UI 既定はこちらを呼ぶ (hooks.ts useResearchItem)。
 */
export async function researchItemViaClaudeAction(
  input: unknown,
): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = DecomposeItemActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')
    return await researcherService.researchItemViaClaude({
      workspaceId: parsed.data.workspaceId,
      itemId: parsed.data.itemId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
  })
}

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

const ListAgentsActionInputSchema = z.object({
  workspaceId: z.string().uuid(),
})

const GeneratePlanActionInputSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid(),
  extraHint: z.string().max(500).optional(),
  /** 省略時はサーバ側で randomUUID を生成。 */
  idempotencyKey: z.string().uuid().optional(),
})

/**
 * P0「AI 自動実行モード」 scope A iter7: AI 担当 Item に「実行計画 (Plan)」を生成。
 * Researcher を CLI 経路で起動 (env 不要) → Plan を Markdown で書かせ →
 * write_comment で本 Item に post → text を返す。UI button (ItemEditDialog) から呼ぶ。
 *
 * 権限: workspace member 以上。
 */
export async function generatePlanAction(input: unknown): Promise<Result<ResearcherRunOutput>> {
  return await actionWrap(async () => {
    const parsed = GeneratePlanActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')
    return await researcherService.generatePlanForItem({
      workspaceId: parsed.data.workspaceId,
      itemId: parsed.data.itemId,
      ...(parsed.data.extraHint ? { extraHint: parsed.data.extraHint } : {}),
      idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
    })
  })
}

/**
 * FEEDBACK_QUEUE.md P0「AI 自動実行モード」 scope A iter3 substrate: workspace 内の
 * agent (pm / researcher / engineer / reviewer) を列挙する read-only action。
 * AssigneePicker の AI 選択肢列挙、KanbanCard の "AI 担当" badge 等で使う。
 *
 * 権限: workspace member 以上 (read-only なので viewer も許可しても良いが、
 * 既存 action と同様に member 一律で揃える)。mutation は無いので audit / Tx 不要。
 */
export async function listAgentsAction(input: unknown): Promise<Result<Agent[]>> {
  return await actionWrap(async () => {
    const parsed = ListAgentsActionInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    await requireWorkspaceMember(parsed.data.workspaceId, 'member')
    const rows = await adminDb.transaction((tx) =>
      agentRepository.listByWorkspace(tx, parsed.data.workspaceId),
    )
    return ok(rows)
  })
}
