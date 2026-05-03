/**
 * iter678 chore: auth schema (zod) の単体テスト。test 不在解消。
 *
 * SignupInput / LoginInput の email + password + displayName validation rule を
 * 構造的に固定する。signup は password 8+ / displayName 1-50、login は password
 * 1+ で credential 形式のみ確認 (実 auth は server 側)。
 */
import { describe, expect, it } from 'vitest'

import { LoginInputSchema, SignupInputSchema } from './schema'

describe('SignupInputSchema', () => {
  it('valid input を accept', () => {
    expect(
      SignupInputSchema.parse({
        email: 'user@example.com',
        password: '12345678',
        displayName: 'Alice',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: '12345678',
      displayName: 'Alice',
    })
  })

  it('email + displayName を trim', () => {
    const r = SignupInputSchema.parse({
      email: '  user@example.com  ',
      password: '12345678',
      displayName: '  Alice  ',
    })
    expect(r.email).toBe('user@example.com')
    expect(r.displayName).toBe('Alice')
  })

  it('email 形式不正 → reject', () => {
    expect(() =>
      SignupInputSchema.parse({
        email: 'not-an-email',
        password: '12345678',
        displayName: 'Alice',
      }),
    ).toThrow(/正しいメールアドレス/)
  })

  it('password 7 文字 → reject', () => {
    expect(() =>
      SignupInputSchema.parse({
        email: 'user@example.com',
        password: '1234567',
        displayName: 'Alice',
      }),
    ).toThrow(/8 文字以上/)
  })

  it('password 8 文字ちょうど → accept', () => {
    expect(() =>
      SignupInputSchema.parse({
        email: 'user@example.com',
        password: '12345678',
        displayName: 'Alice',
      }),
    ).not.toThrow()
  })

  it('displayName 空 → reject', () => {
    expect(() =>
      SignupInputSchema.parse({
        email: 'user@example.com',
        password: '12345678',
        displayName: '',
      }),
    ).toThrow(/表示名を入力/)
  })

  it('displayName 50 文字超 → reject', () => {
    expect(() =>
      SignupInputSchema.parse({
        email: 'user@example.com',
        password: '12345678',
        displayName: 'a'.repeat(51),
      }),
    ).toThrow(/50 文字以内/)
  })

  it('displayName 空白のみ (trim 後 空) → reject', () => {
    expect(() =>
      SignupInputSchema.parse({
        email: 'user@example.com',
        password: '12345678',
        displayName: '   ',
      }),
    ).toThrow(/表示名を入力/)
  })
})

describe('LoginInputSchema', () => {
  it('valid input を accept', () => {
    expect(LoginInputSchema.parse({ email: 'user@example.com', password: 'x' })).toEqual({
      email: 'user@example.com',
      password: 'x',
    })
  })

  it('password 1 文字でも accept (signup と違い length 緩い)', () => {
    expect(() => LoginInputSchema.parse({ email: 'user@example.com', password: 'a' })).not.toThrow()
  })

  it('password 空 → reject', () => {
    expect(() => LoginInputSchema.parse({ email: 'user@example.com', password: '' })).toThrow(
      /パスワードを入力/,
    )
  })

  it('email 形式不正 → reject', () => {
    expect(() => LoginInputSchema.parse({ email: 'bad', password: 'x' })).toThrow(
      /正しいメールアドレス/,
    )
  })

  it('email を trim', () => {
    const r = LoginInputSchema.parse({ email: '  user@example.com  ', password: 'x' })
    expect(r.email).toBe('user@example.com')
  })
})
