import { describe, expect, it } from 'vitest'

import {
  computeWorkspaceMomentum,
  formatWorkspaceMomentumCompactJa,
  formatWorkspaceMomentumJa,
  momentumChipClasses,
  momentumDirectionToTrend,
  type MomentumFields,
  momentumTone,
} from './momentum'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const TODAY = new Date('2026-04-29T00:00:00Z')

function daysAgo(n: number): string {
  return new Date(TODAY.getTime() - n * MS_PER_DAY + 12 * 60 * 60 * 1000).toISOString()
}

describe('computeWorkspaceMomentum', () => {
  it('returns idle when items empty', () => {
    const m = computeWorkspaceMomentum([], {}, TODAY)
    expect(m.direction).toBe('idle')
    expect(m.intake).toBe(0)
    expect(m.done).toBe(0)
    expect(m.net).toBe(0)
    expect(m.windowDays).toBe(7)
  })

  it('returns idle for malformed today', () => {
    const m = computeWorkspaceMomentum([{ createdAt: daysAgo(1), doneAt: null }], {}, 'garbage')
    expect(m.direction).toBe('idle')
  })

  it('returns empty for windowDays <= 0', () => {
    const m = computeWorkspaceMomentum(
      [{ createdAt: daysAgo(0), doneAt: null }],
      {
        windowDays: 0,
      },
      TODAY,
    )
    expect(m.direction).toBe('idle')
    expect(m.windowDays).toBe(0)
  })

  it('counts intake (createdAt within window)', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(0), doneAt: null },
      { createdAt: daysAgo(3), doneAt: null },
      { createdAt: daysAgo(10), doneAt: null }, // outside 7-day window
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(2)
    expect(m.done).toBe(0)
    expect(m.net).toBe(2)
    expect(m.direction).toBe('growing')
  })

  it('counts done (doneAt within window)', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(20), doneAt: daysAgo(0) },
      { createdAt: daysAgo(20), doneAt: daysAgo(2) },
      { createdAt: daysAgo(20), doneAt: daysAgo(15) }, // outside window
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(0)
    expect(m.done).toBe(2)
    expect(m.net).toBe(-2)
    expect(m.direction).toBe('shrinking')
  })

  it('detects "balanced" within 20% threshold', () => {
    const items: MomentumFields[] = [
      // 6 intake / 6 done in 7 days → ratio 0%
      ...Array.from({ length: 6 }, () => ({ createdAt: daysAgo(2), doneAt: null })),
      ...Array.from({ length: 6 }, () => ({ createdAt: daysAgo(20), doneAt: daysAgo(2) })),
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(6)
    expect(m.done).toBe(6)
    expect(m.direction).toBe('balanced')
  })

  it('detects "growing" when intake > done by >20%', () => {
    const items: MomentumFields[] = [
      ...Array.from({ length: 10 }, () => ({ createdAt: daysAgo(2), doneAt: null })),
      ...Array.from({ length: 5 }, () => ({ createdAt: daysAgo(20), doneAt: daysAgo(1) })),
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(10)
    expect(m.done).toBe(5)
    // ratio = 5/15 = 0.33 > 0.2
    expect(m.direction).toBe('growing')
  })

  it('detects "shrinking" when done > intake by >20%', () => {
    const items: MomentumFields[] = [
      ...Array.from({ length: 3 }, () => ({ createdAt: daysAgo(2), doneAt: null })),
      ...Array.from({ length: 8 }, () => ({ createdAt: daysAgo(20), doneAt: daysAgo(1) })),
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(3)
    expect(m.done).toBe(8)
    expect(m.direction).toBe('shrinking')
  })

  it('skips items with invalid createdAt and doneAt', () => {
    const items: MomentumFields[] = [
      { createdAt: 'not-a-date', doneAt: null },
      { createdAt: null, doneAt: 'garbage' },
      { createdAt: daysAgo(1), doneAt: null }, // valid
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(1)
    expect(m.done).toBe(0)
  })

  it('respects custom windowDays', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(0), doneAt: null },
      { createdAt: daysAgo(5), doneAt: null },
      { createdAt: daysAgo(20), doneAt: null }, // 30 days window includes
    ]
    const m = computeWorkspaceMomentum(items, { windowDays: 30 }, TODAY)
    expect(m.intake).toBe(3)
    expect(m.windowDays).toBe(30)
  })

  it('handles same item with both intake and done in window', () => {
    const items: MomentumFields[] = [{ createdAt: daysAgo(2), doneAt: daysAgo(0) }]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(1)
    expect(m.done).toBe(1)
    expect(m.net).toBe(0)
    expect(m.direction).toBe('balanced')
  })
})

