/**
 * searchService integration test。実 Supabase + RLS + pgvector を使い、
 * encodeQuery だけ DI で mock (実モデルを避ける)。
 *
 * 埋め込みベクトルは「単位ベクトル (1軸だけ 1、他 0)」を使って cosine 結果を予測可能にする。
 * 384次元の最初 2 軸を使い分けて Template doc / 通常 doc / 非関連 doc を区別する。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { EMBEDDING_DIM } from '@/lib/ai/embedding'
import { db } from '@/lib/db/client'
import { docChunks, docs, templates } from '@/lib/db/schema'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { searchService } from './service'

/** 指定軸だけ 1.0、他 0 の単位ベクトル (長さ 384)。 */
function unitVector(axis: number): number[] {
  const v = new Array(EMBEDDING_DIM).fill(0) as number[]
  v[axis] = 1
  return v
}

describe('searchService.semantic', () => {
  let wsId: string
  let userId: string
  let email: string
  let cleanup: () => Promise<void>
  let templateId: string
  let templateDocId: string
  let normalDocId: string
  let unrelatedDocId: string

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('search-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)

    // Template を 1 つ作る (sourceTemplateId 経由で Template 起源を作るため)
    const [tmpl] = await db
      .insert(templates)
      .values({
        workspaceId: wsId,
        name: 'test template',
        kind: 'manual',
        createdBy: userId,
      })
      .returning()
    templateId = tmpl!.id

    // template 起源 Doc (axis=1 の vector)
    const [td] = await db
      .insert(docs)
      .values({
        workspaceId: wsId,
        title: 'template-doc タイトル',
        body: 'template 由来の doc です',
        sourceTemplateId: templateId,
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    templateDocId = td!.id
    await db.insert(docChunks).values({
      docId: templateDocId,
      chunkIndex: 0,
      content: 'template 由来の chunk',
      embedding: unitVector(1),
    })

    // 通常 Doc (axis=1 の vector、template-doc と同等の similarity を狙う)
    const [nd] = await db
      .insert(docs)
      .values({
        workspaceId: wsId,
        title: 'normal-doc タイトル',
        body: '普通の doc',
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    normalDocId = nd!.id
    await db.insert(docChunks).values({
      docId: normalDocId,
      chunkIndex: 0,
      content: '通常の chunk',
      embedding: unitVector(1),
    })

    // 無関係 Doc (axis=2 の vector、query と直交 similarity=0)
    const [ud] = await db
      .insert(docs)
      .values({
        workspaceId: wsId,
        title: 'unrelated',
        body: '別トピック',
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    unrelatedDocId = ud!.id
    await db.insert(docChunks).values({
      docId: unrelatedDocId,
      chunkIndex: 0,
      content: '直交 chunk',
      embedding: unitVector(2),
    })
  })

  afterAll(async () => {
    await cleanup()
  })

  const queryEncoder = async () => unitVector(1) // axis=1 に合わせたクエリ vector

  it('workspace 内から cosine similarity 降順で返す', async () => {
    const r = await searchService.semantic(
      { workspaceId: wsId, query: 'なんでも', limit: 10 },
      { encoder: queryEncoder },
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return

    expect(r.value).toHaveLength(3)
    // 上位 2 件は axis=1 の docs (similarity=1)、3 件目は axis=2 (similarity=0)
    expect(r.value[0]!.similarity).toBeCloseTo(1, 5)
    expect(r.value[1]!.similarity).toBeCloseTo(1, 5)
    expect(r.value[2]!.similarity).toBeCloseTo(0, 5)
    expect(r.value[2]!.docId).toBe(unrelatedDocId)
  })

  it('Template 起源の Doc は templateBoost で先頭に来る', async () => {
    const r = await searchService.semantic(
      {
        workspaceId: wsId,
        query: 'なんでも',
        limit: 10,
        templateBoost: 1.5,
      },
      { encoder: queryEncoder },
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return

    // 先頭は Template 起源 Doc
    expect(r.value[0]!.docId).toBe(templateDocId)
    expect(r.value[0]!.isTemplate).toBe(true)
    expect(r.value[0]!.score).toBeCloseTo(1.5, 5) // 1 * 1.5
    // 2 番目は通常 Doc (score=similarity=1)
    expect(r.value[1]!.docId).toBe(normalDocId)
    expect(r.value[1]!.score).toBeCloseTo(1, 5)
  })

  it('templateBoost=1.0 (ブースト無効) なら順位は similarity だけで決まる', async () => {
    const r = await searchService.semantic(
      { workspaceId: wsId, query: '何か', limit: 10, templateBoost: 1.0 },
      { encoder: queryEncoder },
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 同 similarity の 2 件はどっちが先でも OK (ソート安定性は未規定)。isTemplate boost 無しなのを確認
    const top2Ids = new Set([r.value[0]!.docId, r.value[1]!.docId])
    expect(top2Ids).toEqual(new Set([templateDocId, normalDocId]))
  })

  it('limit を超える結果数は切り詰める', async () => {
    const r = await searchService.semantic(
      { workspaceId: wsId, query: 'x', limit: 1 },
      { encoder: queryEncoder },
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toHaveLength(1)
  })

  it('他 workspace の doc は返らない (RLS + 明示的 WHERE の二重防御)', async () => {
    // 別 workspace + そこにも doc+chunk を仕込む
    const other = await createTestUserAndWorkspace('search-other')
    try {
      const [otherDoc] = await db
        .insert(docs)
        .values({
          workspaceId: other.wsId,
          title: 'other ws doc',
          body: 'x',
          createdByActorType: 'user',
          createdByActorId: other.userId,
        })
        .returning()
      await db.insert(docChunks).values({
        docId: otherDoc!.id,
        chunkIndex: 0,
        content: '他ws chunk',
        embedding: unitVector(1),
      })

      const r = await searchService.semantic(
        { workspaceId: wsId, query: 'x' },
        { encoder: queryEncoder },
      )
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.every((h) => h.docId !== otherDoc!.id)).toBe(true)
      }
    } finally {
      await other.cleanup()
    }
  })

  it('空文字クエリは ValidationError', async () => {
    const r = await searchService.semantic(
      { workspaceId: wsId, query: '   ' },
      { encoder: queryEncoder },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('VALIDATION')
  })

  it('soft-deleted doc の chunk は結果から除外', async () => {
    // normalDoc を soft delete
    const { eq } = await import('drizzle-orm')
    await db.update(docs).set({ deletedAt: new Date() }).where(eq(docs.id, normalDocId))
    try {
      const r = await searchService.semantic(
        { workspaceId: wsId, query: 'x', limit: 10 },
        { encoder: queryEncoder },
      )
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.every((h) => h.docId !== normalDocId)).toBe(true)
      }
    } finally {
      // 他テストとの独立性のため restore (beforeAll で作ったため)
      await db.update(docs).set({ deletedAt: null }).where(eq(docs.id, normalDocId))
    }
  })
})
