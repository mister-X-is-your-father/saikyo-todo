/**
 * iter280 refactor: ISO 日付 (`YYYY-MM-DD`) の汎用ヘルパ — 端末ローカル TZ で
 * 「今日」を計算する関数を 1 か所に集約。
 *
 * 抽出元 (5 callsite で重複していた `todayISO()` inline 定義):
 *  - src/components/workspace/active-timer-panel.tsx
 *  - src/components/workspace/today-view.tsx
 *  - src/components/workspace/dashboard-view.tsx
 *  - src/components/time-entry/create-time-entry-form.tsx
 *  - src/components/workspace/goals-panel.tsx (こちらは `isoDaysFromNow`)
 *  - src/features/sprint/sprint-date-helpers.ts (canonical 実装、本 file が継承)
 *
 * sprint-date-helpers.ts は本 module から re-export する形で後方互換を維持。
 * sprint-domain でない caller は `@/lib/date/iso` から import する。
 *
 * - `todayISO(now?)`: 端末ローカル TZ の今日を `YYYY-MM-DD` で
 * - `isoDaysFromNow(days, now?)`: 今日 (now) からの相対日付 ISO
 *
 * `now` 引数は省略可で、省略時は `new Date()` を呼ぶ。決定論テスト用に
 * 固定 Date を渡せるようにしてある (sprint-date-helpers iter265b と同じ方針)。
 */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ローカル時刻の Date を `YYYY-MM-DD` に。`now` 省略で現在 */
export function todayISO(now: Date = new Date()): string {
  return formatLocal(now)
}

/** 今日 (now) からの相対日付 ISO (ローカル基準)。 */
export function isoDaysFromNow(days: number, now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return formatLocal(d)
}
