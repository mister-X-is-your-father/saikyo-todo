import 'server-only'

import { encodeQuery } from '@/lib/ai/embedding'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { searchRepository } from './repository'
import { type SearchHit, SemanticSearchInputSchema } from './schema'

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
      score: r.similarity * (r.isTemplate ? templateBoost : 1),
    }))
    boosted.sort((a, b) => b.score - a.score)
    return ok(boosted.slice(0, limit))
  },
}
