import { z } from 'zod'

/** Template-sourced Doc に掛ける倍率 (>1 でブースト、=1 で等倍)。デフォルト 1.2。 */
export const DEFAULT_TEMPLATE_BOOST = 1.2

/** 結果数のデフォルト上限。HNSW 検索は多めに取って boost 後に切り詰める。 */
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

export const SemanticSearchInputSchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().trim().min(1, '検索語を入力してください').max(500),
  limit: z.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
  templateBoost: z.number().positive().max(5).default(DEFAULT_TEMPLATE_BOOST),
})
export type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>

export interface SearchHit {
  chunkId: string
  docId: string
  chunkIndex: number
  content: string
  title: string
  /** boost 適用後のスコア (高いほど関連、0-1.x 程度) */
  score: number
  /** 生の cosine similarity (0-1、boost 前) */
  similarity: number
  isTemplate: boolean
}
