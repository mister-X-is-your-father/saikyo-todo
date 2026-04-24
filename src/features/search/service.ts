import 'server-only'

import { encodeQuery } from '@/lib/ai/embedding'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { searchRepository } from './repository'
import {
  FullTextSearchInputSchema,
  HybridSearchInputSchema,
  RRF_K,
  type SearchHit,
  SemanticSearchInputSchema,
} from './schema'

/** Service レベル DI: テストで `encodeQuery` を差し替え可能。 */
export type QueryEncoder = (q: string) => Promise<number[]>

export const searchService = {
  /**
   * Semantic 検索: query → embedding → pgvector HNSW cosine → Template boost 適用。
   *
   * 1. encoder で query を 384次元ベクトル化 ("query: " prefix 付き e5)
   * 2. repository が HNSW で上位を取得 (boost 前、limit*2 確保)
   * 3. Template-sourced Doc は score に `templateBoost` を掛ける
   * 4. boost 後 score 降順で limit 件返す
   */
  async semantic(
    input: unknown,
    deps: { encoder?: QueryEncoder } = {},
  ): Promise<Result<SearchHit[]>> {
    const parsed = SemanticSearchInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, query, limit, templateBoost } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')

    const encoder = deps.encoder ?? encodeQuery
    const queryVector = await encoder(query)

    const rawHits = await withUserDb(user.id, async (tx) =>
      searchRepository.semanticHits(tx, workspaceId, queryVector, limit * 2),
    )

    const boosted: SearchHit[] = rawHits.map((r) => ({
      ...r,
      textSimilarity: 0,
      score: r.similarity * (r.isTemplate ? templateBoost : 1),
    }))
    boosted.sort((a, b) => b.score - a.score)
    return ok(boosted.slice(0, limit))
  },

  /**
   * Full-Text 検索 (pg_trgm word_similarity)。Template boost 適用後に降順で返す。
   */
  async fullText(input: unknown): Promise<Result<SearchHit[]>> {
    const parsed = FullTextSearchInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, query, limit, templateBoost } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')

    const rawHits = await withUserDb(user.id, async (tx) =>
      searchRepository.fullTextHits(tx, workspaceId, query, limit * 2),
    )

    const boosted: SearchHit[] = rawHits.map((r) => ({
      ...r,
      similarity: 0,
      score: r.textSimilarity * (r.isTemplate ? templateBoost : 1),
    }))
    boosted.sort((a, b) => b.score - a.score)
    return ok(boosted.slice(0, limit))
  },

  /**
   * Hybrid 検索: semantic + fullText の結果を RRF (Reciprocal Rank Fusion) で fusion。
   *
   *   score_rrf = 1/(k + rank_semantic) + 1/(k + rank_fulltext)
   *
   * rank は 1-based で、片方のリストにしかないチャンクはそちら側のみ加算される。
   * 最後に Template boost を rrf score に乗せる (semantic のみの実装と同じポリシ)。
   */
  async hybrid(
    input: unknown,
    deps: { encoder?: QueryEncoder } = {},
  ): Promise<Result<SearchHit[]>> {
    const parsed = HybridSearchInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, query, limit, templateBoost } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')

    const encoder = deps.encoder ?? encodeQuery
    const queryVector = await encoder(query)

    const fetchLimit = limit * 2
    const [semanticRows, fullTextRows] = await withUserDb(user.id, async (tx) =>
      Promise.all([
        searchRepository.semanticHits(tx, workspaceId, queryVector, fetchLimit),
        searchRepository.fullTextHits(tx, workspaceId, query, fetchLimit),
      ]),
    )

    // chunkId をキーに統合。rank は 1-based。
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

    // Template boost を RRF score に乗せる
    const hits = [...merged.values()].map((h) => ({
      ...h,
      score: h.score * (h.isTemplate ? templateBoost : 1),
    }))
    hits.sort((a, b) => b.score - a.score)
    return ok(hits.slice(0, limit))
  },
}
