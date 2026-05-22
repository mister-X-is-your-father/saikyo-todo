/**
 * iter1084 basics: `unwrap` の test 不足を埋める。
 *
 * `result-unwrap.ts` は Server Action → Client hook 間で `Result<T>` を TanStack
 * Query に渡すために throw に変換する境界 helper だが、test なしのまま運用されて
 * いた (`result.ts` / `errors.ts` は test 済)。境界跨ぎで AppError instanceof 情報が
 * 失われた plain object も AppError instance に再構築する経路がある (`unwrap` 内
 * `Object.assign`) ので、ここの shape を回帰防止 で fix する。
 *
 * test scope:
 * - ok branch (value をそのまま返す)
 * - err branch with Error instance (再 throw、instance 保持)
 * - err branch with plain object (AppError 再構築、code/message 復元)
 * - err branch with undefined code/message (fallback で 'UNKNOWN'/'Unknown error')
 */
import { describe, expect, it } from 'vitest'

import { AppError, ValidationError } from './errors'
import { err, ok } from './result'
import { unwrap } from './result-unwrap'

describe('unwrap', () => {
  it('ok の時は value をそのまま返す', () => {
    expect(unwrap(ok(42))).toBe(42)
    expect(unwrap(ok({ x: 1 }))).toEqual({ x: 1 })
  })

  it('err が AppError instance (Error 派生) の時はそのまま throw', () => {
    const e = new AppError('CUSTOM', 'boom')
    expect(() => unwrap({ ok: false, error: e })).toThrow(e)
  })

  it('err が AppError instance の時はそのまま throw (instanceof 保持)', () => {
    const e = new ValidationError('invalid input')
    let caught: unknown
    try {
      unwrap({ ok: false, error: e })
    } catch (caughtError) {
      caught = caughtError
    }
    expect(caught).toBe(e)
    expect(caught).toBeInstanceOf(AppError)
  })

  it('err が plain object の時は AppError instance に再構築して throw', () => {
    // err() helper は AppError instance を plain object に正規化する (RSC serializer 対策)
    const original = new ValidationError('invalid field x')
    const result = err(original)
    expect(result.ok).toBe(false)
    // plain object に戻っている (instanceof は失われる)
    expect(result.ok === false && result.error instanceof Error).toBe(false)
    // unwrap が再構築して throw する
    let caught: unknown
    try {
      unwrap(result)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).code).toBe('VALIDATION')
    expect((caught as AppError).message).toBe('invalid field x')
  })

  it('err が code/message を欠いた plain object でも fallback で AppError 化', () => {
    // 境界跨ぎで code / message が欠落するケース (実運用では起きないが defensive)
    const result = { ok: false as const, error: {} as unknown as AppError }
    let caught: unknown
    try {
      unwrap(result)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).code).toBe('UNKNOWN')
    expect((caught as AppError).message).toBe('Unknown error')
  })
})
