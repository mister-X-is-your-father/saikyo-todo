/**
 * Workspace timezone-aware cron evaluator.
 *
 * Concept: pg-boss schedules at a fine UTC granularity (e.g. `*\/15 * * * *`).
 * On each tick the worker iterates workspaces and asks
 *   "has the **localized** cron expression (e.g. `0 9 * * *` in Asia/Tokyo)
 *    fired since the last time we processed this workspace?"
 *
 * We answer that by parsing the cron with `cron-parser` (tz-aware via Luxon)
 * and comparing the most-recent firing instant to the persisted `lastFiredAt`.
 *
 * Pure module (no DB / no I/O) — easy to unit-test across timezones / DST.
 *
 * Tick frequency vs. accuracy: with `*\/15 * * * *` ticks the worst-case latency
 * for a 09:00 local fire is ~15 min. Good enough for daily / weekly fan-outs.
 */

import { CronExpressionParser } from 'cron-parser'

/**
 * Default lookback for first-time workspaces (lastFiredAt = null).
 * If the cron has fired anywhere within this window we still consider it
 * "should fire now" — otherwise we'd miss the very first tick after a workspace
 * is created. 24h works for daily and weekly schedules alike.
 */
export const DEFAULT_FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000

export interface ShouldFireParams {
  /** Standard 5-field cron expression in workspace-local time, e.g. `'0 9 * * *'`. */
  cronExpr: string
  /** IANA timezone, e.g. `'Asia/Tokyo'` or `'America/New_York'`. */
  tz: string
  /** Current instant (UTC Date). */
  now: Date
  /**
   * Last time we successfully processed this workspace's tick (UTC Date), or
   * `null` if we've never processed it. `null` triggers the first-run lookback.
   */
  lastFiredAt: Date | null
  /** Override the default first-run lookback (mostly for tests). */
  firstRunLookbackMs?: number
}

/**
 * Returns whether the given cron expression has fired in `tz` between
 * `lastFiredAt` (exclusive) and `now` (inclusive).
 *
 * For `lastFiredAt = null` we consider the cron "fired" if its most-recent
 * scheduled instant lies within `firstRunLookbackMs` of `now`.
 */
export function shouldFireForWorkspace(params: ShouldFireParams): boolean {
  const { cronExpr, tz, now, lastFiredAt } = params
  const firstRunLookbackMs = params.firstRunLookbackMs ?? DEFAULT_FIRST_RUN_LOOKBACK_MS

  let prevFire: Date
  try {
    // cron-parser's prev() is strictly less than currentDate. We want the
    // most recent occurrence ≤ now (so that hitting the tick exactly at the
    // fire instant counts). Adding 1s to currentDate makes prev() inclusive.
    const expr = CronExpressionParser.parse(cronExpr, {
      tz,
      currentDate: new Date(now.getTime() + 1000),
    })
    prevFire = expr.prev().toDate()
  } catch (e) {
    // Defensive: invalid cron / tz. Don't fire — log & swallow at caller.
    console.error(`[cron-tz] failed to parse cron='${cronExpr}' tz='${tz}':`, e)
    return false
  }

  if (lastFiredAt === null) {
    // First run: fire if the most-recent scheduled instant is within the lookback.
    return now.getTime() - prevFire.getTime() <= firstRunLookbackMs
  }

  // Subsequent runs: fire if a new occurrence happened since lastFiredAt.
  return prevFire.getTime() > lastFiredAt.getTime()
}
