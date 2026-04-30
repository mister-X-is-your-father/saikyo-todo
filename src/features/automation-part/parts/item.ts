/**
 * queue: AP-1 substrate — item.* part 群 (sample 移植)。
 *
 * 既存 itemService を thin wrap する形で part 化。今回は最小 2 件:
 *   - item.create
 *   - item.complete
 *
 * 残り (update / list_today / list_overdue 等) は AP-2 / AP-3 で。
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

import { definePart } from '../types'

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
    if (!r.ok) throw new Error(`item.create failed: ${r.error.message ?? r.error.code}`)
    return r.value
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
  run: async (input, _ctx) => {
    const r = await itemService.toggleComplete({
      id: input.id,
      expectedVersion: input.expectedVersion,
      complete: true,
    })
    if (!r.ok) throw new Error(`item.complete failed: ${r.error.message ?? r.error.code}`)
    return r.value
  },
})
