import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatElapsed, useActiveTimerStore } from './active-timer'

describe('useActiveTimerStore (iter 247)', () => {
  beforeEach(() => {
    // store reset
    useActiveTimerStore.setState({
      itemId: null,
      itemTitle: null,
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

  it('stop は { itemId, itemTitle, elapsedMs } を返してクリアする', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    useActiveTimerStore.getState().start({ itemId: 'i-1', itemTitle: 'T' })
    vi.setSystemTime(1_700_000_007_000)
    const result = useActiveTimerStore.getState().stop()
    expect(result).toEqual({ itemId: 'i-1', itemTitle: 'T', elapsedMs: 7000 })
    const s = useActiveTimerStore.getState()
    expect(s.itemId).toBeNull()
    expect(s.running).toBe(false)
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
