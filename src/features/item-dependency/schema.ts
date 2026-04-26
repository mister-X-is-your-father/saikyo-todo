import { z } from 'zod'

export const ItemDependencyTypeSchema = z.enum(['blocks', 'relates_to'])
export type ItemDependencyType = z.infer<typeof ItemDependencyTypeSchema>

export const AddItemDependencyInputSchema = z
  .object({
    fromItemId: z.string().uuid(),
    toItemId: z.string().uuid(),
    type: ItemDependencyTypeSchema.default('blocks'),
  })
  .superRefine((v, ctx) => {
    if (v.fromItemId === v.toItemId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toItemId'],
        message: '自分自身への依存は作れません',
      })
    }
  })
export type AddItemDependencyInput = z.infer<typeof AddItemDependencyInputSchema>

export const RemoveItemDependencyInputSchema = z.object({
  fromItemId: z.string().uuid(),
  toItemId: z.string().uuid(),
  type: ItemDependencyTypeSchema,
})
export type RemoveItemDependencyInput = z.infer<typeof RemoveItemDependencyInputSchema>

export interface ItemDependencyRow {
  fromItemId: string
  toItemId: string
  type: ItemDependencyType
  createdAt: Date
}

export interface ItemRef {
  id: string
  title: string
  status: string
  isMust: boolean
  doneAt: Date | null
  priority: number
}

/**
 * ある Item を起点とした依存関係の集約結果。
 * - blockedBy: 自分が「後続」になっている依存。前提条件の Item 一覧
 * - blocking : 自分が「前提」になっている依存。自分の完了を待っている Item 一覧
 * - related  : 双方向 (relates_to) の関連先
 */
export interface ItemDependencyGroup {
  blockedBy: Array<{ ref: ItemRef; createdAt: Date }>
  blocking: Array<{ ref: ItemRef; createdAt: Date }>
  related: Array<{ ref: ItemRef; createdAt: Date }>
}
