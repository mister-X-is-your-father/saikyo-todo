/**
 * Comment は Item 用 / Doc 用に分離 (polymorphic 不採用, FK と整合制約が効く)。
 * features/comment が両方を束ねる union 関数を提供する。
 */
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { actorType, id, mutationMarkers, timestamps } from './_shared'
import { docs } from './doc'
import { items } from './item'

export const commentsOnItems = pgTable(
  'comments_on_items',
  {
    id: id(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    authorActorType: actorType('author_actor_type').notNull(),
    authorActorId: uuid('author_actor_id').notNull(),
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [index('comments_on_items_item_idx').on(t.itemId)],
)

export const commentsOnDocs = pgTable(
  'comments_on_docs',
  {
    id: id(),
    docId: uuid('doc_id')
      .notNull()
      .references(() => docs.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    authorActorType: actorType('author_actor_type').notNull(),
    authorActorId: uuid('author_actor_id').notNull(),
    ...mutationMarkers,
    ...timestamps,
  },
  (t) => [index('comments_on_docs_doc_idx').on(t.docId)],
)

export type CommentOnItem = typeof commentsOnItems.$inferSelect
export type NewCommentOnItem = typeof commentsOnItems.$inferInsert
export type CommentOnDoc = typeof commentsOnDocs.$inferSelect
export type NewCommentOnDoc = typeof commentsOnDocs.$inferInsert
