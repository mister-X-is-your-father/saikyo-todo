/**
 * queue: AP-1 / AP-2 substrate — item.* part 群 (sample 移植)。
 *
 * 既存 itemService を thin wrap する形で part 化:
 *   - item.create
 *   - item.update (iter587 ai-automation: 部分 patch + 楽観ロック)
 *   - item.complete
 *   - item.list (iter599 ai-automation: read 系 1 件目、status / isMust filter)
 *
 * list_today / list_overdue 等の特殊 list は AP-2 残以降で。
 *
 * 設計メモ:
 *   - itemService は requireUser / requireWorkspaceMember を内部で呼ぶ。
 *     part runtime ではすでに呼出元 (workflow engine / agent tool / MCP) で
 *     authContext を確立した上で呼ぶ前提だが、二重 check は no-op (= 安全側)
 *   - workspaceId は ctx 経由 (input に直接含めない)
 *   - input zod schema は service の input schema から派生
 */
import 'server-only'

import { z } from 'zod'

import { ItemSelectSchema } from '@/features/item/schema'
import { itemService } from '@/features/item/service'

import { definePart, unwrapPartResult } from '../types'

const ItemCreateInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional(),
  status: z.string().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  isMust: z.boolean().optional(),
  dueDate: z.string().optional(),
  parentId: z.string().uuid().optional(),
})

export const itemCreatePart = definePart({
  id: 'item.create',
  label: 'item を作成',
  description: '新規 item を 1 件作成する。workspace は ctx 経由で固定。',
  category: 'item',
  sideEffect: 'write',
  input: ItemCreateInput,
  output: ItemSelectSchema,
  run: async (input, ctx) => {
    const r = await itemService.create({
      workspaceId: ctx.workspaceId,
      ...input,
    })
    return unwrapPartResult('item.create', r)
  },
})

/**
 * iter587 ai-automation: item.update part — 部分 patch + 楽観ロック。
 *
 * ItemUpdateInput = { id, expectedVersion, patch }。patch は schema/UpdateItemInputSchema
 * の patch を minimal subset に narrow し、AI / workflow / MCP から呼びやすい
 * shape に揃える (workspace 横断の field のみ、ltree path / version 等の内部 field は
 * itemService 内で扱われるので除外)。
 *
 * 楽観ロック衝突時 (= ConflictError) は run() 内で throw、呼出 layer
 * (workflow / agent / MCP) 側で retry / surface ポリシを選ぶ。
 */
const ItemUpdatePatchInput = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().optional(),
    status: z.string().min(1).optional(),
    priority: z.number().int().min(1).max(4).optional(),
    isMust: z.boolean().optional(),
    dueDate: z.string().nullish(),
    scheduledFor: z.string().nullish(),
    dod: z.string().nullish(),
  })
  .refine((p) => Object.keys(p).length > 0, {
    message: '更新する項目がありません',
  })

const ItemUpdateInput = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: ItemUpdatePatchInput,
})

export const itemUpdatePart = definePart({
  id: 'item.update',
  label: 'item を更新',
  description:
    'item の指定 field を patch で更新する (楽観ロック必須)。workspace は ctx 経由で固定。',
  category: 'item',
  sideEffect: 'write',
  input: ItemUpdateInput,
  output: ItemSelectSchema,
  run: async (input) => {
    const r = await itemService.update({
      id: input.id,
      expectedVersion: input.expectedVersion,
      patch: input.patch,
    })
    return unwrapPartResult('item.update', r)
  },
})

/**
 * iter599 ai-automation: item.list part — workspace の Item 一覧を返す read 系 part。
 *
 * AC-1「AI に任せた」 で AI が「今ある todo を見る」 起点の探索や、workflow の最初の
 * 入力として item 集合を取り出す経路。filter は status (todo / in_progress / done /
 * blocked / 自由 string) と isMust (true / false) のみ提供 (= 副作用なしの最小 read)。
 * workspaceId は ctx 経由で固定。
 */
const ItemListInput = z.object({
  status: z.string().min(1).optional(),
  isMust: z.boolean().optional(),
})

export const itemListPart = definePart({
  id: 'item.list',
  label: 'item 一覧を取得',
  description:
    'workspace の Item 一覧を返す。filter で status / isMust を絞り込み可能。副作用なし、read scope。',
  category: 'item',
  sideEffect: 'read',
  input: ItemListInput,
  output: z.array(ItemSelectSchema),
  run: async (input, ctx) => {
    const items = await itemService.list(ctx.workspaceId, {
      status: input.status,
      isMust: input.isMust,
    })
    return items
  },
})

const ItemCompleteInput = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})

export const itemCompletePart = definePart({
  id: 'item.complete',
  label: 'item を完了',
  description: 'item の status を done に切り替える (打刻 + audit 含む)',
  category: 'item',
  sideEffect: 'write',
  input: ItemCompleteInput,
  output: ItemSelectSchema,
  run: async (input) => {
    const r = await itemService.toggleComplete({
      id: input.id,
      expectedVersion: input.expectedVersion,
      complete: true,
    })
    return unwrapPartResult('item.complete', r)
  },
})
