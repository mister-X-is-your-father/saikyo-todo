/**
 * Phase 6.15 iter145: AppError が Server Action 越しに message / code を
 * 確実に届けることを単体検証。
 *
 * Error.prototype.message は non-enumerable で JSON.stringify が拾わない罠を
 * AppError 構築時の Object.defineProperty + toJSON で塞いでいる。
 */
import { describe, expect, it } from 'vitest'

import {
  AppError,
  ConflictError,
  ExternalServiceError,
  isAppError,
  NotFoundError,
  ValidationError,
} from './errors'

describe('AppError serialization (Server Action wire)', () => {
  it('JSON.stringify が message / code / name を保持する', () => {
    const e = new ValidationError('ANTHROPIC_API_KEY が必要です')
    const j = JSON.parse(JSON.stringify(e)) as Record<string, unknown>
    expect(j.message).toBe('ANTHROPIC_API_KEY が必要です')
    expect(j.code).toBe('VALIDATION')
    expect(j.name).toBe('ValidationError')
  })

  it('message プロパティは enumerable (Object.keys で見える)', () => {
    const e = new NotFoundError('item not found')
    const keys = Object.keys(e)
    expect(keys).toContain('message')
    expect(keys).toContain('code')
    expect(keys).toContain('name')
  })

  it('toJSON が cause の有無で差を出す', () => {
    const a = new ConflictError()
    const b = new ValidationError('bad', { issues: [{ path: 'name', message: 'required' }] })
    const aj = a.toJSON()
    const bj = b.toJSON()
    expect(aj.cause).toBeUndefined()
    expect(bj.cause).toEqual({ issues: [{ path: 'name', message: 'required' }] })
  })

  it('ExternalServiceError でも message が text 化される', () => {
    const e = new ExternalServiceError('Anthropic', new Error('upstream 500'))
    const j = JSON.parse(JSON.stringify(e)) as Record<string, unknown>
    expect(j.message).toBe('Anthropic の呼び出しに失敗しました')
    expect(j.code).toBe('EXTERNAL')
  })

  it('AppError サブクラスでも instanceof AppError は true (unwrap の判定が崩れない)', () => {
    const e = new ValidationError('x')
    expect(e instanceof AppError).toBe(true)
    expect(e instanceof Error).toBe(true)
  })
})

describe('isAppError type guard', () => {
  it('AppError instance に対して true', () => {
    expect(isAppError(new AppError('TEST', 'msg'))).toBe(true)
    expect(isAppError(new ValidationError('x'))).toBe(true)
    expect(isAppError(new NotFoundError('not found'))).toBe(true)
    expect(isAppError(new ConflictError())).toBe(true)
  })

  it('plain Error は false (= 通常 Error は wrap されていない)', () => {
    expect(isAppError(new Error('boom'))).toBe(false)
    expect(isAppError(new TypeError('bad'))).toBe(false)
  })

  it('non-Error 値は false', () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError('error string')).toBe(false)
    expect(isAppError(42)).toBe(false)
    expect(isAppError({ message: 'plain' })).toBe(false)
  })
})
