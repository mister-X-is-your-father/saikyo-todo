import { describe, expect, it } from 'vitest'

import {
  countItemsByEffortBucket,
  extractEstimateMinutes,
  formatEffortBucketCounts,
  formatEstimate,
  formatItemEstimateSummary,
  groupItemsByEffortBucket,
  parseEstimateFromText,
  summarizeItemEstimates,
} from './estimate'

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

// iter297 ai-automation: AI brief / dashboard widget 用の集計 helper
describe('summarizeItemEstimates', () => {
  it('空配列 → 全 0', () => {
    expect(summarizeItemEstimates([])).toEqual({
      totalMinutes: 0,
      withEstimateCount: 0,
      withoutEstimateCount: 0,
      count: 0,
    })
  })

  it('全件見積あり', () => {
    const items = [
      { description: '見積: 30分' },
      { description: '見積: 1時間' },
      { description: '見積: 1時間30分' },
    ]
    const r = summarizeItemEstimates(items)
    expect(r.totalMinutes).toBe(30 + 60 + 90)
    expect(r.withEstimateCount).toBe(3)
    expect(r.withoutEstimateCount).toBe(0)
    expect(r.count).toBe(3)
  })

  it('一部見積なし (description 空 / 見積 prefix 不在)', () => {
    const items = [
      { description: '見積: 30分' },
      { description: '' }, // 見積なし
      { description: 'メモ: foo' }, // 見積なし
      { description: null }, // 見積なし
    ]
    const r = summarizeItemEstimates(items)
    expect(r.totalMinutes).toBe(30)
    expect(r.withEstimateCount).toBe(1)
    expect(r.withoutEstimateCount).toBe(3)
    expect(r.count).toBe(4)
  })

  it('description undefined も withoutEstimate にカウント', () => {
    const r = summarizeItemEstimates([{ description: undefined }, { description: '見積: 15分' }])
    expect(r.totalMinutes).toBe(15)
    expect(r.withoutEstimateCount).toBe(1)
  })
})

describe('formatItemEstimateSummary', () => {
  it('0 件 → "見積 0 件"', () => {
    expect(
      formatItemEstimateSummary({
        totalMinutes: 0,
        withEstimateCount: 0,
        withoutEstimateCount: 0,
        count: 0,
      }),
    ).toBe('見積 0 件')
  })

  it('全件見積なし', () => {
    expect(
      formatItemEstimateSummary({
        totalMinutes: 0,
        withEstimateCount: 0,
        withoutEstimateCount: 5,
        count: 5,
      }),
    ).toBe('見積 0 / 全 5 件')
  })

  it('全件見積あり ("(うち...)" 省略)', () => {
    expect(
      formatItemEstimateSummary({
        totalMinutes: 270, // 4 時間 30 分
        withEstimateCount: 3,
        withoutEstimateCount: 0,
        count: 3,
      }),
    ).toBe('合計 4時間30分 / 3 件')
  })

  it('一部見積なし ("(うち N 件は見積なし)" 付与)', () => {
    expect(
      formatItemEstimateSummary({
        totalMinutes: 90,
        withEstimateCount: 1,
        withoutEstimateCount: 2,
        count: 3,
      }),
    ).toBe('合計 1時間30分 / 3 件 (うち 2 件は見積なし)')
  })

  it('totalMinutes=0 でも withEstimateCount>0 (異常系) は formatEstimate fallback', () => {
    // 通常 summarizeItemEstimates で起こらないが defensive に "0分" にフォールバック
    expect(
      formatItemEstimateSummary({
        totalMinutes: 0,
        withEstimateCount: 1,
        withoutEstimateCount: 0,
        count: 1,
      }),
    ).toBe('合計 0分 / 1 件')
  })
})

describe('groupItemsByEffortBucket', () => {
  it('description の見積に応じて bucket 振り分け', () => {
    const items = [
      { id: 'a', description: '見積: 15分\n本文' }, // quick
      { id: 'b', description: '見積: 1時間\n本文' }, // medium
      { id: 'c', description: '見積: 4時間\n本文' }, // large
      { id: 'd', description: '見積: 12時間\n本文' }, // xlarge
      { id: 'e', description: '見積なし' }, // unknown
      { id: 'f', description: null }, // unknown
    ]
    const groups = groupItemsByEffortBucket(items)
    expect(groups.quick.map((i) => i.id)).toEqual(['a'])
    expect(groups.medium.map((i) => i.id)).toEqual(['b'])
    expect(groups.large.map((i) => i.id)).toEqual(['c'])
    expect(groups.xlarge.map((i) => i.id)).toEqual(['d'])
    expect(groups.unknown.map((i) => i.id)).toEqual(['e', 'f'])
  })

  it('境界: 30 分は medium、2 時間は large、7時間59分 は large、8時間 は xlarge', () => {
    const items = [
      { id: 'a', description: '見積: 29分' },
      { id: 'b', description: '見積: 30分' },
      { id: 'c', description: '見積: 1時間59分' },
      { id: 'd', description: '見積: 2時間' },
      { id: 'e', description: '見積: 7時間59分' },
      { id: 'f', description: '見積: 8時間' },
    ]
    const groups = groupItemsByEffortBucket(items)
    expect(groups.quick.map((i) => i.id)).toEqual(['a'])
    expect(groups.medium.map((i) => i.id)).toEqual(['b', 'c'])
    expect(groups.large.map((i) => i.id)).toEqual(['d', 'e'])
    expect(groups.xlarge.map((i) => i.id)).toEqual(['f'])
  })

  it('空配列でも 5 つの bucket が空配列で初期化', () => {
    const groups = groupItemsByEffortBucket([])
    expect(groups.quick).toEqual([])
    expect(groups.medium).toEqual([])
    expect(groups.large).toEqual([])
    expect(groups.xlarge).toEqual([])
    expect(groups.unknown).toEqual([])
  })
})

describe('countItemsByEffortBucket', () => {
  it('bucket 別件数集計', () => {
    const items = [
      { description: '見積: 5分' },
      { description: '見積: 15分' },
      { description: '見積: 1時間' },
      { description: '見積: 5時間' },
      { description: '見積: 1時間' },
      { description: null },
    ]
    expect(countItemsByEffortBucket(items)).toEqual({
      quick: 2,
      medium: 2,
      large: 1,
      xlarge: 0,
      unknown: 1,
    })
  })

  it('空配列は全 0', () => {
    expect(countItemsByEffortBucket([])).toEqual({
      quick: 0,
      medium: 0,
      large: 0,
      xlarge: 0,
      unknown: 0,
    })
  })
})

describe('formatEffortBucketCounts', () => {
  it('bucket 順 (quick → medium → large → xlarge → unknown) で並ぶ + 0 件は省略', () => {
    expect(
      formatEffortBucketCounts({
        quick: 5,
        medium: 3,
        large: 0,
        xlarge: 1,
        unknown: 2,
      }),
    ).toBe('<30m 5 / 30m-2h 3 / 1d+ 1 / 見積なし 2')
  })

  it('全 0 件は "0 件"', () => {
    expect(
      formatEffortBucketCounts({
        quick: 0,
        medium: 0,
        large: 0,
        xlarge: 0,
        unknown: 0,
      }),
    ).toBe('0 件')
  })
})
