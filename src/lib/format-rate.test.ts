import { describe, expect, it } from 'vitest'

import { rateToPct } from './format-rate'

describe('rateToPct', () => {
  it('rounds 0.5 to 50', () => {
    expect(rateToPct(0.5)).toBe(50)
  })

  it('rounds 2/3 to 67', () => {
    expect(rateToPct(2 / 3)).toBe(67)
  })

  it('rounds 0 to 0', () => {
    expect(rateToPct(0)).toBe(0)
  })

  it('rounds 1 to 100', () => {
    expect(rateToPct(1)).toBe(100)
  })

  it('rounds 0.005 (banker tie) to 1 (Math.round half-up)', () => {
    // Math.round(0.005 * 100) = Math.round(0.5) = 1 (half-up in JS)
    expect(rateToPct(0.005)).toBe(1)
  })

  it('rounds 0.999 to 100', () => {
    expect(rateToPct(0.999)).toBe(100)
  })
})
