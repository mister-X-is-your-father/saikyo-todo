/**
 * iter670 chore: result-unwrap helper の単体テスト。test 不在解消。
 *
 * `unwrap(result)` は client hook で Server Action の Result<T> を「ok→値 / err→throw」
 * に正規化する。AppError instanceof 情報が serialization で失われる経路 (RSC boundary
 * 越し plain object 化) に対応するため、plain object error を AppError に再構築する。
 */
import { describe, expect, it } from 'vitest'

import { AppError, ConflictError } from './errors'
import { err, ok } from './result'
import { unwrap } from './result-unwrap'

describe('unwrap', () => {
  it('ok result → value を返す', () => {
    const r = ok(42)
    expect(unwrap(r)).toBe(42)
  })

  it('Error instance を持つ err → そのまま throw', () => {
    const e = new Error('boom')
    expect(() => unwrap({ ok: false, error: e } as never)).toThrow('boom')
  })

  it('AppError instance を持つ err → AppError として throw', () => {
    const e = new ConflictError('version mismatch')
    try {
      unwrap({ ok: false, error: e } as never)
      throw new Error('should have thrown')
    } catch (caught) {
      expect(caught).toBe(e)
      expect(caught).toBeInstanceOf(AppError)
    }
  })

  it('plain object (RSC serializer 後 shape) → AppError に再構築して throw', () => {
    // RSC serializer 経由で AppError が plain object 化された shape をシミュレート
    const plainErr = { code: 'CONFLICT', message: 'version mismatch' }
    const r = { ok: false, error: plainErr as unknown as AppError } as ReturnType<typeof err>
    let caught: unknown
    try {
      unwrap(r as never)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AppError)
    if (caught instanceof AppError) {
      expect(caught.code).toBe('CONFLICT')
      expect(caught.message).toBe('version mismatch')
    }
  })

  it('code / message が undefined の plain object → fallback default を採用', () => {
    const r = { ok: false, error: {} as unknown as AppError } as ReturnType<typeof err>
    let caught: unknown
    try {
      unwrap(r as never)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AppError)
    if (caught instanceof AppError) {
      expect(caught.code).toBe('UNKNOWN')
      expect(caught.message).toBe('Unknown error')
    }
  })
})
