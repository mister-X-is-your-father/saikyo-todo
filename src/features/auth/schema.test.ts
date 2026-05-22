/**
 * iter1088 basics: `auth/schema.ts` の zod schema test を追加。
 *
 * `SignupInputSchema` / `LoginInputSchema` は signup-form / login-form の
 * 入口で `parse` される最初の防衛線。trim 動作 + email RFC ガード + password
 * 最小長 + displayName 範囲を回帰防止 (前後空白 trim は spec で UX 改善要件)。
 */
import { describe, expect, it } from 'vitest'

import { LoginInputSchema, SignupInputSchema } from './schema'

describe('SignupInputSchema', () => {
  const baseValid = {
    email: 'user@example.com',
    password: 'longenoughpass',
    displayName: '田中 太郎',
  }

  it('正常入力を accept', () => {
    expect(SignupInputSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('email の前後空白を trim', () => {
    const parsed = SignupInputSchema.parse({ ...baseValid, email: '  user@example.com  ' })
    expect(parsed.email).toBe('user@example.com')
  })

  it('displayName の前後空白を trim', () => {
    const parsed = SignupInputSchema.parse({ ...baseValid, displayName: '  田中  ' })
    expect(parsed.displayName).toBe('田中')
  })

  it('email が RFC invalid だと reject', () => {
    expect(() => SignupInputSchema.parse({ ...baseValid, email: 'not-an-email' })).toThrow()
    expect(() => SignupInputSchema.parse({ ...baseValid, email: '@example.com' })).toThrow()
    expect(() => SignupInputSchema.parse({ ...baseValid, email: 'user@' })).toThrow()
  })

  it('password が 8 文字未満だと reject', () => {
    expect(() => SignupInputSchema.parse({ ...baseValid, password: '1234567' })).toThrow()
    // 境界値 OK
    expect(() => SignupInputSchema.parse({ ...baseValid, password: '12345678' })).not.toThrow()
  })

  it('displayName が trim 後空文字だと reject', () => {
    expect(() => SignupInputSchema.parse({ ...baseValid, displayName: '' })).toThrow()
    expect(() => SignupInputSchema.parse({ ...baseValid, displayName: '   ' })).toThrow()
  })

  it('displayName が 50 文字超過だと reject', () => {
    expect(() => SignupInputSchema.parse({ ...baseValid, displayName: 'x'.repeat(51) })).toThrow()
    // 境界値 OK
    expect(() =>
      SignupInputSchema.parse({ ...baseValid, displayName: 'x'.repeat(50) }),
    ).not.toThrow()
  })
})

describe('LoginInputSchema', () => {
  it('正常入力を accept', () => {
    expect(LoginInputSchema.parse({ email: 'user@example.com', password: 'anything' })).toEqual({
      email: 'user@example.com',
      password: 'anything',
    })
  })

  it('email 前後空白を trim', () => {
    const parsed = LoginInputSchema.parse({ email: '  user@example.com  ', password: 'x' })
    expect(parsed.email).toBe('user@example.com')
  })

  it('password が空文字だと reject (signup と違い長さ制約なし、空のみ NG)', () => {
    expect(() => LoginInputSchema.parse({ email: 'user@example.com', password: '' })).toThrow()
    // 1 文字でも OK (login は既存 password を許容、長さ制限は signup 側のみ)
    expect(() => LoginInputSchema.parse({ email: 'user@example.com', password: 'x' })).not.toThrow()
  })

  it('email RFC invalid だと reject', () => {
    expect(() => LoginInputSchema.parse({ email: 'bad', password: 'x' })).toThrow()
  })
})
