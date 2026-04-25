/**
 * Write tools: Agent が workspace に Item / Comment を作成するための破壊ツール。
 *
 * 方針:
 *   - adminDb で実行 (Agent = service_role 相当)
 *   - 作成行の `createdByActorType` / `authorActorType` は 'agent'、actorId は ctx.agentId
 *   - audit_log に actor_type='agent' の create エントリを残す
 *   - workspace_id は ctx から強制 (Agent 入力に依存しない)
 *   - 削除系 (delete_*) はここに入れない (MVP 方針)
 */
import 'server-only'

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { recordAudit } from '@/lib/audit'
import { fullPathOf } from '@/lib/db/ltree-path'
import { agentDecomposeProposals } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { enqueueJob } from '@/lib/jobs/queue'

import { commentOnItemRepository } from '@/features/comment/repository'
import { docRepository } from '@/features/doc/repository'
import { itemRepository } from '@/features/item/repository'

import type { AgentToolFactory } from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const AgentCreateItemSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).default(''),
    status: z.string().min(1).default('todo'),
    parentItemId: z.string().uuid().nullish(),
    startDate: z.string().regex(ISO_DATE).nullish(),
    dueDate: z.string().regex(ISO_DATE).nullish(),
    isMust: z.boolean().default(false),
    dod: z.string().max(2000).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.isMust && (!v.dod || v.dod.trim().length === 0)) {
      ctx.addIssue({ code: 'custom', path: ['dod'], message: 'MUST には DoD が必要です' })
    }
    if (v.startDate && v.dueDate && v.startDate > v.dueDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: '期限は開始日以降にしてください' })
    }
  })

const AgentWriteCommentSchema = z.object({
  itemId: z.string().uuid(),
  body: z.string().min(1).max(5000),
})

const AgentCreateDocSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(20000),
})

function jsonError(message: string, details?: unknown): string {
  return JSON.stringify({ ok: false, error: message, details: details ?? null })
}
function jsonOk(data: unknown): string {
  return JSON.stringify({ ok: true, ...(data as Record<string, unknown>) })
}

// --- propose_child_item -------------------------------------------------

const AgentProposeChildItemSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).default(''),
    isMust: z.boolean().default(false),
    dod: z.string().max(2000).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.isMust && (!v.dod || v.dod.trim().length === 0)) {
      ctx.addIssue({ code: 'custom', path: ['dod'], message: 'MUST には DoD が必要です' })
    }
  })

