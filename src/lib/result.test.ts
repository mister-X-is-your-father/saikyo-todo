import { describe, expect, it } from 'vitest'

import { err, isErr, isOk, ok } from './result'

describe('Result', () => {
  it('ok wraps a value', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    expect(isErr(r)).toBe(false)
    if (r.ok) expect(r.value).toBe(42)
  })

  it('err wraps an error', () => {
    const e = new Error('boom')
    const r = err(e)
    expect(isErr(r)).toBe(true)
    expect(isOk(r)).toBe(false)
    if (!r.ok) expect(r.error).toBe(e)
  })
})
