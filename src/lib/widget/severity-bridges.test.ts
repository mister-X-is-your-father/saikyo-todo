import { describe, expect, it } from 'vitest'

import type { Severity } from './severity'
import {
  aggregateCountsBySeverity,
  assigneeLoadSeverityCountsToSeverityCounts,
  assigneeLoadSeverityToSeverity,
  buildFourStateHintChip,
  checklistStatusCountsToSeverityCounts,
  checklistStatusToSeverity,
  fourStateHintCountsToSeverityCounts,
  fourStateHintToSeverity,
  improvementSeverityCountsToSeverityCounts,
  improvementSeverityToSeverity,
  pdcaPhaseSeverityCountsToSeverityCounts,
  pdcaPhaseSeverityToSeverity,
  severeMildIdleToChipTone,
  severityToChipTone,
} from './severity-bridges'

describe('assigneeLoadSeverityToSeverity', () => {
  it('overloaded → danger', () => {
    expect(assigneeLoadSeverityToSeverity('overloaded')).toBe('danger')
  })
  it('busy → warn', () => {
    expect(assigneeLoadSeverityToSeverity('busy')).toBe('warn')
  })
  it('normal → info', () => {
    expect(assigneeLoadSeverityToSeverity('normal')).toBe('info')
  })
  it('light → ok', () => {
    expect(assigneeLoadSeverityToSeverity('light')).toBe('ok')
  })
})

describe('pdcaPhaseSeverityToSeverity', () => {
  it('overdue → danger', () => {
    expect(pdcaPhaseSeverityToSeverity('overdue')).toBe('danger')
  })
  it('stale → warn', () => {
    expect(pdcaPhaseSeverityToSeverity('stale')).toBe('warn')
  })
  it('on_track → info', () => {
    expect(pdcaPhaseSeverityToSeverity('on_track')).toBe('info')
  })
  it('fresh → info (on_track と同一)', () => {
    expect(pdcaPhaseSeverityToSeverity('fresh')).toBe('info')
  })
  it('closed → muted', () => {
    expect(pdcaPhaseSeverityToSeverity('closed')).toBe('muted')
  })
})

describe('improvementSeverityToSeverity', () => {
  it('high → danger', () => {
    expect(improvementSeverityToSeverity('high')).toBe('danger')
  })
  it('medium → warn', () => {
    expect(improvementSeverityToSeverity('medium')).toBe('warn')
  })
  it('low → info', () => {
    expect(improvementSeverityToSeverity('low')).toBe('info')
  })
})

describe('fourStateHintToSeverity', () => {
  it('idle → muted', () => {
    expect(fourStateHintToSeverity('idle')).toBe('muted')
  })
  it('mild → ok', () => {
    expect(fourStateHintToSeverity('mild')).toBe('ok')
  })
  it('moderate → warn', () => {
    expect(fourStateHintToSeverity('moderate')).toBe('warn')
  })
  it('severe → danger', () => {
    expect(fourStateHintToSeverity('severe')).toBe('danger')
  })
})

describe('buildFourStateHintChip', () => {
  it('classify + format から {label, severity, chipClass} 3 件を返す', () => {
    const r = buildFourStateHintChip(
      { count: 5 },
      (i) => (i.count >= 5 ? 'severe' : 'mild'),
      (i) => `${i.count} 件`,
    )
    expect(r.label).toBe('5 件')
    expect(r.severity).toBe('danger')
    expect(r.chipClass).toContain('rose')
  })

  it('idle → muted (slate)', () => {
    const r = buildFourStateHintChip(
      0,
      () => 'idle',
      () => '空',
    )
    expect(r.severity).toBe('muted')
    expect(r.chipClass).toContain('slate')
  })
})

describe('checklistStatusToSeverity', () => {
  it('ok → ok (緑、合格)', () => {
    expect(checklistStatusToSeverity('ok')).toBe('ok')
  })

  it('warn → warn (黄、要注意)', () => {
    expect(checklistStatusToSeverity('warn')).toBe('warn')
  })

  it('fail → danger (赤、要対策)', () => {
    expect(checklistStatusToSeverity('fail')).toBe('danger')
  })
})

