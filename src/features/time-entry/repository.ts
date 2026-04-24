import 'server-only'

import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm'

import { timeEntries } from '@/lib/db/schema'
import type { Tx } from '@/lib/db/scoped-client'

import type { TimeEntry } from './schema'

export interface ListTimeEntriesFilter {
  workspaceId: string
  from?: string // ISO date
  to?: string
  limit: number
}

export const timeEntryRepository = {
  async insert(tx: Tx, values: typeof timeEntries.$inferInsert): Promise<TimeEntry> {
    const [row] = await tx.insert(timeEntries).values(values).returning()
    if (!row) throw new Error('insertTimeEntry returned no row')
    return row as TimeEntry
  },

  async findById(tx: Tx, id: string): Promise<TimeEntry | null> {
    const rows = await tx
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.id, id), isNull(timeEntries.deletedAt)))
      .limit(1)
    return (rows[0] ?? null) as TimeEntry | null
  },

  async list(tx: Tx, filter: ListTimeEntriesFilter): Promise<TimeEntry[]> {
    const conds = [eq(timeEntries.workspaceId, filter.workspaceId), isNull(timeEntries.deletedAt)]
    if (filter.from) conds.push(gte(timeEntries.workDate, filter.from))
    if (filter.to) conds.push(lte(timeEntries.workDate, filter.to))
    const rows = await tx
      .select()
      .from(timeEntries)
      .where(and(...conds))
      .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt))
      .limit(filter.limit)
    return rows as TimeEntry[]
  },
}
