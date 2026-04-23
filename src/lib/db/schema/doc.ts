/**
 * Doc 本体 + chunk 単位の embedding (multilingual-e5-small 384次元)。
 * MVP は chunk ベースの semantic search を採用。
 */
import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { vector } from '../custom-types'
import { createdByActor, id, mutationMarkers, timestamps } from './_shared'
import { templates } from './template'
import { workspaces } from './workspace'

export const docs = pgTable(
  'docs',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    sourceTemplateId: uuid('source_template_id').references(() => templates.id, {
      onDelete: 'set null',
    }),
    ...createdByActor,
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [index('docs_workspace_idx').on(t.workspaceId)],
)

export const docChunks = pgTable(
  'doc_chunks',
  {
    id: id(),
    docId: uuid('doc_id')
      .notNull()
      .references(() => docs.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    embedding: vector(384)('embedding'),
    ...timestamps,
  },
  (t) => [
    index('doc_chunks_doc_idx').on(t.docId),
    // HNSW index は手書き SQL マイグレーションで作成 (Drizzle Kit は hnsw 未対応)
  ],
)

export type Doc = typeof docs.$inferSelect
export type NewDoc = typeof docs.$inferInsert
export type DocChunk = typeof docChunks.$inferSelect
export type NewDocChunk = typeof docChunks.$inferInsert
