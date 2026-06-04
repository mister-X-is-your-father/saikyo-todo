/**
 * iter485 chip-tone の unit test。pure helper のみ、DOM / domain 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  type ChipTone,
  chipToneAttentionRank,
  chipToneLabelJa,
  compareChipTones,
  countItemsByTone,
  filterItemsByMinTone,
  formatToneCountsJa,
  getChipToneClasses,
  groupItemsByTone,
  isMinTone,
  pickHighestSeverityTone,
  pickTopItemsByTone,
  someItemHasMinTone,
  sortItemsByTone,
} from './chip-tone'

describe('getChipToneClasses', () => {
  it('6 tone × 3 軸の class が定まっている (iter486 で success 追加)', () => {
    const tones: ChipTone[] = ['danger', 'urgent', 'warn', 'info', 'idle', 'success']
    for (const tone of tones) {
      const c = getChipToneClasses(tone)
      expect(c.bgClass).toMatch(/^bg-/)
      expect(c.textClass).toMatch(/^text-/)
      expect(c.ringClass).toMatch(/^ring-/)
    }
  })

  // iter1531: source の TONE_CLASSES に dark variant を併記したため expected strings を
  // 新形式に更新 (`'bg-rose-100'` → `'bg-rose-100 dark:bg-rose-950/40'` 等)。
  // テスト意図 (light 配色 token が変わらず維持) は新形式の light 部分で satisfy。
  it('danger → rose 系 (期限切れ / 超過 / 緊急)', () => {
    const c = getChipToneClasses('danger')
    expect(c.bgClass).toBe('bg-rose-100 dark:bg-rose-950/40')
    expect(c.textClass).toBe('text-rose-700 dark:text-rose-300')
    expect(c.ringClass).toBe('ring-rose-300 dark:ring-rose-900/50')
  })

  it('urgent (強amber) と warn (薄amber) で強弱を区別', () => {
    expect(getChipToneClasses('urgent').bgClass).toBe('bg-amber-100 dark:bg-amber-950/40')
    expect(getChipToneClasses('warn').bgClass).toBe('bg-amber-50 dark:bg-amber-950/30')
    expect(getChipToneClasses('urgent').textClass).toBe('text-amber-800 dark:text-amber-200')
    expect(getChipToneClasses('warn').textClass).toBe('text-amber-700 dark:text-amber-300')
  })

  it('info → blue 薄 (計画範囲内)、idle → slate 薄 (対象外)', () => {
    expect(getChipToneClasses('info').textClass).toBe('text-blue-700 dark:text-blue-300')
    expect(getChipToneClasses('idle').textClass).toBe('text-slate-600 dark:text-slate-400')
  })

  it('success → emerald 薄 (達成 / 余裕 / 完了 / 健全、severity 軸と直交)', () => {
    const c = getChipToneClasses('success')
    expect(c.bgClass).toBe('bg-emerald-50 dark:bg-emerald-950/30')
    expect(c.textClass).toBe('text-emerald-700 dark:text-emerald-300')
    expect(c.ringClass).toBe('ring-emerald-200 dark:ring-emerald-900/50')
  })
})

describe('chipToneAttentionRank (sort 用 attention 数値)', () => {
  it('danger=5 / urgent=4 / warn=3 / info=2 / idle=1 / success=0 (= 危ない順)', () => {
    expect(chipToneAttentionRank('danger')).toBe(5)
    expect(chipToneAttentionRank('urgent')).toBe(4)
    expect(chipToneAttentionRank('warn')).toBe(3)
    expect(chipToneAttentionRank('info')).toBe(2)
    expect(chipToneAttentionRank('idle')).toBe(1)
    expect(chipToneAttentionRank('success')).toBe(0)
  })
})

describe('compareChipTones (sort comparator、危ない順)', () => {
  it('danger > urgent > warn > info > idle > success の順で sort', () => {
    const tones: ChipTone[] = ['idle', 'danger', 'success', 'warn', 'urgent', 'info']
    const sorted = [...tones].sort(compareChipTones)
    expect(sorted).toEqual(['danger', 'urgent', 'warn', 'info', 'idle', 'success'])
  })

  it('同 tone は元順保持 (stable sort)', () => {
    const tones: ChipTone[] = ['warn', 'warn', 'danger', 'warn']
    const sorted = [...tones].sort(compareChipTones)
    expect(sorted).toEqual(['danger', 'warn', 'warn', 'warn'])
  })
})

describe('chipToneLabelJa (SR aria-label / 修飾語 ja-JP)', () => {
  it('6 tone × 1 label の map', () => {
    expect(chipToneLabelJa('danger')).toBe('緊急')
    expect(chipToneLabelJa('urgent')).toBe('要対応')
    expect(chipToneLabelJa('warn')).toBe('注意')
    expect(chipToneLabelJa('info')).toBe('通常')
    expect(chipToneLabelJa('idle')).toBe('対象外')
    expect(chipToneLabelJa('success')).toBe('達成')
  })

  it('caller pattern: domain label + tone label の組み合わせ (例: 「期限切れ (緊急)」)', () => {
    // 例として「期限切れ」 + tone label 'danger' = '緊急'
    const composite = `期限切れ (${chipToneLabelJa('danger')})`
    expect(composite).toBe('期限切れ (緊急)')
  })
})

describe('countItemsByTone (任意 items × getTone callback で集計)', () => {
  it('空 items → 全 tone 0', () => {
    const counts = countItemsByTone<{ id: string }>([], () => 'danger')
    expect(counts).toEqual({
      danger: 0,
      urgent: 0,
      warn: 0,
      info: 0,
      idle: 0,
      success: 0,
    })
  })

  it('混合 → tone 別件数', () => {
    type Item = { tone: ChipTone }
    const items: Item[] = [
      { tone: 'danger' },
      { tone: 'urgent' },
      { tone: 'warn' },
      { tone: 'warn' },
      { tone: 'success' },
    ]
    const counts = countItemsByTone(items, (it) => it.tone)
    expect(counts.danger).toBe(1)
    expect(counts.urgent).toBe(1)
    expect(counts.warn).toBe(2)
    expect(counts.info).toBe(0)
    expect(counts.idle).toBe(0)
    expect(counts.success).toBe(1)
  })
})

describe('formatToneCountsJa (1 行 summary、危ない順)', () => {
  it('全 0 → 「0 件」', () => {
    expect(
      formatToneCountsJa({ danger: 0, urgent: 0, warn: 0, info: 0, idle: 0, success: 0 }),
    ).toBe('0 件')
  })

  it('混合 → 「緊急 3 / 要対応 1 / 達成 12」 (0 件 tone は省略)', () => {
    expect(
      formatToneCountsJa({ danger: 3, urgent: 1, warn: 0, info: 0, idle: 0, success: 12 }),
    ).toBe('緊急 3 / 要対応 1 / 達成 12')
  })

  it('順序は 危ない順 (danger → urgent → warn → info → idle → success)', () => {
    expect(
      formatToneCountsJa({ danger: 1, urgent: 2, warn: 3, info: 4, idle: 5, success: 6 }),
    ).toBe('緊急 1 / 要対応 2 / 注意 3 / 通常 4 / 対象外 5 / 達成 6')
  })
})

describe('pickHighestSeverityTone (最悪 tone 抽出、カード border tone 決定用)', () => {
  it('空配列 → null sentinel', () => {
    expect(pickHighestSeverityTone([])).toBeNull()
  })

  it('単一 tone → そのまま返す', () => {
    expect(pickHighestSeverityTone(['warn'])).toBe('warn')
    expect(pickHighestSeverityTone(['idle'])).toBe('idle')
  })

  it('複数 tone → attention rank 最大 (= 最も危ない) を採用', () => {
    expect(pickHighestSeverityTone(['warn', 'danger', 'info'])).toBe('danger')
    expect(pickHighestSeverityTone(['idle', 'urgent', 'warn'])).toBe('urgent')
  })

  it('success と severity 系混在 → severity 系 prioritize (= success は positive 軸で rank 最低)', () => {
    expect(pickHighestSeverityTone(['success', 'warn'])).toBe('warn')
    expect(pickHighestSeverityTone(['success', 'idle'])).toBe('idle')
    // success のみ → severity 軸候補なしなので success 自体が返る
    expect(pickHighestSeverityTone(['success', 'success'])).toBe('success')
  })

  it('同 rank 複数 → 配列順で最初を採用 (stable)', () => {
    expect(pickHighestSeverityTone(['warn', 'warn'])).toBe('warn')
    expect(pickHighestSeverityTone(['danger', 'danger', 'urgent'])).toBe('danger')
  })
})

describe('sortItemsByTone (危ない順で新配列を返す、immutable)', () => {
  type Item = { id: string; tone: ChipTone }
  const getTone = (it: Item) => it.tone

  it('空 items → 空配列', () => {
    expect(sortItemsByTone<Item>([], getTone)).toEqual([])
  })

  it('混合 tone → danger → urgent → warn → info → idle → success の順', () => {
    const items: Item[] = [
      { id: 'idle1', tone: 'idle' },
      { id: 'success1', tone: 'success' },
      { id: 'danger1', tone: 'danger' },
      { id: 'warn1', tone: 'warn' },
      { id: 'urgent1', tone: 'urgent' },
      { id: 'info1', tone: 'info' },
    ]
    const sorted = sortItemsByTone(items, getTone)
    expect(sorted.map((it) => it.id)).toEqual([
      'danger1',
      'urgent1',
      'warn1',
      'info1',
      'idle1',
      'success1',
    ])
  })

  it('同 tone は元順保持 (stable)', () => {
    const items: Item[] = [
      { id: 'warn-a', tone: 'warn' },
      { id: 'warn-b', tone: 'warn' },
      { id: 'danger-a', tone: 'danger' },
      { id: 'warn-c', tone: 'warn' },
    ]
    const sorted = sortItemsByTone(items, getTone)
    expect(sorted.map((it) => it.id)).toEqual(['danger-a', 'warn-a', 'warn-b', 'warn-c'])
  })

  it('入力 array を mutate しない (immutable)', () => {
    const items: Item[] = [
      { id: 'success1', tone: 'success' },
      { id: 'danger1', tone: 'danger' },
    ]
    const original = [...items]
    const sorted = sortItemsByTone(items, getTone)
    expect(items).toEqual(original)
    expect(sorted).not.toBe(items)
  })

  it('getTone callback は item ごと呼ばれる (caller が tone を memoize 不要)', () => {
    const items: Item[] = [
      { id: 'a', tone: 'warn' },
      { id: 'b', tone: 'danger' },
    ]
    let callCount = 0
    const wrapped = (it: Item) => {
      callCount += 1
      return it.tone
    }
    sortItemsByTone(items, wrapped)
    expect(callCount).toBeGreaterThanOrEqual(items.length)
  })
})

describe('pickTopItemsByTone (上位 N 件 alert 抽出)', () => {
  type Item = { id: string; tone: ChipTone }
  const getTone = (it: Item) => it.tone

  it('n <= 0 → 空配列 (defensive)', () => {
    const items: Item[] = [{ id: 'a', tone: 'danger' }]
    expect(pickTopItemsByTone(items, getTone, 0)).toEqual([])
    expect(pickTopItemsByTone(items, getTone, -1)).toEqual([])
  })

  it('空 items → 空配列', () => {
    expect(pickTopItemsByTone<Item>([], getTone, 3)).toEqual([])
  })

  it('n >= length → 全件 sort 済み', () => {
    const items: Item[] = [
      { id: 'a', tone: 'idle' },
      { id: 'b', tone: 'danger' },
    ]
    const top = pickTopItemsByTone(items, getTone, 5)
    expect(top.map((it) => it.id)).toEqual(['b', 'a'])
  })

  it('top 3 抽出 — 最も危ない 3 件 (= AI brief 上位 alert)', () => {
    const items: Item[] = [
      { id: 'idle1', tone: 'idle' },
      { id: 'warn1', tone: 'warn' },
      { id: 'danger1', tone: 'danger' },
      { id: 'urgent1', tone: 'urgent' },
      { id: 'success1', tone: 'success' },
      { id: 'info1', tone: 'info' },
    ]
    const top3 = pickTopItemsByTone(items, getTone, 3)
    expect(top3.map((it) => it.id)).toEqual(['danger1', 'urgent1', 'warn1'])
  })

  it('同 rank が境界に並んだ場合は元順 (stable) を保つ', () => {
    const items: Item[] = [
      { id: 'warn-a', tone: 'warn' },
      { id: 'warn-b', tone: 'warn' },
      { id: 'danger-a', tone: 'danger' },
      { id: 'warn-c', tone: 'warn' },
    ]
    const top2 = pickTopItemsByTone(items, getTone, 2)
    expect(top2.map((it) => it.id)).toEqual(['danger-a', 'warn-a'])
  })

  it('入力 array を mutate しない', () => {
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'idle' },
    ]
    const original = [...items]
    pickTopItemsByTone(items, getTone, 1)
    expect(items).toEqual(original)
  })
})

describe('groupItemsByTone (iter1431 — tone 別 items 分配)', () => {
  type Item = { id: string; tone: ChipTone }
  const getTone = (it: Item) => it.tone

  it('空 items → 6 tone すべて空配列', () => {
    const grouped = groupItemsByTone<Item>([], getTone)
    expect(grouped.danger).toEqual([])
    expect(grouped.urgent).toEqual([])
    expect(grouped.warn).toEqual([])
    expect(grouped.info).toEqual([])
    expect(grouped.idle).toEqual([])
    expect(grouped.success).toEqual([])
  })

  it('混合 → tone 別に正しく分配', () => {
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'warn' },
      { id: 'c', tone: 'warn' },
      { id: 'd', tone: 'success' },
    ]
    const grouped = groupItemsByTone(items, getTone)
    expect(grouped.danger.map((it) => it.id)).toEqual(['a'])
    expect(grouped.warn.map((it) => it.id)).toEqual(['b', 'c'])
    expect(grouped.success.map((it) => it.id)).toEqual(['d'])
    expect(grouped.info).toEqual([])
  })

  it('各 array 内は入力 items の元順保持 (stable)', () => {
    const items: Item[] = [
      { id: 'warn-1', tone: 'warn' },
      { id: 'warn-2', tone: 'warn' },
      { id: 'danger-1', tone: 'danger' },
      { id: 'warn-3', tone: 'warn' },
    ]
    const grouped = groupItemsByTone(items, getTone)
    expect(grouped.warn.map((it) => it.id)).toEqual(['warn-1', 'warn-2', 'warn-3'])
    expect(grouped.danger.map((it) => it.id)).toEqual(['danger-1'])
  })

  it('入力 items を mutate しない', () => {
    const items: Item[] = [{ id: 'a', tone: 'danger' }]
    const original = [...items]
    groupItemsByTone(items, getTone)
    expect(items).toEqual(original)
  })

  it('集計と整合 (countItemsByTone との len/count 一致)', () => {
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'warn' },
      { id: 'c', tone: 'warn' },
      { id: 'd', tone: 'success' },
    ]
    const grouped = groupItemsByTone(items, getTone)
    const counts = countItemsByTone(items, getTone)
    expect(grouped.danger.length).toBe(counts.danger)
    expect(grouped.warn.length).toBe(counts.warn)
    expect(grouped.success.length).toBe(counts.success)
    expect(grouped.info.length).toBe(counts.info)
    expect(grouped.idle.length).toBe(counts.idle)
    expect(grouped.urgent.length).toBe(counts.urgent)
  })
})

describe('filterItemsByMinTone (iter1698 — 閾値以上の items を凝集)', () => {
  type Item = { id: string; tone: ChipTone }
  const getTone = (it: Item) => it.tone

  it('minTone=warn → danger / urgent / warn のみ通過 (info / idle / success 除外)', () => {
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'urgent' },
      { id: 'c', tone: 'warn' },
      { id: 'd', tone: 'info' },
      { id: 'e', tone: 'idle' },
      { id: 'f', tone: 'success' },
    ]
    const out = filterItemsByMinTone(items, getTone, 'warn')
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('minTone=danger → danger のみ通過', () => {
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'urgent' },
      { id: 'c', tone: 'warn' },
    ]
    const out = filterItemsByMinTone(items, getTone, 'danger')
    expect(out.map((x) => x.id)).toEqual(['a'])
  })

  it('minTone=success → 全 tone 通過 (success rank=0 = 最低なので filter なし)', () => {
    const items: Item[] = [
      { id: 'a', tone: 'idle' },
      { id: 'b', tone: 'success' },
      { id: 'c', tone: 'danger' },
    ]
    const out = filterItemsByMinTone(items, getTone, 'success')
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('入力順保持 (stable、filter 走査順)', () => {
    const items: Item[] = [
      { id: 'a', tone: 'warn' },
      { id: 'b', tone: 'success' },
      { id: 'c', tone: 'danger' },
      { id: 'd', tone: 'info' },
      { id: 'e', tone: 'urgent' },
    ]
    const out = filterItemsByMinTone(items, getTone, 'warn')
    expect(out.map((x) => x.id)).toEqual(['a', 'c', 'e'])
  })

  it('空配列 → 空配列', () => {
    expect(filterItemsByMinTone<Item>([], getTone, 'warn')).toEqual([])
  })

  it('入力 items を mutate しない (immutable)', () => {
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'idle' },
    ]
    const original = [...items]
    filterItemsByMinTone(items, getTone, 'warn')
    expect(items).toEqual(original)
  })
})

describe('isMinTone (iter1761 — 単一 tone × 単一 minTone gate predicate)', () => {
  it('rank(tone) >= rank(minTone) → true', () => {
    expect(isMinTone('danger', 'warn')).toBe(true)
    expect(isMinTone('urgent', 'warn')).toBe(true)
    expect(isMinTone('warn', 'warn')).toBe(true)
  })

  it('rank(tone) < rank(minTone) → false', () => {
    expect(isMinTone('info', 'warn')).toBe(false)
    expect(isMinTone('idle', 'warn')).toBe(false)
    expect(isMinTone('success', 'warn')).toBe(false)
  })

  it('minTone=success → 全 tone で true (success rank=0 最低)', () => {
    for (const t of ['danger', 'urgent', 'warn', 'info', 'idle', 'success'] as ChipTone[]) {
      expect(isMinTone(t, 'success')).toBe(true)
    }
  })

  it('minTone=danger → danger のみ true', () => {
    expect(isMinTone('danger', 'danger')).toBe(true)
    expect(isMinTone('urgent', 'danger')).toBe(false)
    expect(isMinTone('warn', 'danger')).toBe(false)
  })

  it('someItemHasMinTone(items, getTone, minTone) === items.some(it => isMinTone(getTone(it), minTone)) invariant', () => {
    type Item = { tone: ChipTone }
    const items: Item[] = [{ tone: 'success' }, { tone: 'warn' }, { tone: 'danger' }]
    for (const m of ['success', 'info', 'warn', 'danger'] as ChipTone[]) {
      expect(someItemHasMinTone(items, (it) => it.tone, m)).toBe(
        items.some((it) => isMinTone(it.tone, m)),
      )
    }
  })
})

describe('someItemHasMinTone (iter1759 — 閾値以上 item があるか short-circuit boolean)', () => {
  type Item = { id: string; tone: ChipTone }
  const getTone = (it: Item) => it.tone

  it('minTone=warn → danger / urgent / warn が 1 個でもあれば true', () => {
    expect(someItemHasMinTone([{ id: 'a', tone: 'danger' as ChipTone }], getTone, 'warn')).toBe(
      true,
    )
    expect(someItemHasMinTone([{ id: 'a', tone: 'urgent' as ChipTone }], getTone, 'warn')).toBe(
      true,
    )
    expect(someItemHasMinTone([{ id: 'a', tone: 'warn' as ChipTone }], getTone, 'warn')).toBe(true)
  })

  it('minTone=warn → info / idle / success のみ → false', () => {
    const items: Item[] = [
      { id: 'a', tone: 'info' },
      { id: 'b', tone: 'idle' },
      { id: 'c', tone: 'success' },
    ]
    expect(someItemHasMinTone(items, getTone, 'warn')).toBe(false)
  })

  it('空配列 → false', () => {
    expect(someItemHasMinTone<Item>([], getTone, 'warn')).toBe(false)
  })

  it('filterItemsByMinTone(...).length > 0 と等価 invariant', () => {
    const items: Item[] = [
      { id: 'a', tone: 'success' },
      { id: 'b', tone: 'warn' },
      { id: 'c', tone: 'danger' },
      { id: 'd', tone: 'info' },
    ]
    for (const t of ['success', 'idle', 'info', 'warn', 'urgent', 'danger'] as ChipTone[]) {
      expect(someItemHasMinTone(items, getTone, t)).toBe(
        filterItemsByMinTone(items, getTone, t).length > 0,
      )
    }
  })

  it('short-circuit 動作 — match で getTone 呼び出し早期打切り', () => {
    const calls: string[] = []
    const items: Item[] = [
      { id: 'a', tone: 'danger' },
      { id: 'b', tone: 'success' },
      { id: 'c', tone: 'idle' },
    ]
    const trackedGetTone = (it: Item) => {
      calls.push(it.id)
      return it.tone
    }
    someItemHasMinTone(items, trackedGetTone, 'warn')
    // 'a' (danger) で match、'b'/'c' は呼ばれない
    expect(calls).toEqual(['a'])
  })
})
