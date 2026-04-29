import { describe, expect, it } from 'vitest'

import { classifyByCountAndMax, makeHintLabelFormatter } from './hint'

const T = { moderateCount: 3, moderateMax: 14, severeCount: 5, severeMax: 30 }

interface Entry {
  v: number
}

const e = (v: number): Entry => ({ v })

describe('classifyByCountAndMax (iter445)', () => {
  it('空 → idle', () => {
    expect(classifyByCountAndMax<Entry>([], (x) => x.v, T)).toBe('idle')
  })

  it('count ≤ 2 かつ max < moderateMax → mild', () => {
    expect(classifyByCountAndMax([e(7)], (x) => x.v, T)).toBe('mild')
    expect(classifyByCountAndMax([e(7), e(13)], (x) => x.v, T)).toBe('mild')
  })

  it('count = moderateCount (3) → moderate', () => {
    expect(classifyByCountAndMax([e(1), e(1), e(1)], (x) => x.v, T)).toBe('moderate')
  })

  it('max = moderateMax (14) → moderate (count=1 でも)', () => {
    expect(classifyByCountAndMax([e(14)], (x) => x.v, T)).toBe('moderate')
  })

  it('count = severeCount (5) → severe', () => {
    expect(classifyByCountAndMax([e(1), e(1), e(1), e(1), e(1)], (x) => x.v, T)).toBe('severe')
  })

  it('max = severeMax (30) → severe (count=1 でも)', () => {
    expect(classifyByCountAndMax([e(30)], (x) => x.v, T)).toBe('severe')
    expect(classifyByCountAndMax([e(99)], (x) => x.v, T)).toBe('severe')
  })

  it('境界値: max = moderateMax-1 (13) → mild', () => {
    expect(classifyByCountAndMax([e(13)], (x) => x.v, T)).toBe('mild')
  })

  it('thresholds カスタム (blocked-items 形): moderateMax=3 / severeMax=5', () => {
    const T2 = { moderateCount: 3, moderateMax: 3, severeCount: 5, severeMax: 5 }
    expect(classifyByCountAndMax([e(2)], (x) => x.v, T2)).toBe('mild')
    expect(classifyByCountAndMax([e(3)], (x) => x.v, T2)).toBe('moderate')
    expect(classifyByCountAndMax([e(5)], (x) => x.v, T2)).toBe('severe')
  })

  it('getValue で entries の最大値を抽出 (混在 5 件で max=20)', () => {
    const r = classifyByCountAndMax([e(5), e(20), e(10), e(15), e(2)], (x) => x.v, T)
    // count=5 satisfies severeCount=5 → severe
    expect(r).toBe('severe')
  })
})

describe('makeHintLabelFormatter (iter455)', () => {
  type State = 'a' | 'b' | 'c'
  const classify = (input: { v: number }): State => (input.v < 10 ? 'a' : input.v < 100 ? 'b' : 'c')
  const labels: Record<State, string> = {
    a: '小',
    b: '中',
    c: '大',
  }

  it('classify + labels から input → string な thunk を生成', () => {
    const fmt = makeHintLabelFormatter(classify, labels)
    expect(fmt({ v: 5 })).toBe('小')
    expect(fmt({ v: 50 })).toBe('中')
    expect(fmt({ v: 500 })).toBe('大')
  })

  it('返された関数は pure (= 同じ input は常に同じ output)', () => {
    const fmt = makeHintLabelFormatter(classify, labels)
    const input = { v: 50 }
    expect(fmt(input)).toBe(fmt(input))
    expect(fmt(input)).toBe('中')
  })

  it('classify を mock しても labels で出し分け可', () => {
    const fmt = makeHintLabelFormatter<unknown, State>(() => 'a', labels)
    expect(fmt(null)).toBe('小')
    expect(fmt({ anything: true })).toBe('小')
  })
})
