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

import { and, eq, inArray, isNull, or } from 'drizzle-orm'

import type { ToolLoopInput } from '@/lib/ai/tool-loop'
import { itemDependencies, items, sprints } from '@/lib/db/schema'
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
        doneAt: items.doneAt,
      })
      .from(items)
      .where(and(eq(items.sprintId, input.sprintId), isNull(items.deletedAt)))

    const sprintItemIds = sprintItems.map((i) => i.id)
    const dependencyRows =
      sprintItemIds.length > 0
        ? await adminDb
            .select({
              fromItemId: itemDependencies.fromItemId,
              toItemId: itemDependencies.toItemId,
              type: itemDependencies.type,
            })
            .from(itemDependencies)
            .where(
              and(
                eq(itemDependencies.type, 'blocks'),
                or(
                  inArray(itemDependencies.fromItemId, sprintItemIds),
                  inArray(itemDependencies.toItemId, sprintItemIds),
                ),
              ),
            )
        : []

    // Sprint Item の外側にある "前提" Item (= sprint に含まれない上流) を別途引く
    const externalUpstreamIds = Array.from(
      new Set(
        dependencyRows
          .filter(
            (d) => sprintItemIds.includes(d.toItemId) && !sprintItemIds.includes(d.fromItemId),
          )
          .map((d) => d.fromItemId),
      ),
    )
    const externalUpstreams =
      externalUpstreamIds.length > 0
        ? await adminDb
            .select({
              id: items.id,
              title: items.title,
              status: items.status,
              doneAt: items.doneAt,
            })
            .from(items)
            .where(and(inArray(items.id, externalUpstreamIds), isNull(items.deletedAt)))
        : []

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
        doneAt: i.doneAt,
        descriptionPreview: (i.description ?? '').slice(0, 200),
      })),
      dependencies: dependencyRows.map((d) => ({
        fromItemId: d.fromItemId,
        toItemId: d.toItemId,
      })),
      externalUpstreams: externalUpstreams.map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        doneAt: e.doneAt,
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
  doneAt?: Date | null
  descriptionPreview: string
}

interface DependencyEdge {
  /** 前提 (上流) — これが完了するまで toItemId は進められない */
  fromItemId: string
  /** 後続 (下流) */
  toItemId: string
}

interface ExternalUpstream {
  id: string
  title: string
  status: string
  doneAt: Date | null
}

/**
 * Sprint 内 items の依存グラフから、現在 "上流が未完で blocked 状態" の Item を特定。
 * MUST が blocked されているケースは Pre-mortem の最重要警戒事項。
 *
 * 完了判定: status='done' でなくても doneAt が立っていれば完了扱い (workspace_statuses
 * の type='done' を見ない簡易判定。Pre-mortem は厳密でなくて良い)。
 */
export function detectBlockedItems(
  itemSummaries: ItemSummary[],
  dependencies: DependencyEdge[],
  externalUpstreams: ExternalUpstream[],
): Array<{
  item: ItemSummary
  blockedBy: Array<{ id: string; title: string; status: string; doneAt: Date | null }>
}> {
  const itemMap = new Map<string, ItemSummary>(itemSummaries.map((i) => [i.id, i]))
  const externalMap = new Map<string, ExternalUpstream>(externalUpstreams.map((e) => [e.id, e]))
  const isDone = (i: { doneAt?: Date | null }) => Boolean(i.doneAt)

  const result: Array<{
    item: ItemSummary
    blockedBy: Array<{ id: string; title: string; status: string; doneAt: Date | null }>
  }> = []
  for (const target of itemSummaries) {
    if (isDone(target)) continue
    const incoming = dependencies.filter((d) => d.toItemId === target.id)
    if (incoming.length === 0) continue
    const blockers: Array<{ id: string; title: string; status: string; doneAt: Date | null }> = []
    for (const e of incoming) {
      const upstreamInternal = itemMap.get(e.fromItemId)
      const upstreamExternal = externalMap.get(e.fromItemId)
      if (upstreamInternal) {
        if (!isDone(upstreamInternal)) {
          blockers.push({
            id: upstreamInternal.id,
            title: upstreamInternal.title,
            status: upstreamInternal.status,
            doneAt: upstreamInternal.doneAt ?? null,
          })
        }
      } else if (upstreamExternal) {
        if (!isDone(upstreamExternal)) {
          blockers.push({
            id: upstreamExternal.id,
            title: `${upstreamExternal.title} (Sprint 外)`,
            status: upstreamExternal.status,
            doneAt: upstreamExternal.doneAt,
          })
        }
      }
    }
    if (blockers.length > 0) result.push({ item: target, blockedBy: blockers })
  }
  return result
}

