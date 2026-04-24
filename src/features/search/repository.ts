import 'server-only'

import { sql } from 'drizzle-orm'

import type { Tx } from '@/lib/db/scoped-client'

export interface SemanticRow {
  chunkId: string
  docId: string
  chunkIndex: number
  content: string
  similarity: number
  title: string
  isTemplate: boolean
}

/**
 * pgvector HNSW cosine 検索 (距離昇順)。boost は Service 層で適用する。
 * `fetchLimit` は boost 後に並び替えるため取得側で多めに確保する用 (通常 limit*2)。
 * RLS は doc_chunks ポリシ ("ws members rw") が JOIN 先 docs.workspace_id 経由で
 * 効くため、scoped tx (withUserDb) で呼べば workspace スコープは自動で適用される。
 * ただし index 活用のため WHERE に workspace_id を明示して絞り込む。
 */
export const searchRepository = {
  async semanticHits(
    tx: Tx,
    workspaceId: string,
    queryVector: number[],
    fetchLimit: number,
  ): Promise<SemanticRow[]> {
    const vecLiteral = `[${queryVector.join(',')}]`
    // 注: `<=>` は pgvector の cosine 距離。normalize 済ベクトルなら 1-distance = similarity
    const rows = await tx.execute(sql`
      select
        dc.id          as "chunkId",
        dc.doc_id      as "docId",
        dc.chunk_index as "chunkIndex",
        dc.content     as content,
        1 - (dc.embedding <=> ${vecLiteral}::vector) as similarity,
        d.title        as title,
        (d.source_template_id is not null) as "isTemplate"
      from public.doc_chunks dc
      join public.docs d on d.id = dc.doc_id
      where d.workspace_id = ${workspaceId}::uuid
        and d.deleted_at is null
        and dc.embedding is not null
      order by dc.embedding <=> ${vecLiteral}::vector
      limit ${fetchLimit}
    `)
    // postgres-js は execute で { rows } 風ではなく直接配列を返す
    return (rows as unknown as SemanticRow[]).map((r) => ({
      chunkId: String(r.chunkId),
      docId: String(r.docId),
      chunkIndex: Number(r.chunkIndex),
      content: String(r.content),
      similarity: Number(r.similarity),
      title: String(r.title),
      isTemplate: Boolean(r.isTemplate),
    }))
  },
}
