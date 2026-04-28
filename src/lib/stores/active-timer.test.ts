import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatElapsed, formatVariance, useActiveTimerStore } from './active-timer'

describe('useActiveTimerStore (iter 247)', () => {
  beforeEach(() => {
    // store reset
    useActiveTimerStore.setState({
      itemId: null,
      itemTitle: null,
      estimateMinutes: null,
      running: false,
      startedAt: null,
      pausedAccumulatedMs: 0,
      mode: 'stopwatch',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start で itemId / itemTitle / running=true / startedAt=now が入る', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T1' })
    const s = useActiveTimerStore.getState()
    expect(s.itemId).toBe('i-1')
    expect(s.itemTitle).toBe('T1')
    expect(s.running).toBe(true)
    expect(s.startedAt).toBe(1_700_000_000_000)
    expect(s.pausedAccumulatedMs).toBe(0)
  })

  it('elapsedMs: running 中は (now - startedAt) を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    vi.setSystemTime(1_700_000_005_500) // +5.5s
    expect(useActiveTimerStore.getState().elapsedMs()).toBe(5500)
  })

  it('pause で running=false / pausedAccumulatedMs にこれまでの値が積まれる', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    vi.setSystemTime(1_700_000_010_000) // +10s
    useActiveTimerStore.getState().pause()
    const s = useActiveTimerStore.getState()
    expect(s.running).toBe(false)
    expect(s.pausedAccumulatedMs).toBe(10_000)
    expect(s.startedAt).toBeNull()
  })

  it('resume で running=true / startedAt=now にリセット (累積は持つ)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    vi.setSystemTime(1_700_000_010_000)
    useActiveTimerStore.getState().pause()
    vi.setSystemTime(1_700_000_020_000) // +10s 後に resume
    useActiveTimerStore.getState().resume()
    const s = useActiveTimerStore.getState()
    expect(s.running).toBe(true)
    expect(s.startedAt).toBe(1_700_000_020_000)
    expect(s.pausedAccumulatedMs).toBe(10_000)
  })

  it('elapsedMs: pause + resume 後は (paused 蓄積 + 再開後の経過) の合計', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    vi.setSystemTime(1_700_000_010_000) // +10s
    useActiveTimerStore.getState().pause() // accumulated 10s
    vi.setSystemTime(1_700_000_020_000)
    useActiveTimerStore.getState().resume()
    vi.setSystemTime(1_700_000_023_000) // +3s after resume
    expect(useActiveTimerStore.getState().elapsedMs()).toBe(13_000) // 10 + 3
  })

  it('stop は { itemId, itemTitle, elapsedMs, estimateMinutes } を返してクリアする', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    vi.setSystemTime(1_700_000_007_000)
    const result = useActiveTimerStore.getState().stop()
    expect(result).toEqual({
      itemId: 'i-1',
      itemTitle: 'T',
      elapsedMs: 7000,
      estimateMinutes: null,
    })
    const s = useActiveTimerStore.getState()
    expect(s.itemId).toBeNull()
    expect(s.running).toBe(false)
    expect(s.estimateMinutes).toBeNull()
  })

  // iter254 ai-automation: estimate を timer に乗せて variance を Stop 時に返す
  it('start で estimateMinutes を保持し、stop の戻り値に含む', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T', estimateMinutes: 30 })
    expect(useActiveTimerStore.getState().estimateMinutes).toBe(30)
    vi.setSystemTime(1_700_000_120_000) // +2 min
    const result = useActiveTimerStore.getState().stop()
    expect(result?.estimateMinutes).toBe(30)
    expect(result?.elapsedMs).toBe(120_000)
  })

  it('itemId が無い時 stop は null を返す (no-op)', () => {
    expect(useActiveTimerStore.getState().stop()).toBeNull()
  })

  it('isActive は itemId が non-null なら true', () => {
    expect(useActiveTimerStore.getState().isActive()).toBe(false)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    expect(useActiveTimerStore.getState().isActive()).toBe(true)
  })
})

describe('formatElapsed (iter 247)', () => {
  it('0 ms → 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00')
  })
  it('59 秒 → 00:59', () => {
    expect(formatElapsed(59_000)).toBe('00:59')
  })
  it('25 分 → 25:00', () => {
    expect(formatElapsed(25 * 60_000)).toBe('25:00')
  })
  it('1 時間以上は HH:MM:SS', () => {
    expect(formatElapsed((1 * 3600 + 23 * 60 + 45) * 1000)).toBe('1:23:45')
  })
  it('負の入力は 00:00 (clamp)', () => {
    expect(formatElapsed(-1000)).toBe('00:00')
  })
})

// iter254 ai-automation: timer Stop 時の variance toast 用フォーマッタ
describe('formatVariance', () => {
  it('estimate なし → 「(見積なし)」 + bias=unknown', () => {
    const r = formatVariance(25, null)
    expect(r.message).toBe('実測 25分 (見積なし)')
    expect(r.bias).toBe('unknown')
  })

  it('estimate=0 も「(見積なし)」扱い', () => {
    expect(formatVariance(25, 0).bias).toBe('unknown')
  })

  it('actual < estimate の許容外 → 見積内 / under', () => {
    // estimate 30, actual 20, tolerance=3 (10%) → diff=-10, < -3 → under
    const r = formatVariance(20, 30)
    expect(r.message).toBe('予定 30分 / 実測 20分 (-10分、見積内)')
    expect(r.bias).toBe('under')
  })

  it('actual ≈ estimate → ほぼ見積通り / on', () => {
    // estimate 30, actual 32, tolerance=3 → diff=+2, |2|≤3 → on
    const r = formatVariance(32, 30)
    expect(r.message).toBe('予定 30分 / 実測 32分 (+2分、ほぼ見積通り)')
    expect(r.bias).toBe('on')
  })

  it('actual = estimate ちょうど → ±0 / on', () => {
    const r = formatVariance(30, 30)
    expect(r.message).toBe('予定 30分 / 実測 30分 (±0分、ほぼ見積通り)')
    expect(r.bias).toBe('on')
  })

  it('actual >> estimate → 見積超過 / over', () => {
    // estimate 30, actual 50, tolerance=3 → diff=+20, > 3 → over
    const r = formatVariance(50, 30)
    expect(r.message).toBe('予定 30分 / 実測 50分 (+20分、見積超過)')
    expect(r.bias).toBe('over')
  })

  it('小さい estimate でも tolerance は最低 1 分', () => {
    // estimate 5, actual 6, tolerance=max(1, round(0.5))=1 → diff=+1, |1|≤1 → on
    expect(formatVariance(6, 5).bias).toBe('on')
    // diff=+2, > 1 → over
    expect(formatVariance(7, 5).bias).toBe('over')
  })
})