export const proposeChildItemTool: AgentToolFactory = {
  definition: {
    name: 'propose_child_item',
    description:
      '【AI 分解 staging mode 専用】子タスクの提案を 1 件 staging テーブルに置く。' +
      '即時には items に作成されず、ユーザーが UI で採用するまで保留される。' +
      'decompose の対象親 Item は ctx 側で固定されているので parentItemId 引数は不要。' +
      '3〜5 回呼び出して候補を出すこと。MUST=true なら dod 必須。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'タイトル (1-500 文字)。' },
        description: { type: 'string', description: '説明 (省略可)。' },
        isMust: {
          type: 'boolean',
          description: 'true にする場合 dod 必須。既定 false。',
        },
        dod: { type: 'string', description: 'Definition of Done (MUST なら必須)。' },
      },
      required: ['title'],
    },
  },
  build(ctx) {
    return async (input) => {
      if (!ctx.decomposeParentItemId) {
        return jsonError(
          'propose_child_item is only available in decompose staging mode (no parent set)',
        )
      }
      const parsed = AgentProposeChildItemSchema.safeParse(input ?? {})
      if (!parsed.success) {
        return jsonError('validation failed', parsed.error.flatten())
      }
      const v = parsed.data

      const result = await adminDb.transaction(async (tx) => {
        const parent = await itemRepository.findById(tx, ctx.decomposeParentItemId!)
        if (!parent) return { ok: false as const, reason: 'parent_not_found' }
        if (parent.workspaceId !== ctx.workspaceId) {
          return { ok: false as const, reason: 'parent_not_in_workspace' }
        }
        // 直近の sort_order を引いて +1 (Agent が呼んだ順を保持)
        const existing = await tx
          .select({ max: sql<number>`coalesce(max(${agentDecomposeProposals.sortOrder}), -1)` })
          .from(agentDecomposeProposals)
          .where(eq(agentDecomposeProposals.parentItemId, parent.id))
        const nextOrder = (existing[0]?.max ?? -1) + 1
        const [row] = await tx
          .insert(agentDecomposeProposals)
          .values({
            workspaceId: ctx.workspaceId,
            parentItemId: parent.id,
            agentInvocationId: ctx.agentInvocationId ?? null,
            title: v.title,
            description: v.description,
            isMust: v.isMust,
            dod: v.dod ?? null,
            statusProposal: 'pending',
            sortOrder: nextOrder,
          })
          .returning()
        if (!row) return { ok: false as const, reason: 'insert_failed' }
        await recordAudit(tx, {
          workspaceId: ctx.workspaceId,
          actorType: 'agent',
          actorId: ctx.agentId,
          targetType: 'agent_decompose_proposal',
          targetId: row.id,
          action: 'create',
          after: { id: row.id, title: row.title, parentItemId: parent.id },
        })
        return { ok: true as const, proposalId: row.id, title: row.title }
      })

      if (!result.ok) return jsonError(result.reason)
      return jsonOk({ proposalId: result.proposalId, title: result.title, status: 'pending' })
    }
  },
}

// --- create_item --------------------------------------------------------

export const createItemTool: AgentToolFactory = {
  definition: {
    name: 'create_item',
    description:
      '新しい Item (TODO / タスク) をこの workspace に作成する。MUST=true のときは dod 必須。' +
      'parentItemId を指定すると、その Item の子として parent_path を自動設定する (分解結果に使う)。' +
      '作成者は実行中の Agent 本人。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'タイトル (1-500 文字)。' },
        description: { type: 'string', description: '説明 (省略可)。' },
        status: { type: 'string', description: 'status key (既定 "todo")。' },
        isMust: {
          type: 'boolean',
          description: 'true にする場合 dod 必須。既定 false。',
        },
        dod: { type: 'string', description: 'Definition of Done (MUST なら必須)。' },
        startDate: { type: 'string', description: 'ISO 日付 YYYY-MM-DD。' },
        dueDate: { type: 'string', description: 'ISO 日付 YYYY-MM-DD。' },
        parentItemId: {
          type: 'string',
          description: '親 Item の id (UUID)。指定時はその子として作成される。省略で root。',
        },
      },
      required: ['title'],
    },
  },
  build(ctx) {
    return async (input) => {
      const parsed = AgentCreateItemSchema.safeParse(input ?? {})
      if (!parsed.success) {
        return jsonError('validation failed', parsed.error.flatten())
      }
      const v = parsed.data

      const result = await adminDb.transaction(async (tx) => {
        let parentPath = ''
        if (v.parentItemId) {
          const parent = await itemRepository.findById(tx, v.parentItemId)
          if (!parent) {
            return { ok: false as const, reason: 'parent_not_found' }
          }
          if (parent.workspaceId !== ctx.workspaceId) {
            return { ok: false as const, reason: 'parent_not_in_workspace' }
          }
          parentPath = fullPathOf({ id: parent.id, parentPath: parent.parentPath })
        }

        const item = await itemRepository.insert(tx, {
          workspaceId: ctx.workspaceId,
          title: v.title,
          description: v.description,
          status: v.status,
          parentPath,
          startDate: v.startDate ?? null,
          dueDate: v.dueDate ?? null,
          isMust: v.isMust,
          dod: v.dod ?? null,
          createdByActorType: 'agent',
          createdByActorId: ctx.agentId,
        })
        await recordAudit(tx, {
          workspaceId: ctx.workspaceId,
          actorType: 'agent',
          actorId: ctx.agentId,
          targetType: 'item',
          targetId: item.id,
          action: 'create',
          after: {
            id: item.id,
            title: item.title,
            isMust: item.isMust,
            status: item.status,
            parentItemId: v.parentItemId ?? null,
          },
        })
        return { ok: true as const, item }
      })

      if (!result.ok) return jsonError(result.reason)
      return jsonOk({
        itemId: result.item.id,
        title: result.item.title,
        status: result.item.status,
        isMust: result.item.isMust,
        parentPath: result.item.parentPath,
      })
    }
  },
}

