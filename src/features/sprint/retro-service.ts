/**
 * Sprint 振り返り (Phase 5.3)。
 *
 * Sprint 完了 (or 任意のタイミング) で PM Agent を起動し:
 *   - その Sprint に紐付く完了 / 未完了 items の集計を prompt に埋め込み
 *   - PM が分析 → Retro Doc (good / bad / next) を `create_doc` で保存
 *   - 直近のアクションアイテム 1-5 件を `create_item` で Inbox 投下
 *
 * 仕様:
 *   - service_role 経由 (admin) で sprint + items を集計し、prompt に inline
 *   - 実際の AI invoke は pmService.run に委譲 (memory / cost / audit はそちらが見る)
 *   - Sprint completed 以外でも runForSprint で手動起動可
 *
 * **本サービスは AI 呼び出しを伴うので、テストは invokeModel を vi.mock する**。
 */
import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'

import type { ToolLoopInput } from '@/lib/ai/tool-loop'
import { items, sprints } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { type PmRunOutput, pmService } from '@/features/agent/pm-service'

export interface RunRetroInput {
  sprintId: string
  idempotencyKey: string
  invoker?: ToolLoopInput['invoker']
}

export const retroService = {
  async runForSprint(input: RunRetroInput): Promise<Result<PmRunOutput>> {
    if (!input.sprintId) return err(new ValidationError('sprintId 必須'))
    if (!input.idempotencyKey) return err(new ValidationError('idempotencyKey 必須'))

    // 1. sprint + items を admin で集計 (RLS 越えて全件)
    const [sprint] = await adminDb
      .select()
      .from(sprints)
      .where(and(eq(sprints.id, input.sprintId), isNull(sprints.deletedAt)))
      .limit(1)
    if (!sprint) return err(new NotFoundError('Sprint が見つかりません'))

    const sprintItems = await adminDb
      .select({
        id: items.id,
        title: items.title,
        status: items.status,
        isMust: items.isMust,
        priority: items.priority,
        doneAt: items.doneAt,
      })
      .from(items)
      .where(and(eq(items.sprintId, input.sprintId), isNull(items.deletedAt)))

    const userMessage = buildRetroUserMessage({
      sprintName: sprint.name,
      sprintGoal: sprint.goal ?? null,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      itemSummaries: sprintItems.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        isMust: i.isMust,
        priority: i.priority,
        doneAt: i.doneAt ? i.doneAt.toISOString().slice(0, 10) : null,
      })),
    })

    const r = await pmService.run({
      workspaceId: sprint.workspaceId,
      userMessage,
      idempotencyKey: input.idempotencyKey,
      ...(input.invoker ? { invoker: input.invoker } : {}),
    })

    // 成功時のみ retro_generated_at をセット (weekly cron が再 enqueue しないように)。
    // 失敗時は次回 cron で再試行されるべきなので残しておく。
    if (r.ok) {
      try {
        await adminDb
          .update(sprints)
          .set({ retroGeneratedAt: new Date() })
          .where(eq(sprints.id, sprint.id))
      } catch (e) {
        // marker 更新失敗は本処理を成立させた上でログのみ (cron 重複の不利益は受容)
        console.error(`[retro] retro_generated_at update failed sprint=${sprint.id}`, e)
      }
    }
    return r
  },
}

interface ItemSummary {
  id: string
  title: string
  status: string
  isMust: boolean
  priority: number
  doneAt: string | null
}

/**
 * Pure helper: Sprint 振り返り用 user message を組み立てる (テスト可能)。
 * 完了 items / 未完了 items / MUST 落ち を集計しつつ、AI に最終 Doc 生成 + action items
 * を任せる手順を指示。
 */
export function buildRetroUserMessage(params: {
  sprintName: string
  sprintGoal: string | null
  startDate: string
  endDate: string
  itemSummaries: ItemSummary[]
}): string {
  const done = params.itemSummaries.filter((i) => i.status === 'done')
  const inProgress = params.itemSummaries.filter((i) => i.status === 'in_progress')
  const todo = params.itemSummaries.filter((i) => i.status === 'todo')
  const mustMissed = params.itemSummaries.filter((i) => i.isMust && i.status !== 'done')

  const completionRate =
    params.itemSummaries.length === 0
      ? 0
      : Math.round((done.length / params.itemSummaries.length) * 100)

  const itemList = (label: string, list: ItemSummary[]) => {
    if (list.length === 0) return `${label}: なし`
    const lines = list
      .slice(0, 20)
      .map((i) => `  - [${i.id.slice(0, 8)}] ${i.title}${i.isMust ? ' (MUST)' : ''} p${i.priority}`)
    const more = list.length > 20 ? `\n  ... 他 ${list.length - 20} 件` : ''
    return `${label} (${list.length} 件):\n${lines.join('\n')}${more}`
  }

  return [
    `Sprint "${params.sprintName}" (${params.startDate} 〜 ${params.endDate}) の振り返り Doc を作ってください。`,
    '',
    params.sprintGoal ? `**ゴール**: ${params.sprintGoal}` : '**ゴール**: 未設定',
    '',
    `**全体集計**: ${params.itemSummaries.length} 件中 ${done.length} 件完了 (${completionRate}%)、`,
    `未完 ${todo.length + inProgress.length} 件 (進行中 ${inProgress.length} / 未着手 ${todo.length})、`,
    `**MUST 落ち**: ${mustMissed.length} 件`,
    '',
    itemList('完了', done),
    '',
    itemList('進行中', inProgress),
    '',
    itemList('未着手', todo),
    '',
    mustMissed.length > 0 ? itemList('⚠ MUST 落ち', mustMissed) : '',
    '',
    '手順:',
    '1. 必要なら read_items で個別 item の DoD / description を確認',
    '2. 以下の構成で Retro Doc を `create_doc` で保存:',
    `   - title: "Retro - ${params.sprintName} (${params.endDate})"`,
    '   - body (Markdown):',
    '     - **Keep (うまくいったこと)** 3 つ',
    '     - **Problem (課題)** 3 つ',
    '     - **Try (次の Sprint で試すこと)** 3 つ',
    '     - **MUST 落ちの根本原因** (mustMissed が 1 件以上の場合のみ)',
    '3. Try のうち実行可能な action items を 1-3 件 `create_item` で作成 (status="todo", priority=2)',
    '4. 最後に日本語 3 行で振り返りサマリを返す',
  ]
    .filter((l) => l !== '')
    .join('\n')
}
