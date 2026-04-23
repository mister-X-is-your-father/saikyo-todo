import 'server-only'

import { and, asc, eq, isNull, sql } from 'drizzle-orm'

import { commentsOnDocs, commentsOnItems } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { CommentOnDoc, CommentOnItem } from './schema'

export const commentOnItemRepository = {
  async insert(tx: Tx, values: typeof commentsOnItems.$inferInsert): Promise<CommentOnItem> {
    const [row] = await tx.insert(commentsOnItems).values(values).returning()
    if (!row) throw new Error('insertCommentOnItem returned no row')
    return row as CommentOnItem
  },

  async findById(tx: Tx, id: string): Promise<CommentOnItem | null> {
    const rows = await tx
      .select()
      .from(commentsOnItems)
      .where(and(eq(commentsOnItems.id, id), isNull(commentsOnItems.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as CommentOnItem | null
  },

  async listByItem(tx: Tx, itemId: string, limit = 500): Promise<CommentOnItem[]> {
    const rows = await tx
      .select()
      .from(commentsOnItems)
      .where(and(eq(commentsOnItems.itemId, itemId), isNull(commentsOnItems.deletedAt)))
      .orderBy(asc(commentsOnItems.createdAt))
      .limit(limit)
    return rows as CommentOnItem[]
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof commentsOnItems.$inferInsert>,
  ): Promise<CommentOnItem | null> {
    const [row] = await tx
      .update(commentsOnItems)
      .set({
        ...patch,
        version: sql`${commentsOnItems.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commentsOnItems.id, id),
          eq(commentsOnItems.version, expectedVersion),
          isNull(commentsOnItems.deletedAt),
        ),
      )
      .returning()
    return (row ?? null) as CommentOnItem | null
  },

  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<CommentOnItem | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },
}

export const commentOnDocRepository = {
  async insert(tx: Tx, values: typeof commentsOnDocs.$inferInsert): Promise<CommentOnDoc> {
    const [row] = await tx.insert(commentsOnDocs).values(values).returning()
    if (!row) throw new Error('insertCommentOnDoc returned no row')
    return row as CommentOnDoc
  },

  async findById(tx: Tx, id: string): Promise<CommentOnDoc | null> {
    const rows = await tx
      .select()
      .from(commentsOnDocs)
      .where(and(eq(commentsOnDocs.id, id), isNull(commentsOnDocs.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as CommentOnDoc | null
  },

  async listByDoc(tx: Tx, docId: string, limit = 500): Promise<CommentOnDoc[]> {
    const rows = await tx
      .select()
      .from(commentsOnDocs)
      .where(and(eq(commentsOnDocs.docId, docId), isNull(commentsOnDocs.deletedAt)))
      .orderBy(asc(commentsOnDocs.createdAt))
      .limit(limit)
    return rows as CommentOnDoc[]
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof commentsOnDocs.$inferInsert>,
  ): Promise<CommentOnDoc | null> {
    const [row] = await tx
      .update(commentsOnDocs)
      .set({
        ...patch,
        version: sql`${commentsOnDocs.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(commentsOnDocs.id, id),
          eq(commentsOnDocs.version, expectedVersion),
          isNull(commentsOnDocs.deletedAt),
        ),
      )
      .returning()
    return (row ?? null) as CommentOnDoc | null
  },

  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<CommentOnDoc | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },
}