/**
 * Pre-mortem 用 user message を組み立てる純粋関数 (テスト可能)。
 *
 * AI に「この Sprint が失敗するとしたら何が起こるか?」を想像させ、
 *   - 高リスク 3-5 個 (根拠 + 早期警報 + 緩和策)
 *   - MUST 落ち警戒事項 (DoD が曖昧 / 期限がタイト / 過去類似 retro で落ちた等)
 *   - **依存ブロック** (上流 Item が未完なせいで進めない MUST)
 * を Markdown でまとめさせる。
 */
export function buildPremortemUserMessage(params: {
  sprintName: string
  sprintGoal: string | null
  startDate: string
  endDate: string
  itemSummaries: ItemSummary[]
  dependencies?: DependencyEdge[]
  externalUpstreams?: ExternalUpstream[]
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
  const dependencies = params.dependencies ?? []
  const externalUpstreams = params.externalUpstreams ?? []
  const blocked = detectBlockedItems(params.itemSummaries, dependencies, externalUpstreams)
  const blockedMust = blocked.filter((b) => b.item.isMust)

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

  const blockedSection = (() => {
    if (blocked.length === 0) return ''
    const renderEntry = (b: (typeof blocked)[number]) => {
      const blockerLines = b.blockedBy
        .map((u) => `      - [${u.id.slice(0, 8)}] ${u.title} (status=${u.status})`)
        .join('\n')
      return `  - [${b.item.id.slice(0, 8)}] ${b.item.title}${b.item.isMust ? ' (MUST)' : ''}\n${blockerLines}`
    }
    return [
      '',
      `**🔴 依存ブロック中** (${blocked.length} 件 / うち MUST ${blockedMust.length} 件):`,
      '_これらは上流 Item が未完なため、現時点で着手不可 / 進行不可。Sprint 失敗の有力候補_',
      ...blocked.map(renderEntry),
    ].join('\n')
  })()

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
    `**依存関係**: ${dependencies.length} 件 (blocks)${blocked.length > 0 ? ` / **🔴 現時点で blocked: ${blocked.length} 件 (MUST ${blockedMust.length})**` : ''}`,
    '',
    itemList('全 Item', params.itemSummaries),
    '',
    must.length > 0 ? itemList('⚠ MUST のみ', must) : '',
    blockedSection,
    '',
    '手順:',
    '1. search_docs で過去 90 日の "Retro" / "Recovery" Doc を引き、過去のつまずきパターンを 2-3 個抽出',
    '2. read_items で関連 Item の DoD / description を必要に応じて確認',
    blockedMust.length > 0
      ? '3. **🔴 blocked MUST が存在するため、各上流 Item の現状 (担当 / 残作業) を read_items で必ず確認**'
      : '',
    '4. 以下の構成で Pre-mortem Doc を `create_doc` で保存:',
    `   - title: "Pre-mortem - ${params.sprintName} (${params.startDate})"`,
    '   - body (Markdown):',
    '     - **想定リスク 3-5 件** (各リスク: 兆候 / 影響 / 緩和策の 3 行)',
    '     - **早期警報指標** (この値を見れば気づく KPI / Item 状態)',
    '     - **MUST 落ち警戒** (DoD 未設定 / 期限タイト / 過去類似落ちあり)',
    blocked.length > 0
      ? '     - **依存ブロック** (上掲の blocked 一覧それぞれに対し、上流の動かし方 / 並列作業の余地)'
      : '',
    '     - **冒頭のアクション 3 件** (今 24h で打つ予防の手)',
    '5. 重要リスク (影響大) のうち 1-3 件を `create_item` で Watch List Item として投下',
    '   (status="todo", priority=2, タイトルは "[Watch] <リスク要約>")',
    blockedMust.length > 0
      ? '   ⚠ blocked MUST に対しては必ず 1 件 [Watch] Item を投下 (上流解除のフォローアップ)'
      : '',
    '6. 最後に日本語 3 行で要旨 + 一言コメントを返す',
  ]
    .filter((l) => l !== '')
    .join('\n')
}
