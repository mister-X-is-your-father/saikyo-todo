/**
 * iter607 ai-automation: doc.* part の input schema 単体テスト。
 *
 * part.run() は docService 経由で実 Supabase を叩くため、本 file は input
 * schema の validation のみを検証 (= service / repository は別 test で網羅済)。
 */
import { describe, expect, it } from 'vitest'

import { docCreatePart, docListPart } from './doc'
import { ALT_FIXTURE_ID, VALID_FIXTURE_ID } from './test-fixtures'

const validId = VALID_FIXTURE_ID
const altId = ALT_FIXTURE_ID

describe('docCreatePart input schema', () => {
  it('title + idempotencyKey で valid (body 省略可)', () => {
    const r = docCreatePart.input.safeParse({
      title: '調査メモ',
      idempotencyKey: validId,
    })
    expect(r.success).toBe(true)
  })

  it('title + body + sourceTemplateId 込みで valid', () => {
    const r = docCreatePart.input.safeParse({
      title: 'spike: NextAuth',
      body: '## 結論\n...',
      sourceTemplateId: altId,
      idempotencyKey: validId,
    })
    expect(r.success).toBe(true)
  })

  it('title 空文字 → invalid (min 1)', () => {
    const r = docCreatePart.input.safeParse({
      title: '',
      idempotencyKey: validId,
    })
    expect(r.success).toBe(false)
  })

  it('title 501 文字 → invalid (max 500)', () => {
    const r = docCreatePart.input.safeParse({
      title: 'a'.repeat(501),
      idempotencyKey: validId,
    })
    expect(r.success).toBe(false)
  })

  it('idempotencyKey が uuid 不正 → invalid', () => {
    const r = docCreatePart.input.safeParse({
      title: 't',
      idempotencyKey: 'bogus',
    })
    expect(r.success).toBe(false)
  })

  it('part metadata: id / sideEffect / category=doc', () => {
    expect(docCreatePart.id).toBe('doc.create')
    expect(docCreatePart.sideEffect).toBe('write')
    expect(docCreatePart.category).toBe('doc')
  })
})

describe('docListPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = docListPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('part metadata: id / sideEffect=read / category=doc', () => {
    expect(docListPart.id).toBe('doc.list')
    expect(docListPart.sideEffect).toBe('read')
    expect(docListPart.category).toBe('doc')
  })
})