describe('formatWorkspaceMomentumJa', () => {
  it('idle → 活動なし', () => {
    expect(
      formatWorkspaceMomentumJa({
        intake: 0,
        done: 0,
        net: 0,
        direction: 'idle',
        windowDays: 7,
      }),
    ).toBe('モメンタム: 直近 7 日 活動なし')
  })

  it('balanced → 安定 with counts', () => {
    expect(
      formatWorkspaceMomentumJa({
        intake: 6,
        done: 6,
        net: 0,
        direction: 'balanced',
        windowDays: 7,
      }),
    ).toBe('モメンタム: 直近 7 日 安定 (新規 6 / 完了 6)')
  })

  it('growing → +N 件 成長中', () => {
    expect(
      formatWorkspaceMomentumJa({
        intake: 10,
        done: 5,
        net: 5,
        direction: 'growing',
        windowDays: 7,
      }),
    ).toBe('モメンタム: 直近 7 日 +5 件 成長中 (新規 10 / 完了 5)')
  })

  it('shrinking → -N 件 縮小中', () => {
    expect(
      formatWorkspaceMomentumJa({
        intake: 3,
        done: 8,
        net: -5,
        direction: 'shrinking',
        windowDays: 7,
      }),
    ).toBe('モメンタム: 直近 7 日 -5 件 縮小中 (新規 3 / 完了 8)')
  })

  it('uses custom windowDays in label', () => {
    expect(
      formatWorkspaceMomentumJa({
        intake: 5,
        done: 5,
        net: 0,
        direction: 'balanced',
        windowDays: 30,
      }),
    ).toBe('モメンタム: 直近 30 日 安定 (新規 5 / 完了 5)')
  })
})

describe('integration: items → momentum → format', () => {
  it('connects compute → format', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(1), doneAt: null }, // intake
      { createdAt: daysAgo(3), doneAt: null }, // intake
      { createdAt: daysAgo(2), doneAt: daysAgo(0) }, // intake + done
      { createdAt: daysAgo(20), doneAt: daysAgo(1) }, // done only
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.intake).toBe(3)
    expect(m.done).toBe(2)
    expect(m.net).toBe(1)
    // ratio = 1/5 = 0.2 → boundary, BALANCED_THRESHOLD = 0.2 → < 0.2 = balanced threshold
    // since ratio === 0.2, NOT < 0.2, → growing (net > 0)
    expect(m.direction).toBe('growing')
    expect(formatWorkspaceMomentumJa(m)).toBe(
      'モメンタム: 直近 7 日 +1 件 成長中 (新規 3 / 完了 2)',
    )
  })
})

describe('momentumDirectionToTrend', () => {
  it('maps growing → up / shrinking → down / balanced → flat / idle → idle', () => {
    expect(momentumDirectionToTrend('growing')).toBe('up')
    expect(momentumDirectionToTrend('shrinking')).toBe('down')
    expect(momentumDirectionToTrend('balanced')).toBe('flat')
    expect(momentumDirectionToTrend('idle')).toBe('idle')
  })
})

describe('formatWorkspaceMomentumCompactJa (iter791 — chip / Slack 通知 用 短縮形)', () => {
  it('idle → 「モメンタム: 活動なし」 (count 省略)', () => {
    const m = computeWorkspaceMomentum([], {}, TODAY)
    expect(formatWorkspaceMomentumCompactJa(m)).toBe('モメンタム: 活動なし')
  })

  it('balanced → 「モメンタム: 安定 (±0)」 (件数差は表示しない)', () => {
    // intake=3 / done=3 で net=0 → ratio=0 → balanced (固定)
    const items: MomentumFields[] = [
      { createdAt: daysAgo(1), doneAt: null },
      { createdAt: daysAgo(2), doneAt: null },
      { createdAt: daysAgo(3), doneAt: null },
      { createdAt: daysAgo(20), doneAt: daysAgo(0) },
      { createdAt: daysAgo(20), doneAt: daysAgo(1) },
      { createdAt: daysAgo(20), doneAt: daysAgo(2) },
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.direction).toBe('balanced')
    expect(formatWorkspaceMomentumCompactJa(m)).toBe('モメンタム: 安定 (±0)')
  })

  it('growing → 「モメンタム: 成長 +N」 (件数のみ、内訳省略)', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(1), doneAt: null },
      { createdAt: daysAgo(2), doneAt: null },
      { createdAt: daysAgo(3), doneAt: null },
      { createdAt: daysAgo(20), doneAt: daysAgo(1) },
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.direction).toBe('growing')
    expect(formatWorkspaceMomentumCompactJa(m)).toBe(`モメンタム: 成長 +${m.net}`)
  })

  it('shrinking → 「モメンタム: 縮小 -N」 (sign 自動付与)', () => {
    const items: MomentumFields[] = [
      { createdAt: daysAgo(20), doneAt: daysAgo(0) },
      { createdAt: daysAgo(20), doneAt: daysAgo(1) },
      { createdAt: daysAgo(20), doneAt: daysAgo(2) },
      { createdAt: daysAgo(1), doneAt: null },
    ]
    const m = computeWorkspaceMomentum(items, {}, TODAY)
    expect(m.direction).toBe('shrinking')
    expect(formatWorkspaceMomentumCompactJa(m)).toBe(`モメンタム: 縮小 ${m.net}`)
  })
})

describe('momentumTone / momentumChipClasses (iter793 — graphical chip 配色)', () => {
  it('growing → warn (amber、backlog 増 = 警戒)', () => {
    expect(momentumTone('growing')).toBe('warn')
    expect(momentumChipClasses('growing').bgClass).toBe('bg-amber-50')
  })

  it('shrinking → success (emerald、backlog 縮小 = 改善)', () => {
    expect(momentumTone('shrinking')).toBe('success')
    expect(momentumChipClasses('shrinking').bgClass).toBe('bg-emerald-50')
  })

  it('balanced → info (blue、安定)', () => {
    expect(momentumTone('balanced')).toBe('info')
  })

  it('idle → idle (slate、活動なし)', () => {
    expect(momentumTone('idle')).toBe('idle')
    expect(momentumChipClasses('idle').bgClass).toBe('bg-slate-50')
  })
})
