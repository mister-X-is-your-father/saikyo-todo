/**
 * Doc の chunk 分割 + embedding + UPSERT。worker (Day 16) が 1 件ずつ呼ぶ。
 *
 * フロー:
 *   1. adminDb で Doc (title + body) を fetch (deleted_at でも fetch して後続で判断)
 *   2. title + body を結合 → chunkText で分割
 *   3. encodeTexts で一括 embedding (multilingual-e5-small, 384次元, normalize 済)
 *   4. Tx 内で doc_chunks を全削除 → 新 chunks を insert (アトミック置換)
 *
 * 削除済み Doc (soft-deleted) は chunk も削除のみ行って終了。
 * 空本文 (trim 後 0 文字) の Doc は chunks を空にして終了。
 */
import 'server-only'

import { eq } from 'drizzle-orm'

import { chunkText } from '@/lib/ai/chunk'
import { encodeTexts } from '@/lib/ai/embedding'
import { docChunks, docs } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

export interface EmbedDocResult {
  docId: string
  chunks: number
  skipped?: 'not_found' | 'soft_deleted' | 'empty'
}

/**
 * DI フック: デフォルトは実 encodeTexts。テストで mock 差替え可能。
 */
export type EncodeTextsFn = (texts: string[]) => Promise<number[][]>

export async function embedDoc(
  docId: string,
  deps: { encoder?: EncodeTextsFn } = {},
): Promise<EmbedDocResult> {
  const encoder = deps.encoder ?? encodeTexts

  const [doc] = await adminDb.select().from(docs).where(eq(docs.id, docId)).limit(1)
  if (!doc) return { docId, chunks: 0, skipped: 'not_found' }
  if (doc.deletedAt) {
    // soft-deleted: chunks も消しておく
    await adminDb.delete(docChunks).where(eq(docChunks.docId, docId))
    return { docId, chunks: 0, skipped: 'soft_deleted' }
  }

  const joined = `${doc.title}\n\n${doc.body ?? ''}`.trim()
  if (joined.length === 0) {
    await adminDb.delete(docChunks).where(eq(docChunks.docId, docId))
    return { docId, chunks: 0, skipped: 'empty' }
  }

  const chunks = chunkText(joined)
  const embeddings = await encoder(chunks)
  if (embeddings.length !== chunks.length) {
    throw new Error(
      `embedDoc: encoder returned ${embeddings.length} vectors for ${chunks.length} chunks`,
    )
  }

  await adminDb.transaction(async (tx) => {
    await tx.delete(docChunks).where(eq(docChunks.docId, docId))
    const rows = chunks.map((content, chunkIndex) => ({
      docId,
      chunkIndex,
      content,
      embedding: embeddings[chunkIndex]!,
    }))
    if (rows.length > 0) {
      await tx.insert(docChunks).values(rows)
    }
  })

  return { docId, chunks: chunks.length }
}
