/**
 * iter594 ai-automation: comment.* part の input schema 単体テスト。
 *
 * part.run() は commentService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import { commentCreateOnItemPart, commentListForItemPart } from './comment'
import { ALT_FIXTURE_ID, VALID_FIXTURE_ID } from './test-fixtures'

const validId = VALID_FIXTURE_ID
const altId = ALT_FIXTURE_ID

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

describe('commentListForItemPart input schema', () => {
  it('itemId 単独で valid', () => {
    const r = commentListForItemPart.input.safeParse({ itemId: validId })
    expect(r.success).toBe(true)
  })

  it('itemId 不在 → invalid (required)', () => {
    const r = commentListForItemPart.input.safeParse({})
    expect(r.success).toBe(false)
  })

  it('itemId が uuid 不正 → invalid', () => {
    const r = commentListForItemPart.input.safeParse({ itemId: 'bogus' })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect = read / category', () => {
    expect(commentListForItemPart.id).toBe('comment.list_for_item')
    expect(commentListForItemPart.sideEffect).toBe('read')
    expect(commentListForItemPart.category).toBe('comment')
  })
})
