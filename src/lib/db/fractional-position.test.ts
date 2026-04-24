import { describe, expect, it } from 'vitest'

import { INITIAL_POSITION, positionBetween, positionsBetween } from './fractional-position'

describe('INITIAL_POSITION', () => {
  it("items.position の column default 'a0' と一致する", () => {
    // schema: position: text('position').notNull().default('a0')
    expect(INITIAL_POSITION).toBe('a0')
  })
})

describe('positionBetween', () => {
  it('null/null の場合は canonical first を返す', () => {
    expect(positionBetween(null, null)).toBe('a0')
  })

  it('prev のあとに追加 (next=null)', () => {
    const r = positionBetween('a0', null)
    expect(r > 'a0').toBe(true)
  })

  it('next のまえに挿入 (prev=null)', () => {
    const r = positionBetween(null, 'a0')
    expect(r < 'a0').toBe(true)
  })

  it('prev と next の間に挿入 (lex 順で prev < 結果 < next)', () => {
    const r = positionBetween('a0', 'a1')
    expect(r > 'a0').toBe(true)
    expect(r < 'a1').toBe(true)
  })

  it('prev >= next は throw (呼出側のバグ)', () => {
    expect(() => positionBetween('a1', 'a0')).toThrow()
    expect(() => positionBetween('a0', 'a0')).toThrow()
  })

  it('同一区間への連続挿入でも破綻しない (無限分割)', () => {
    let a = 'a0'
    const b = 'a1'
    const keys: string[] = []
    for (let i = 0; i < 10; i++) {
      const k = positionBetween(a, b)
      expect(k > a).toBe(true)
      expect(k < b).toBe(true)
      keys.push(k)
      a = k
    }
    // 10 回挿入しても生成できている
    expect(keys).toHaveLength(10)
  })
})

describe('positionsBetween', () => {
  it('n 個の隣接 position を生成、すべて prev < xs < next + 互いに昇順', () => {
    const xs = positionsBetween('a0', 'a1', 5)
    expect(xs).toHaveLength(5)
    expect(xs[0]! > 'a0').toBe(true)
    expect(xs[xs.length - 1]! < 'a1').toBe(true)
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]! > xs[i - 1]!).toBe(true)
    }
  })

  it('prev=null, next=null で n 個 (初期一括作成ユースケース)', () => {
    const xs = positionsBetween(null, null, 3)
    expect(xs).toHaveLength(3)
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]! > xs[i - 1]!).toBe(true)
    }
  })
})

describe('text column の lex sort が position の並び順と一致する', () => {
  it('混在した fractional index が sort() で想定順になる', () => {
    const mixed = ['a1V', 'Zz', 'a0', 'a0V', 'a1', 'a2']
    const sorted = [...mixed].sort()
    // 'Z' (ASCII 90) < 'a' (97), '0' < 'V' < '1' の順で整合
    expect(sorted).toEqual(['Zz', 'a0', 'a0V', 'a1', 'a1V', 'a2'])
  })
})
