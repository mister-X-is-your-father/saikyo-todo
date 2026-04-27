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
