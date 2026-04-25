import 'server-only'

import { and, asc, eq } from 'drizzle-orm'

import { tags } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Tag } from './schema'

export const tagRepository = {
  async insert(tx: Tx, values: typeof tags.$inferInsert): Promise<Tag> {
    const [row] = await tx.insert(tags).values(values).returning()
    if (!row) throw new Error('insertTag returned no row')
    return row as Tag
  },

  async findById(tx: Tx, id: string): Promise<Tag | null> {
    const rows = await tx.select().from(tags).where(eq(tags.id, id)).limit(1)
    return (rows[0] ?? null) as Tag | null
  },

  async findByName(tx: Tx, workspaceId: string, name: string): Promise<Tag | null> {
    const rows = await tx
      .select()
      .from(tags)
      .where(and(eq(tags.workspaceId, workspaceId), eq(tags.name, name)))
      .limit(1)
    return (rows[0] ?? null) as Tag | null
  },

  async listByWorkspace(tx: Tx, workspaceId: string, limit = 500): Promise<Tag[]> {
    const rows = await tx
      .select()
      .from(tags)
      .where(eq(tags.workspaceId, workspaceId))
      .orderBy(asc(tags.name))
      .limit(limit)
    return rows as Tag[]
  },

  async update(tx: Tx, id: string, patch: Partial<typeof tags.$inferInsert>): Promise<Tag | null> {
    const [row] = await tx
      .update(tags)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tags.id, id))
      .returning()
    return (row ?? null) as Tag | null
  },

  async delete(tx: Tx, id: string): Promise<boolean> {
    const rows = await tx.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id })
    return rows.length > 0
  },
}
