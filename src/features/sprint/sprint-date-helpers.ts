/**
 * Sprint UI で使う ISO 日付の純粋ヘルパ (iter265 で sprints-panel.tsx 786 行
 * から抽出 / 単体テスト化)。
 *
 * すべて `YYYY-MM-DD` 文字列入出力。曜日 / 加減算 / 差分は UTC 基準で計算し、
 * クライアント TZ に依存しない (sprint 開始日 / 締切日は worker / DB と同じ
 * カレンダー日で揃える必要があるため)。
 *
 * - `dayOfWeekJa(iso)` — `2026-04-27` → `月`
 * - `formatDateJa(iso)` — `2026-04-27` → `2026-04-27 (月)`
 * - `todayISO()` — 端末ローカル TZ の今日 (sprint 起動 form 初期値用)
 * - `nextDowISO(targetDow)` — 今日以降で targetDow (0=日 ... 6=土) 一致する直近日
 * - `addDaysISO(iso, days)` — UTC 日数加算
 * - `isoDaysFromNow(days)` — 端末 TZ の今日 + days
 * - `daysBetween(fromISO, toISO)` — UTC 差分日数 (round)
 */

/** 曜日名 (日=0, 月=1, ..., 土=6)。UI の select / aria-label 共用 */
export const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

/** "2026-04-27" → "月" */
export function dayOfWeekJa(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return DOW_JA[dow] ?? ''
}

/** "2026-04-27" → "2026-04-27 (月)" */
export function formatDateJa(iso: string): string {
  const dow = dayOfWeekJa(iso)
  return dow ? `${iso} (${dow})` : iso
}

/** 端末ローカル TZ の今日を `YYYY-MM-DD` で返す */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 今日以降で曜日 (0=日, 1=月, …, 6=土) と一致する直近日を ISO で返す。
 * 今日がその曜日なら今日を返す (= 即時 Sprint 起動可能)。
 */
export function nextDowISO(targetDow: number): string {
  const d = new Date()
  const cur = d.getDay()
  const delta = (targetDow - cur + 7) % 7
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ISO 日付 + days 日 (UTC 加算で TZ 依存しない) */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

/** 端末ローカル TZ の今日 + days */
export function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** UTC 基準の差分日数 (Math.round で TZ ずれを吸収) */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const from = Date.UTC(fy!, fm! - 1, fd!)
  const to = Date.UTC(ty!, tm! - 1, td!)
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}
