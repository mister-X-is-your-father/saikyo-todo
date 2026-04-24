import 'server-only'

import { and, asc, eq, isNull, sql } from 'drizzle-orm'

import { templateItems, templates } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { Template, TemplateItem } from './schema'

export const templateRepository = {
  async insert(tx: Tx, values: typeof templates.$inferInsert): Promise<Template> {
    const [row] = await tx.insert(templates).values(values).returning()
    if (!row) throw new Error('insertTemplate returned no row')
    return row as Template
  },

  async findById(tx: Tx, id: string): Promise<Template | null> {
    const rows = await tx
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), isNull(templates.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as Template | null
  },

  async list(tx: Tx, filter: { workspaceId: string; kind?: 'manual' | 'recurring' }) {
    const conds = [eq(templates.workspaceId, filter.workspaceId), isNull(templates.deletedAt)]
    if (filter.kind) conds.push(eq(templates.kind, filter.kind))
    const rows = await tx
      .select()
      .from(templates)
      .where(and(...conds))
      .orderBy(asc(templates.name))
    return rows as Template[]
  },

  async updateWithLock(
    tx: Tx,
    id: string,
    expectedVersion: number,
    patch: Partial<typeof templates.$inferInsert>,
  ): Promise<Template | null> {
    const [row] = await tx
      .update(templates)
      .set({
        ...patch,
        version: sql`${templates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(templates.id, id),
          eq(templates.version, expectedVersion),
          isNull(templates.deletedAt),
        ),
      )
      .returning()
    return (row ?? null) as Template | null
  },

  async softDelete(tx: Tx, id: string, expectedVersion: number): Promise<Template | null> {
    return await this.updateWithLock(tx, id, expectedVersion, { deletedAt: new Date() })
  },
}

export const templateItemRepository = {
  async insert(tx: Tx, values: typeof templateItems.$inferInsert): Promise<TemplateItem> {
    const [row] = await tx.insert(templateItems).values(values).returning()
    if (!row) throw new Error('insertTemplateItem returned no row')
    return row as TemplateItem
  },

  async findById(tx: Tx, id: string): Promise<TemplateItem | null> {
    const rows = await tx.select().from(templateItems).where(eq(templateItems.id, id)).limit(1)
    return (rows[0] ?? null) as TemplateItem | null
  },

  async listByTemplate(tx: Tx, templateId: string): Promise<TemplateItem[]> {
    const rows = await tx
      .select()
      .from(templateItems)
      .where(eq(templateItems.templateId, templateId))
      .orderBy(asc(templateItems.parentPath), asc(templateItems.createdAt))
    return rows as TemplateItem[]
  },

  async update(
    tx: Tx,
    id: string,
    patch: Partial<typeof templateItems.$inferInsert>,
  ): Promise<TemplateItem | null> {
    const [row] = await tx
      .update(templateItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(templateItems.id, id))
      .returning()
    return (row ?? null) as TemplateItem | null
  },

  async remove(tx: Tx, id: string): Promise<boolean> {
    const [row] = await tx.delete(templateItems).where(eq(templateItems.id, id)).returning()
    return Boolean(row)
  },
}