describe('checklistStatusCountsToSeverityCounts', () => {
  it('checklist counts を 5 段 severity counts に集約 (1:1)', () => {
    expect(
      checklistStatusCountsToSeverityCounts({
        ok: 5,
        warn: 2,
        fail: 1,
      }),
    ).toEqual({
      ok: 5,
      info: 0,
      warn: 2,
      danger: 1,
      muted: 0,
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(checklistStatusCountsToSeverityCounts({ ok: 0, warn: 0, fail: 0 })).toEqual({
      ok: 0,
      info: 0,
      warn: 0,
      danger: 0,
      muted: 0,
    })
  })

  it('info / muted bucket には出ない (checklist は 3 値)', () => {
    const r = checklistStatusCountsToSeverityCounts({ ok: 1, warn: 1, fail: 1 })
    expect(r.info).toBe(0)
    expect(r.muted).toBe(0)
  })

  it('合計が checklist 件数の合計と一致', () => {
    const counts = { ok: 5, warn: 2, fail: 1 }
    const sevCounts = checklistStatusCountsToSeverityCounts(counts)
    const total = counts.ok + counts.warn + counts.fail
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })
})

describe('improvementSeverityCountsToSeverityCounts', () => {
  it('improvement counts を 5 段 severity counts に集約', () => {
    expect(
      improvementSeverityCountsToSeverityCounts({
        high: 1,
        medium: 2,
        low: 3,
      }),
    ).toEqual({
      ok: 0,
      info: 3, // low
      warn: 2, // medium
      danger: 1, // high
      muted: 0,
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(improvementSeverityCountsToSeverityCounts({ high: 0, medium: 0, low: 0 })).toEqual({
      ok: 0,
      info: 0,
      warn: 0,
      danger: 0,
      muted: 0,
    })
  })

  it('ok / muted bucket には出ない (improvement は対応必要度 grade)', () => {
    const r = improvementSeverityCountsToSeverityCounts({ high: 1, medium: 1, low: 1 })
    expect(r.ok).toBe(0)
    expect(r.muted).toBe(0)
  })

  it('合計が improvement 件数の合計と一致', () => {
    const counts = { high: 1, medium: 2, low: 3 }
    const sevCounts = improvementSeverityCountsToSeverityCounts(counts)
    const total = counts.high + counts.medium + counts.low
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })
})

describe('assigneeLoadSeverityCountsToSeverityCounts', () => {
  it('assignee load counts を 5 段 severity counts に集約', () => {
    expect(
      assigneeLoadSeverityCountsToSeverityCounts({
        overloaded: 1,
        busy: 2,
        normal: 3,
        light: 4,
      }),
    ).toEqual({
      ok: 4, // light
      info: 3, // normal
      warn: 2, // busy
      danger: 1, // overloaded
      muted: 0,
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      assigneeLoadSeverityCountsToSeverityCounts({
        overloaded: 0,
        busy: 0,
        normal: 0,
        light: 0,
      }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('muted bucket には出ない (4 段全て担当ありの前提、unknown 扱いなし)', () => {
    const r = assigneeLoadSeverityCountsToSeverityCounts({
      overloaded: 1,
      busy: 1,
      normal: 1,
      light: 1,
    })
    expect(r.muted).toBe(0)
  })

  it('合計が assignee load 件数の合計と一致', () => {
    const counts = { overloaded: 1, busy: 2, normal: 3, light: 4 }
    const sevCounts = assigneeLoadSeverityCountsToSeverityCounts(counts)
    const total = counts.overloaded + counts.busy + counts.normal + counts.light
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })
})

describe('pdcaPhaseSeverityCountsToSeverityCounts', () => {
  it('PDCA phase counts を 5 段 severity counts に集約 (fresh + on_track が info に lossy 縮約)', () => {
    expect(
      pdcaPhaseSeverityCountsToSeverityCounts({
        overdue: 1,
        stale: 2,
        on_track: 3,
        fresh: 1,
        closed: 4,
      }),
    ).toEqual({
      ok: 0,
      info: 4, // on_track + fresh
      warn: 2, // stale
      danger: 1, // overdue
      muted: 4, // closed
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      pdcaPhaseSeverityCountsToSeverityCounts({
        overdue: 0,
        stale: 0,
        on_track: 0,
        fresh: 0,
        closed: 0,
      }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('ok bucket には出ない (cycle phase は進行段階軸であり達成度ではない)', () => {
    const r = pdcaPhaseSeverityCountsToSeverityCounts({
      overdue: 1,
      stale: 1,
      on_track: 1,
      fresh: 1,
      closed: 1,
    })
    expect(r.ok).toBe(0)
  })

  it('合計が phase 件数の合計と一致', () => {
    const counts = { overdue: 1, stale: 2, on_track: 3, fresh: 1, closed: 4 }
    const sevCounts = pdcaPhaseSeverityCountsToSeverityCounts(counts)
    const total = counts.overdue + counts.stale + counts.on_track + counts.fresh + counts.closed
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })
})

describe('fourStateHintCountsToSeverityCounts', () => {
  it('FourStateHint counts を 5 段 severity counts に集約', () => {
    expect(
      fourStateHintCountsToSeverityCounts({
        idle: 1,
        mild: 2,
        moderate: 3,
        severe: 1,
      }),
    ).toEqual({
      ok: 2, // mild
      info: 0,
      warn: 3, // moderate
      danger: 1, // severe
      muted: 1, // idle
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      fourStateHintCountsToSeverityCounts({ idle: 0, mild: 0, moderate: 0, severe: 0 }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('info bucket には出ない (4 状態 hint は 4 値、ニュートラル進行中の概念無し)', () => {
    const r = fourStateHintCountsToSeverityCounts({
      idle: 1,
      mild: 1,
      moderate: 1,
      severe: 1,
    })
    expect(r.info).toBe(0)
  })

  it('合計が hint 件数の合計と一致', () => {
    const counts = { idle: 1, mild: 2, moderate: 3, severe: 1 }
    const sevCounts = fourStateHintCountsToSeverityCounts(counts)
    const total = counts.idle + counts.mild + counts.moderate + counts.severe
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(total)
  })
})

describe('severityToChipTone (iter1039)', () => {
  it('ok → success (positive framing、緑)', () => {
    expect(severityToChipTone('ok')).toBe('success')
  })

  it('info → info (青、進行中)', () => {
    expect(severityToChipTone('info')).toBe('info')
  })

  it('warn → warn (黄、注意)', () => {
    expect(severityToChipTone('warn')).toBe('warn')
  })

  it('danger → danger (赤、要対応)', () => {
    expect(severityToChipTone('danger')).toBe('danger')
  })

  it('muted → idle (灰、attention 不要)', () => {
    expect(severityToChipTone('muted')).toBe('idle')
  })

  it('全 5 値が網羅される', () => {
    const all = ['ok', 'info', 'warn', 'danger', 'muted'] as const
    for (const s of all) {
      expect(typeof severityToChipTone(s)).toBe('string')
    }
  })
})

describe('severeMildIdleToChipTone (iter1055)', () => {
  it('severe → danger', () => {
    expect(severeMildIdleToChipTone('severe')).toBe('danger')
  })

  it('mild → warn', () => {
    expect(severeMildIdleToChipTone('mild')).toBe('warn')
  })

  it('idle → idle', () => {
    expect(severeMildIdleToChipTone('idle')).toBe('idle')
  })

  it('全 3 値が ChipTone vocab を返す', () => {
    const all: Array<'severe' | 'mild' | 'idle'> = ['severe', 'mild', 'idle']
    for (const s of all) {
      expect(typeof severeMildIdleToChipTone(s)).toBe('string')
    }
  })
})

describe('aggregateCountsBySeverity (iter1430 — 汎用 domain → severity counts bridge)', () => {
  it('空 counts → 全 Severity bucket 0', () => {
    const out = aggregateCountsBySeverity<string>({}, () => 'ok')
    expect(out).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('単一 key → 該当 bucket に集約', () => {
    const counts = { a: 5 }
    const out = aggregateCountsBySeverity<'a'>(counts, () => 'danger')
    expect(out).toEqual({ ok: 0, info: 0, warn: 0, danger: 5, muted: 0 })
  })

  it('複数 key + 同 Severity に縮約 → 加算', () => {
    // 'a' / 'b' とも 'info' に縮約 (= pdca 'on_track' + 'fresh' → 'info' と同 pattern)
    const counts = { a: 3, b: 7 }
    const out = aggregateCountsBySeverity<'a' | 'b'>(counts, () => 'info')
    expect(out.info).toBe(10)
  })

  it('既存 checklistStatusCountsToSeverityCounts と同一結果 (= refactor 後 semantics 不変)', () => {
    const counts = { ok: 2, warn: 3, fail: 5 }
    const viaGeneric = aggregateCountsBySeverity(counts, checklistStatusToSeverity)
    const viaSpecific = checklistStatusCountsToSeverityCounts(counts)
    expect(viaGeneric).toEqual(viaSpecific)
  })

  it('既存 fourStateHintCountsToSeverityCounts と同一結果', () => {
    const counts = { idle: 1, mild: 2, moderate: 3, severe: 4 }
    const viaGeneric = aggregateCountsBySeverity(counts, fourStateHintToSeverity)
    const viaSpecific = fourStateHintCountsToSeverityCounts(counts)
    expect(viaGeneric).toEqual(viaSpecific)
  })

  it('既存 pdcaPhaseSeverityCountsToSeverityCounts と同一結果 (= lossy on_track+fresh → info 合算)', () => {
    const counts = { overdue: 1, stale: 2, on_track: 3, fresh: 4, closed: 5 }
    const viaGeneric = aggregateCountsBySeverity(counts, pdcaPhaseSeverityToSeverity)
    const viaSpecific = pdcaPhaseSeverityCountsToSeverityCounts(counts)
    expect(viaGeneric).toEqual(viaSpecific)
    // 'on_track' (3) + 'fresh' (4) = 'info' bucket に 7
    expect(viaGeneric.info).toBe(7)
  })

  it('入力 counts を mutate しない (immutable)', () => {
    const counts = { a: 1, b: 2 }
    const original = { ...counts }
    aggregateCountsBySeverity<'a' | 'b'>(counts, (k) => (k === 'a' ? 'danger' : ('ok' as Severity)))
    expect(counts).toEqual(original)
  })
})
