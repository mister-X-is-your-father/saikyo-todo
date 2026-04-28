/**
 * MUST + DoD 不変条件 helper の網羅テスト。
 * service.ts の 3 箇所 / schema.ts の 1 箇所が drift しないよう
 * 唯一の真実として固定する。
 */
import { describe, expect, it } from 'vitest'

import { violatesMustDodInvariant } from './must-dod'

describe('violatesMustDodInvariant', () => {
  describe('isMust=false: 常に許可', () => {
    it('dod が null でも違反しない', () => {
      expect(violatesMustDodInvariant({ isMust: false, dod: null })).toBe(false)
    })
    it('dod が undefined でも違反しない', () => {
      expect(violatesMustDodInvariant({ isMust: false, dod: undefined })).toBe(false)
    })
    it('dod が空文字でも違反しない', () => {
      expect(violatesMustDodInvariant({ isMust: false, dod: '' })).toBe(false)
    })
    it('dod があっても違反しない', () => {
      expect(violatesMustDodInvariant({ isMust: false, dod: '受け入れ条件' })).toBe(false)
    })
    it('dod field 自体が無くても違反しない', () => {
      expect(violatesMustDodInvariant({ isMust: false })).toBe(false)
    })
  })

  describe('isMust=true: dod 必須', () => {
    it('dod が null は違反', () => {
      expect(violatesMustDodInvariant({ isMust: true, dod: null })).toBe(true)
    })
    it('dod が undefined は違反', () => {
      expect(violatesMustDodInvariant({ isMust: true, dod: undefined })).toBe(true)
    })
    it('dod field 自体が無いのは違反', () => {
      expect(violatesMustDodInvariant({ isMust: true })).toBe(true)
    })
    it('dod が空文字は違反', () => {
      expect(violatesMustDodInvariant({ isMust: true, dod: '' })).toBe(true)
    })
    it('dod が空白のみは違反 (trim 後 0 文字)', () => {
      expect(violatesMustDodInvariant({ isMust: true, dod: '   ' })).toBe(true)
      expect(violatesMustDodInvariant({ isMust: true, dod: '\n\t  \t' })).toBe(true)
    })
    it('dod が 1 文字以上は違反しない', () => {
      expect(violatesMustDodInvariant({ isMust: true, dod: 'x' })).toBe(false)
      expect(violatesMustDodInvariant({ isMust: true, dod: 'リリース完了' })).toBe(false)
    })
    it('dod が前後空白付きの文字列は trim 後で判定', () => {
      expect(violatesMustDodInvariant({ isMust: true, dod: '  ok  ' })).toBe(false)
    })
  })
})
