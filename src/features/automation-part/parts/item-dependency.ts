/**
 * queue: AP-2 substrate — item-dependency.* part 群 (read 系特化)。
 *
 * 既存 itemDependencyService を thin wrap する形で part 化:
 *   - item_dependency.list_for_item — item 1 件起点の依存関係集約
 *     (blockedBy / blocking / related)
 *
 * 設計メモ:
 *   - itemDependencyService.listForItem は内部で requireUser + workspace member 検証
 *     (item 経由で確立) を呼ぶ + Result<T> を返す
 *   - workspaceId は item 経由で確立 (input に直接含めない、commentService と同 pattern)
 *   - read scope (= AP-5 / AP-6 で read scope key で許可可能)
 *   - AC-2「AI に review してもらう」 / AC-1「AI に任せた」 で AI が「この item は何を
 *     待っているか / 何を blocking しているか」 を 1 part で取得し review checklist や
 *     plan に反映する経路の substrate
 *
 * output schema は item-dependency/schema.ts の TypeScript interface (ItemRef /
 * ItemDependencyGroup) を zod 化する形で part 内に定義 (= service 側の interface を
 * 変えずに part 経路で zod schema を expose、AP-5 / AP-6 で JSON Schema 出力可)。
 */
import 'server-only'

import { z } from 'zod'

import { itemDependencyService } from '@/features/item-dependency/service'

import { definePart, unwrapPartResult } from '../types'

const ItemRefSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  isMust: z.boolean(),
  doneAt: z.date().nullable(),
  priority: z.number().int(),
})

const ItemDependencyEntrySchema = z.object({
  ref: ItemRefSchema,
  createdAt: z.date(),
})

const ItemDependencyGroupSchema = z.object({
  blockedBy: z.array(ItemDependencyEntrySchema),
  blocking: z.array(ItemDependencyEntrySchema),
  related: z.array(ItemDependencyEntrySchema),
})

const ItemDependencyListInput = z.object({
  itemId: z.string().uuid(),
})

export const itemDependencyListForItemPart = definePart({
  id: 'item_dependency.list_for_item',
  label: 'item の依存関係を取得',
  description:
    '指定 item を起点とした依存関係 (blockedBy / blocking / related) を返す。副作用なし、read scope。workspaceId は item 経由で確立。',
  category: 'item',
  sideEffect: 'read',
  input: ItemDependencyListInput,
  output: ItemDependencyGroupSchema,
  run: async (input) => {
    const r = await itemDependencyService.listForItem(input.itemId)
    return unwrapPartResult('item_dependency.list_for_item', r)
  },
})
