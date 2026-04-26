/**
 * Sprint Pre-mortem (Phase 6.8)。
 *
 * Sprint planning → active 化のタイミングで PM Agent を起動し、
 * "この Sprint で起こりうる遅延 / 失敗" を事前に予測する Pre-mortem Doc を生成する。
 * Retro が "終わった後の振り返り" なら Pre-mortem は "始まる前の予防接種"。
 *
 * 流れ:
 *   - sprint + 計画済 items を集計
 *   - 過去 90 日の retro / pm-recovery Doc を search hint に渡し、過去パターンを参照
 *   - PM が `read_docs` / `search_docs` で類似事例を確認
 *   - `create_doc` で Pre-mortem Doc を保存 (リスク 3-5 + 早期警報指標 + 緩和策)
 *   - 重要リスクは `create_item` で Watch List Item を投下 (priority=2)
 *
 * 仕様:
 *   - retro と同様 service_role で集計、AI 呼び出しは pmService.run に委譲
 *   - Sprint planning でない (= active / completed / cancelled) でも `manual` 起動なら受け付ける
 *   - sprints.premortem_generated_at マーカーで重複起動を抑制 (同じ sprint で 2 回実行しない)
 *
 * テスト: invokeModel を vi.mock し、prompt 内容と marker 更新を検証。
 */
import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'

import type { ToolLoopInput } from '@/lib/ai/tool-loop'
import { items, sprints } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import { type PmRunOutput, pmService } from '@/features/agent/pm-service'

export interface RunPremortemInput {
  sprintId: string
  idempotencyKey: string
  invoker?: ToolLoopInput['invoker']
}

export const premortemService = {
  async runForSprint(input: RunPremortemInput): Promise<Result<PmRunOutput>> {
    if (!input.sprintId) return err(new ValidationError('sprintId 必須'))
    if (!input.idempotencyKey) return err(new ValidationError('idempotencyKey 必須'))

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
        dueDate: items.dueDate,
        dod: items.dod,
        description: items.description,
      })
      .from(items)
      .where(and(eq(items.sprintId, input.sprintId), isNull(items.deletedAt)))

    const userMessage = buildPremortemUserMessage({
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
        dueDate: i.dueDate,
        dod: i.dod,
        descriptionPreview: (i.description ?? '').slice(0, 200),
      })),
    })

    const r = await pmService.run({
      workspaceId: sprint.workspaceId,
      userMessage,
      idempotencyKey: input.idempotencyKey,
      ...(input.invoker ? { invoker: input.invoker } : {}),
    })

    // 成功時のみ premortem_generated_at をセット (二重起動抑制)。
    if (r.ok) {
      try {
        await adminDb
          .update(sprints)
          .set({ premortemGeneratedAt: new Date() })
          .where(eq(sprints.id, sprint.id))
      } catch (e) {
        console.error(`[premortem] premortem_generated_at update failed sprint=${sprint.id}`, e)
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
  dueDate: string | null
  dod: string | null
  descriptionPreview: string
}

/**
 * Pre-mortem 用 user message を組み立てる純粋関数 (テスト可能)。
 *
 * AI に「この Sprint が失敗するとしたら何が起こるか?」を想像させ、
 *   - 高リスク 3-5 個 (根拠 + 早期警報 + 緩和策)
 *   - MUST 落ち警戒事項 (DoD が曖昧 / 期限がタイト / 過去類似 retro で落ちた等)
 * を Markdown でまとめさせる。
 */
export function buildPremortemUserMessage(params: {
  sprintName: string
  sprintGoal: string | null
  startDate: string
  endDate: string
  itemSummaries: ItemSummary[]
}): string {
  const must = params.itemSummaries.filter((i) => i.isMust)
  const mustWithoutDod = must.filter((i) => !i.dod || i.dod.trim().length === 0)
  const totalDays = Math.max(
    1,
    Math.round(
      (new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1,
  )

  const itemList = (label: string, list: ItemSummary[]) => {
    if (list.length === 0) return `${label}: なし`
    const lines = list
      .slice(0, 20)
      .map(
        (i) =>
          `  - [${i.id.slice(0, 8)}] ${i.title}${i.isMust ? ' (MUST)' : ''} ` +
          `p${i.priority}${i.dueDate ? ` 期限=${i.dueDate}` : ''}` +
          `${i.dod ? '' : ' ⚠ DoD 未設定'}`,
      )
    const more = list.length > 20 ? `\n  ... 他 ${list.length - 20} 件` : ''
    return `${label} (${list.length} 件):\n${lines.join('\n')}${more}`
  }

  return [
    `Sprint "${params.sprintName}" の Pre-mortem を作成してください。`,
    `想像してください — ${params.endDate} 時点で振り返ったら、この Sprint は "失敗した" としよう。`,
    `何が起きていたら失敗するか? 何を見落としているか? を予測する。`,
    '',
    params.sprintGoal
      ? `**ゴール**: ${params.sprintGoal}`
      : '**ゴール**: 未設定 (← それ自体が大きなリスク)',
    `**期間**: ${params.startDate} 〜 ${params.endDate} (${totalDays} 日間)`,
    `**MUST**: ${must.length} 件 (うち ${mustWithoutDod.length} 件 DoD 未設定)`,
    `**Item 総数**: ${params.itemSummaries.length} 件`,
    '',
    itemList('全 Item', params.itemSummaries),
    '',
    must.length > 0 ? itemList('⚠ MUST のみ', must) : '',
    '',
    '手順:',
    '1. search_docs で過去 90 日の "Retro" / "Recovery" Doc を引き、過去のつまずきパターンを 2-3 個抽出',
    '2. read_items で関連 Item の DoD / description を必要に応じて確認',
    '3. 以下の構成で Pre-mortem Doc を `create_doc` で保存:',
    `   - title: "Pre-mortem - ${params.sprintName} (${params.startDate})"`,
    '   - body (Markdown):',
    '     - **想定リスク 3-5 件** (各リスク: 兆候 / 影響 / 緩和策の 3 行)',
    '     - **早期警報指標** (この値を見れば気づく KPI / Item 状態)',
    '     - **MUST 落ち警戒** (DoD 未設定 / 期限タイト / 過去類似落ちあり)',
    '     - **冒頭のアクション 3 件** (今 24h で打つ予防の手)',
    '4. 重要リスク (影響大) のうち 1-3 件を `create_item` で Watch List Item として投下',
    '   (status="todo", priority=2, タイトルは "[Watch] <リスク要約>")',
    '5. 最後に日本語 3 行で要旨 + 一言コメントを返す',
  ]
    .filter((l) => l !== '')
    .join('\n')
}
