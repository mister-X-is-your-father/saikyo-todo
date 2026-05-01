/**
 * iter594 ai-automation: comment.* part の input schema 単体テスト。
 *
 * part.run() は commentService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import { commentCreateOnItemPart } from './comment'

const validId = '01234567-89ab-4123-89ab-0123456789ab'
const altId = '11111111-2222-4333-8444-555555555555'

describe('commentCreateOnItemPart input schema', () => {
  it('itemId + body + idempotencyKey で valid', () => {
    const r = commentCreateOnItemPart.input.safeParse({
      itemId: validId,
      body: '進捗 OK',
      idempotencyKey: altId,
    })
    expect(r.success).toBe(true)
  })

  it('body 空文字 → invalid (min 1)', () => {
    const r = commentCreateOnItemPart.input.safeParse({
      itemId: validId,
      body: '',
      idempotencyKey: altId,
    })
    expect(r.success).toBe(false)
  })

  it('body 10001 文字 → invalid (max 10000)', () => {
    const r = commentCreateOnItemPart.input.safeParse({
      itemId: validId,
      body: 'a'.repeat(10_001),
      idempotencyKey: altId,
    })
    expect(r.success).toBe(false)
  })

  it('body ちょうど 10000 文字 → valid', () => {
    const r = commentCreateOnItemPart.input.safeParse({
      itemId: validId,
      body: 'a'.repeat(10_000),
      idempotencyKey: altId,
    })
    expect(r.success).toBe(true)
  })

  it('itemId が uuid 不正 → invalid', () => {
    const r = commentCreateOnItemPart.input.safeParse({
      itemId: 'bogus',
      body: 'x',
      idempotencyKey: altId,
    })
    expect(r.success).toBe(false)
  })

  it('idempotencyKey が uuid 不正 → invalid (重複防御の rs)', () => {
    const r = commentCreateOnItemPart.input.safeParse({
      itemId: validId,
      body: 'x',
      idempotencyKey: 'bogus',
    })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category', () => {
    expect(commentCreateOnItemPart.id).toBe('comment.create_on_item')
    expect(commentCreateOnItemPart.sideEffect).toBe('write')
    expect(commentCreateOnItemPart.category).toBe('comment')
  })
})
