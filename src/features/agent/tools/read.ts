/**
 * Read-only tools: Agent が workspace の状態を取得するための非破壊ツール。
 *
 * 全ツール共通:
 *   - adminDb で実行 (Agent は service_role 相当)
 *   - workspace_id は ctx から強制挿入 (Agent 入力に依存しない = 越境不可)
 *   - 返り値は Anthropic tool_result の content に入る string (JSON シリアライズ済)
 */
import 'server-only'

import { and, asc, desc, eq, ilike, isNull, or } from 'drizzle-orm'

import { encodeQuery as defaultEncodeQuery } from '@/lib/ai/embedding'
import { items } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { docRepository } from '@/features/doc/repository'
import { itemRepository } from '@/features/item/repository'
import { searchRepository } from '@/features/search/repository'
import type { SearchHit } from '@/features/search/schema'
import { RRF_K } from '@/features/search/schema'

import type { AgentToolFactory } from './types'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const DOC_BODY_SNIPPET_LEN = 400
const TEMPLATE_BOOST = 1.2

function clampLimit(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}

function compactJson(v: unknown): string {
  return JSON.stringify(v)
}

// --- read_items ---------------------------------------------------------

export const readItemsTool: AgentToolFactory = {
  definition: {
    name: 'read_items',
    description:
      'この workspace の Item (TODO / タスク) を一覧取得する。status や isMust で絞り込める。',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description:
            'status key で絞り込み (例: "todo", "in_progress", "done")。省略で全 status 対象。',
        },
        isMust: {
          type: 'boolean',
          description: 'true なら MUST のみ、false なら MUST 以外のみ。',
        },
        limit: {
          type: 'number',
          description: `返す件数上限 (既定 ${DEFAULT_LIMIT}, 最大 ${MAX_LIMIT})。`,
        },
      },
    },
  },
  build(ctx) {
    return async (input) => {
      const payload = (input ?? {}) as { status?: string; isMust?: boolean; limit?: number }
      const limit = clampLimit(payload.limit)
      const rows = await adminDb.transaction((tx) =>
        itemRepository.list(tx, {
          workspaceId: ctx.workspaceId,
          status: payload.status,
          isMust: typeof payload.isMust === 'boolean' ? payload.isMust : undefined,
          limit,
        }),
      )
      const simplified = rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        isMust: r.isMust,
        dueDate: r.dueDate,
        parentPath: r.parentPath,
        description: r.description,
      }))
      return compactJson({ count: simplified.length, items: simplified })
    }
  },
}

// --- read_docs ----------------------------------------------------------

export const readDocsTool: AgentToolFactory = {
  definition: {
    name: 'read_docs',
    description:
      'この workspace の Doc (調査メモ・議事録等) を一覧取得する。本文は先頭のみ返す (全文は search_docs で取得)。',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: `返す件数上限 (既定 ${DEFAULT_LIMIT}, 最大 ${MAX_LIMIT})。`,
        },
      },
    },
  },
  build(ctx) {
    return async (input) => {
      const payload = (input ?? {}) as { limit?: number }
      const limit = clampLimit(payload.limit)
      const rows = await adminDb.transaction((tx) =>
        docRepository.list(tx, { workspaceId: ctx.workspaceId, limit }),
      )
      const simplified = rows.map((d) => ({
        id: d.id,
        title: d.title,
        bodyHead: d.body.slice(0, DOC_BODY_SNIPPET_LEN),
        isTemplateSourced: d.sourceTemplateId !== null,
        updatedAt: d.updatedAt,
      }))
      return compactJson({ count: simplified.length, docs: simplified })
    }
  },
}

// --- search_items -------------------------------------------------------

