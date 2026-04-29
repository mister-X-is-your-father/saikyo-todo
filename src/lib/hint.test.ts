import { describe, expect, it } from 'vitest'

import { classifyByCountAndMax } from './hint'

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
