/**
 * Pure tests for shouldFireForWorkspace.
 * No DB / no Supabase — only timezone arithmetic.
 */
import { describe, expect, it } from 'vitest'

import { shouldFireForWorkspace } from './cron-tz'

describe('shouldFireForWorkspace — daily 09:00 local', () => {
  it('JST 09:00 fires at UTC 00:00 (the same instant)', () => {
    // 2026-04-26 09:00 JST == 2026-04-26 00:00 UTC.
    // First run with lastFiredAt=null and the cron fired ~0s ago → fire.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-26T00:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(true)
  })

  it('JST 09:00 does NOT fire at UTC 22:00 the previous day', () => {
    // 2026-04-25 22:00 UTC == 2026-04-26 07:00 JST → cron (09:00 JST) hasn't
    // fired today; the previous occurrence was 2026-04-25 09:00 JST = 2026-04-25 00:00 UTC,
    // i.e. 22h ago which IS within the 24h first-run lookback by default.
    // To verify "no double-fire within an hour", check with lastFiredAt set to earlier today.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-25T22:00:00Z'),
        lastFiredAt: new Date('2026-04-25T00:00:00Z'), // already processed this morning's fire
      }),
    ).toBe(false)
  })

  it('America/New_York 09:00 fires at UTC 13:00 during EDT (April, DST active)', () => {
    // 2026-04-26 09:00 EDT == 2026-04-26 13:00 UTC.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'America/New_York',
        now: new Date('2026-04-26T13:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(true)
  })

  it('America/New_York 09:00 fires at UTC 14:00 during EST (January, no DST)', () => {
    // 2026-01-15 09:00 EST == 2026-01-15 14:00 UTC.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'America/New_York',
        now: new Date('2026-01-15T14:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(true)
  })

  it('does not double-fire within the same hour for the same workspace', () => {
    // 09:00 JST fired at 00:00 UTC. Fifteen min later (00:15 UTC) the tick
    // runs again — must NOT re-fire because lastFiredAt = 00:05 UTC > 00:00 UTC.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-26T00:15:00Z'),
        lastFiredAt: new Date('2026-04-26T00:05:00Z'),
      }),
    ).toBe(false)
  })

  it('lastFiredAt = null fires immediately when cron has fired within 24h', () => {
    // Cron last fired 12h ago → within 24h lookback → fire.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-26T12:00:00Z'), // 21:00 JST, prev fire = 09:00 JST today
        lastFiredAt: null,
      }),
    ).toBe(true)
  })

  it('lastFiredAt = null does NOT fire if cron last fired beyond the lookback window', () => {
    // Force a 1h lookback. Prev fire = 09:00 JST = 00:00 UTC, now = 12:00 UTC.
    // Difference = 12h > 1h → don't fire (we missed it; admin can backfill).
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-26T12:00:00Z'),
        lastFiredAt: null,
        firstRunLookbackMs: 60 * 60 * 1000, // 1h
      }),
    ).toBe(false)
  })

  it('fires the day after, when lastFiredAt is yesterday', () => {
    // Yesterday's fire processed at 00:00 UTC (= 09:00 JST 2026-04-25).
    // Now is the next day at 00:01 UTC (= 09:01 JST 2026-04-26).
    // Prev fire = 2026-04-26 00:00 UTC > lastFiredAt (2026-04-25 00:00 UTC) → fire.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-26T00:01:00Z'),
        lastFiredAt: new Date('2026-04-25T00:00:30Z'),
      }),
    ).toBe(true)
  })
})

describe('shouldFireForWorkspace — weekly Mon 09:00 local', () => {
  it('JST Mon 09:00 fires on Monday 00:00 UTC', () => {
    // 2026-04-27 (Monday) 09:00 JST == 2026-04-27 00:00 UTC.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * 1',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-27T00:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(true)
  })

  it('JST Mon 09:00 does not fire on Tuesday with last week processed', () => {
    // Last fired = 2026-04-20 00:00 UTC (last Monday's JST 09:00).
    // Now = 2026-04-21 (Tuesday) 06:00 UTC. Prev fire = same as lastFiredAt → no new fire.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * 1',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-21T06:00:00Z'),
        lastFiredAt: new Date('2026-04-20T00:00:00Z'),
      }),
    ).toBe(false)
  })

  it('America/New_York Mon 09:00 fires on Monday 13:00 UTC (EDT)', () => {
    // 2026-04-27 (Monday) 09:00 EDT == 2026-04-27 13:00 UTC.
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * 1',
        tz: 'America/New_York',
        now: new Date('2026-04-27T13:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(true)
  })
})

describe('shouldFireForWorkspace — defensive', () => {
  it('returns false on invalid cron expression', () => {
    expect(
      shouldFireForWorkspace({
        cronExpr: 'not a cron',
        tz: 'Asia/Tokyo',
        now: new Date('2026-04-26T00:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(false)
  })

  it('returns false on invalid timezone', () => {
    expect(
      shouldFireForWorkspace({
        cronExpr: '0 9 * * *',
        tz: 'Mars/Olympus_Mons',
        now: new Date('2026-04-26T00:00:00Z'),
        lastFiredAt: null,
      }),
    ).toBe(false)
  })
})