// --- write_comment ------------------------------------------------------

export const writeCommentTool: AgentToolFactory = {
  definition: {
    name: 'write_comment',
    description:
      '指定 Item にコメントを投稿する (Agent 本人の発言として記録)。itemId は read_items/search_items で得た id を使う。',
    input_schema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'コメント対象 Item の id (UUID)。' },
        body: { type: 'string', description: 'コメント本文 (1-5000 文字)。' },
      },
      required: ['itemId', 'body'],
    },
  },
  build(ctx) {
    return async (input) => {
      const parsed = AgentWriteCommentSchema.safeParse(input ?? {})
      if (!parsed.success) {
        return jsonError('validation failed', parsed.error.flatten())
      }
      const { itemId, body } = parsed.data

      const result = await adminDb.transaction(async (tx) => {
        const item = await itemRepository.findById(tx, itemId)
        if (!item) return { ok: false as const, reason: 'item_not_found' }
        if (item.workspaceId !== ctx.workspaceId) {
          return { ok: false as const, reason: 'item_not_in_workspace' }
        }
        const comment = await commentOnItemRepository.insert(tx, {
          itemId: item.id,
          body,
          authorActorType: 'agent',
          authorActorId: ctx.agentId,
        })
        await recordAudit(tx, {
          workspaceId: ctx.workspaceId,
          actorType: 'agent',
          actorId: ctx.agentId,
          targetType: 'comment_on_item',
          targetId: comment.id,
          action: 'create',
          after: { commentId: comment.id, itemId: item.id },
        })
        return { ok: true as const, commentId: comment.id, itemId: item.id }
      })

      if (!result.ok) return jsonError(result.reason)
      return jsonOk({ commentId: result.commentId, itemId: result.itemId })
    }
  },
}

// --- create_doc ---------------------------------------------------------

export const createDocTool: AgentToolFactory = {
  definition: {
    name: 'create_doc',
    description:
      '調査結果を Doc としてこの workspace に保存する。Markdown 可。作成後 embedding ジョブ' +
      'が自動起動するので、次回以降 search_docs でヒットする。作成者は実行中の Agent 本人。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Doc タイトル (1-500 文字)。' },
        body: { type: 'string', description: 'Doc 本文 (Markdown 可、1-20000 文字)。' },
      },
      required: ['title', 'body'],
    },
  },
  build(ctx) {
    return async (input) => {
      const parsed = AgentCreateDocSchema.safeParse(input ?? {})
      if (!parsed.success) {
        return jsonError('validation failed', parsed.error.flatten())
      }
      const { title, body } = parsed.data

      const doc = await adminDb.transaction(async (tx) => {
        const row = await docRepository.insert(tx, {
          workspaceId: ctx.workspaceId,
          title,
          body,
          sourceTemplateId: null,
          createdByActorType: 'agent',
          createdByActorId: ctx.agentId,
        })
        await recordAudit(tx, {
          workspaceId: ctx.workspaceId,
          actorType: 'agent',
          actorId: ctx.agentId,
          targetType: 'doc',
          targetId: row.id,
          action: 'create',
          after: { id: row.id, title: row.title },
        })
        return row
      })
      // docService.create と同様、Tx commit 後に embedding ジョブ送信 (失敗しても doc 作成は成立)
      await enqueueJob('doc-embed', { docId: doc.id })

      return jsonOk({ docId: doc.id, title: doc.title })
    }
  },
}
