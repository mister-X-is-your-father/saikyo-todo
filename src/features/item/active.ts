/**
 * iter1042 refactor: item の「active」 判定 (doneAt / archivedAt / deletedAt が全て null) を
 * `features/item/` に **canonical 移転**。
 *
 * 経緯: iter610 で `features/today/operation-board.ts#isItemActive` として導入されたが、その後
 * `automation-part/parts/item.ts` / `weekly-review-checklist.ts` (iter1034) / `waiting-list-aggregate.ts`
 * (本 iter で adopt) など item-domain の caller が増えるにつれ「item の semantics なのに today/
 * 配下に存在」 という違和感が顕在化。本 iter で `features/item/active.ts` に移転、operation-board
 * は re-export で後方互換維持。
 *
 * これで `features/item/` 内の helper (= `waiting-list-aggregate.ts` 等) も同 directory 経由で
 * 1 行参照可能、cross-feature import (item → today) を回避できる。
 *
 * 仕様:
 *   - doneAt / archivedAt / deletedAt のいずれかに値があれば false
 *   - 全て null/undef → true
 *
 * AI 不使用、副作用無し、依存無し。pure helper。
 */

import type { Item } from './schema'

export function isItemActive(it: Item): boolean {
  return !it.doneAt && !it.archivedAt && !it.deletedAt
}
