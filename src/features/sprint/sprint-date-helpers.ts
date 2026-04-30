/**
 * Sprint UI で使う ISO 日付の純粋ヘルパ (iter265 で sprints-panel.tsx 786 行
 * から抽出 / 単体テスト化、iter265b で deterministic + fail-soft 強化)。
 *
 * すべて `YYYY-MM-DD` 文字列入出力。曜日 / 加減算 / 差分は UTC 基準で計算し、
 * クライアント TZ に依存しない (sprint 開始日 / 締切日は worker / DB と同じ
 * カレンダー日で揃える必要があるため)。
 *
 * - `dayOfWeekJa(iso)` — `2026-04-27` → `月`
 * - `formatDateJa(iso)` — `2026-04-27` → `2026-04-27 (月)`
 * - `todayISO(now?)` — 端末ローカル TZ の今日 (sprint 起動 form 初期値用)
 * - `nextDowISO(targetDow, now?)` — 今日以降で targetDow (0=日 ... 6=土) 一致する直近日
 * - `addDaysISO(iso, days)` — UTC 日数加算
 * - `isoDaysFromNow(days, now?)` — 端末 TZ の今日 + days
 * - `daysBetween(fromISO, toISO)` — UTC 差分日数 (round)
 *
 * iter265b 強化:
 * - `now: Date = new Date()` 引数化で決定論テスト可能
 * - 不正 ISO (`'garbage'`, `'2026-13-99'`, `'2026/04/27'`, 空) を fail-soft
 *   (`addDaysISO` → そのまま、`daysBetween` → 0、`dayOfWeekJa` → `''`)
 * - `nextDowISO` の範囲外 dow (-1 / 7 / 1.5) は今日にフォールバック
 * - 内部 `parseIsoDate` で範囲検査 (1000-9999 / 1-12 / 1-31) を一元化
 */

import { MS_PER_DAY } from '@/lib/date/iso'

/** 曜日名 (日=0, 月=1, ..., 土=6)。UI の select / aria-label 共用 */
export const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const
export type DowJa = (typeof DOW_JA)[number]

/** "2026-04-27" → "月"。不正 ISO は `''` (fail-soft) */
export function dayOfWeekJa(iso: string): DowJa | '' {
  const parts = parseIsoDate(iso)
  if (!parts) return ''
  const dow = new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()
  return DOW_JA[dow] ?? ''
}

/** "2026-04-27" → "2026-04-27 (月)"。不正 ISO はそのまま返す */
export function formatDateJa(iso: string): string {
  const dow = dayOfWeekJa(iso)
  return dow ? `${iso} (${dow})` : iso
}

/** 端末ローカル TZ の今日を `YYYY-MM-DD` で返す。`now` 省略で現在時刻 */
export function todayISO(now: Date = new Date()): string {
  return formatLocal(now)
}

/**
 * 今日以降で曜日 (0=日, 1=月, …, 6=土) と一致する直近日を ISO で返す。
 * 今日がその曜日なら今日を返す (= 即時 Sprint 起動可能)。
 * 範囲外 dow は今日にフォールバック (defensive)。
 */
export function nextDowISO(targetDow: number, now: Date = new Date()): string {
  if (!Number.isInteger(targetDow) || targetDow < 0 || targetDow > 6) return todayISO(now)
  const cur = now.getDay()
  const delta = (targetDow - cur + 7) % 7
  const d = new Date(now)
  d.setDate(d.getDate() + delta)
  return formatLocal(d)
}

/** ISO 日付 + days 日 (UTC 加算で TZ 依存しない)。不正 ISO はそのまま */
export function addDaysISO(iso: string, days: number): string {
  const parts = parseIsoDate(iso)
  if (!parts) return iso
  const dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** 端末ローカル TZ の今日 + days。`now` 省略で現在時刻 */
export function isoDaysFromNow(days: number, now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return formatLocal(d)
}

/** UTC 基準の差分日数 (Math.round で TZ ずれを吸収)。不正 ISO は 0 */
export function daysBetween(fromISO: string, toISO: string): number {
  const f = parseIsoDate(fromISO)
  const t = parseIsoDate(toISO)
  if (!f || !t) return 0
  const fromUTC = Date.UTC(f.y, f.m - 1, f.d)
  const toUTC = Date.UTC(t.y, t.m - 1, t.d)
  return Math.round((toUTC - fromUTC) / MS_PER_DAY)
}

// --- internal helpers ---

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  if (typeof iso !== 'string') return null
  const parts = iso.split('-')
  if (parts.length !== 3) return null
  const [ys, ms, ds] = parts
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return { y, m, d }
}
