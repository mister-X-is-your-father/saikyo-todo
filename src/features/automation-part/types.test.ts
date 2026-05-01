/**
 * iter590 refactor: unwrapPartResult helper の単体テスト。
 *
 * part の run() で `if (!r.ok) throw; return r.value` 重複を吸収する 1 関数。
 * partId prefix の付与と message / code の fallback 順序が肝。
 */
import { describe, expect, it } from 'vitest'

import { err, ok } from '@/lib/result'

import { unwrapPartResult } from './types'

describe('unwrapPartResult', () => {
  it('ok の Result は value を返す', () => {
    expect(unwrapPartResult('item.create', ok({ id: 'x' }))).toEqual({ id: 'x' })
  })

  it('error.message があれば prefix + ": " + message で throw', () => {
    expect(() =>
      unwrapPartResult('item.update', err({ message: '楽観ロック衝突', code: 'CONFLICT' })),
    ).toThrow('item.update failed: 楽観ロック衝突')
  })

  it('error.message が無く code のみあれば code を fallback', () => {
    expect(() => unwrapPartResult('schedule.create', err({ code: 'VALIDATION_ERROR' }))).toThrow(
      'schedule.create failed: VALIDATION_ERROR',
    )
  })

  it('message も code も無い (空 object) → "unknown error" fallback', () => {
    expect(() => unwrapPartResult('schedule.start_timer', err({}))).toThrow(
      'schedule.start_timer failed: unknown error',
    )
  })

  it('message が空文字列なら code に fallback (truthy 判定)', () => {
    expect(() => unwrapPartResult('item.complete', err({ message: '', code: 'CONFLICT' }))).toThrow(
      'item.complete failed: CONFLICT',
    )
  })

  it('partId が messege に必ず含まれる', () => {
    try {
      unwrapPartResult('foo.bar', err({ message: 'x' }))
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect((e as Error).message).toMatch(/^foo\.bar failed:/)
    }
  })
})
