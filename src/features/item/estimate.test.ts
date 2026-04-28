import { describe, expect, it } from 'vitest'

import { extractEstimateMinutes, formatEstimate, parseEstimateFromText } from './estimate'

// iter255 refactor: nl-parse.ts から estimate ロジックを切り出した際の補強。
// 既存の nl-parse.test.ts (parseQuickAdd 経由) も re-export 経由で同じ関数を踏むので、
// ここでは「parseEstimateFromText の単体契約」と「重要な round-trip」だけを焦点化する。
describe('parseEstimateFromText (pure helper)', () => {
  it('一致なしは null', () => {
    expect(parseEstimateFromText('普通のテキスト')).toBeNull()
    expect(parseEstimateFromText('')).toBeNull()
  })

  it('JA `1時間30分` → 90 分 + 全 token consume', () => {
    const r = parseEstimateFromText('打ち合わせ 1時間30分 余談')
    expect(r).not.toBeNull()
    expect(r!.minutes).toBe(90)
    expect(r!.matched).toMatch(/1時間30分/)
  })

  it('JA `30分` 単独', () => {
    const r = parseEstimateFromText('30分')
    expect(r?.minutes).toBe(30)
  })

  it('EN `1.5h` (小数 hour)', () => {
    const r = parseEstimateFromText('study 1.5h')
    expect(r?.minutes).toBe(90)
  })

  it('EN `2h30m` 連結', () => {
    const r = parseEstimateFromText('plan 2h30m')
    expect(r?.minutes).toBe(150)
  })

  it('EN `30min` (語尾 in/ins/s 許容)', () => {
    expect(parseEstimateFromText('walk 30min')?.minutes).toBe(30)
    expect(parseEstimateFromText('walk 30mins')?.minutes).toBe(30)
  })

  it('上限 60h を越えた場合は null (consume しない)', () => {
    expect(parseEstimateFromText('100時間 大改修')).toBeNull()
    expect(parseEstimateFromText('100h')).toBeNull()
  })

  it('JA `1時間` を `1時` と取り違えない (時刻と区別)', () => {
    // estimate は `1時間` のみマッチ、`15時` は HH 表記なのでマッチしない
    expect(parseEstimateFromText('15時')).toBeNull()
    expect(parseEstimateFromText('1時間')?.minutes).toBe(60)
  })

  it('matched は前後 word boundary を含むので replace で安全に消せる', () => {
    const text = '事前準備 30分 議事録'
    const r = parseEstimateFromText(text)
    expect(r).not.toBeNull()
    const after = text.replace(r!.matched, ' ').replace(/\s+/g, ' ').trim()
    expect(after).toBe('事前準備 議事録')
  })
})

describe('round-trip: format → extract', () => {
  it('format した文字列が extract で復元できる (90 分)', () => {
    const formatted = formatEstimate(90)
    expect(extractEstimateMinutes(`見積: ${formatted}`)).toBe(90)
  })

  it('format した文字列が extract で復元できる (15 分)', () => {
    expect(extractEstimateMinutes(`見積: ${formatEstimate(15)}`)).toBe(15)
  })

  it('format した文字列が extract で復元できる (180 分 = 3 時間)', () => {
    expect(extractEstimateMinutes(`見積: ${formatEstimate(180)}`)).toBe(180)
  })
})