export const searchItemsTool: AgentToolFactory = {
  definition: {
    name: 'search_items',
    description:
      'タイトルと description に対する部分一致検索 (Item 用、大文字小文字無視)。RAG ではなく単純 ILIKE。',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索文字列 (1-200 文字)' },
        limit: { type: 'number', description: `既定 ${DEFAULT_LIMIT}, 最大 ${MAX_LIMIT}。` },
      },
      required: ['query'],
    },
  },
  build(ctx) {
    return async (input) => {
      const payload = (input ?? {}) as { query?: string; limit?: number }
      const q = typeof payload.query === 'string' ? payload.query.trim() : ''
      if (q.length === 0) {
        return compactJson({ error: 'query is required' })
      }
      if (q.length > 200) {
        return compactJson({ error: 'query too long (max 200 chars)' })
      }
      const limit = clampLimit(payload.limit)
      const needle = `%${q.replace(/[%_\\]/g, '\\$&')}%`
      const rows = await adminDb.transaction(async (tx) =>
        tx
          .select({
            id: items.id,
            title: items.title,
            description: items.description,
            status: items.status,
            isMust: items.isMust,
            dueDate: items.dueDate,
          })
          .from(items)
          .where(
            and(
              eq(items.workspaceId, ctx.workspaceId),
              isNull(items.deletedAt),
              or(ilike(items.title, needle), ilike(items.description, needle)),
            ),
          )
          .orderBy(desc(items.isMust), asc(items.createdAt))
          .limit(limit),
      )
      return compactJson({ count: rows.length, items: rows })
    }
  },
}

// --- search_docs (hybrid RRF, agent-scoped) -----------------------------

export interface SearchDocsToolDeps {
  encoder?: (q: string) => Promise<number[]>
}

export function buildSearchDocsTool(deps: SearchDocsToolDeps = {}): AgentToolFactory {
  const encoder = deps.encoder ?? defaultEncodeQuery
  return {
    definition: {
      name: 'search_docs',
      description:
        'Doc 本文の Hybrid 検索 (意味検索 + 全文検索 を RRF で融合)。Template 由来 Doc は加重。最も関連の深い chunk を返す。',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '調べたい話題 (1-500 文字)' },
          limit: { type: 'number', description: `既定 ${DEFAULT_LIMIT}, 最大 ${MAX_LIMIT}。` },
        },
        required: ['query'],
      },
    },
    build(ctx) {
      return async (input) => {
        const payload = (input ?? {}) as { query?: string; limit?: number }
        const query = typeof payload.query === 'string' ? payload.query.trim() : ''
        if (query.length === 0) return compactJson({ error: 'query is required' })
        if (query.length > 500) return compactJson({ error: 'query too long (max 500 chars)' })
        const limit = clampLimit(payload.limit)

        const queryVector = await encoder(query)
        const fetchLimit = limit * 2

        const [semanticRows, fullTextRows] = await adminDb.transaction(async (tx) =>
          Promise.all([
            searchRepository.semanticHits(tx, ctx.workspaceId, queryVector, fetchLimit),
            searchRepository.fullTextHits(tx, ctx.workspaceId, query, fetchLimit),
          ]),
        )

        // RRF merge (searchService.hybrid と同じロジック)
        const merged = new Map<string, SearchHit>()
        semanticRows.forEach((row, i) => {
          const rrf = 1 / (RRF_K + (i + 1))
          merged.set(row.chunkId, {
            chunkId: row.chunkId,
            docId: row.docId,
            chunkIndex: row.chunkIndex,
            content: row.content,
            title: row.title,
            isTemplate: row.isTemplate,
            similarity: row.similarity,
            textSimilarity: 0,
            score: rrf,
          })
        })
        fullTextRows.forEach((row, i) => {
          const rrf = 1 / (RRF_K + (i + 1))
          const existing = merged.get(row.chunkId)
          if (existing) {
            existing.textSimilarity = row.textSimilarity
            existing.score += rrf
          } else {
            merged.set(row.chunkId, {
              chunkId: row.chunkId,
              docId: row.docId,
              chunkIndex: row.chunkIndex,
              content: row.content,
              title: row.title,
              isTemplate: row.isTemplate,
              similarity: 0,
              textSimilarity: row.textSimilarity,
              score: rrf,
            })
          }
        })

        const hits = [...merged.values()]
          .map((h) => ({ ...h, score: h.score * (h.isTemplate ? TEMPLATE_BOOST : 1) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map((h) => ({
            docId: h.docId,
            title: h.title,
            chunkIndex: h.chunkIndex,
            content: h.content,
            score: Number(h.score.toFixed(4)),
            isTemplate: h.isTemplate,
          }))

        return compactJson({ count: hits.length, hits })
      }
    },
  }
}

// 既定 encoder 版 (実利用はこちら)
export const searchDocsTool: AgentToolFactory = buildSearchDocsTool()
