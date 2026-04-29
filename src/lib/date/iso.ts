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

/**
 * iter360 refactor: 1 日 = 24 \* 60 \* 60 \* 1000 ms 定数。`features/item/` 配下で
 * `MS_PER_DAY` / `DAY_MS` の同一定義 5 件 + inline `(24 * 60 * 60 * 1000)` 8 件
 * 計 13 callsite が散らばっていたので 1 source of truth に集約。caller は
 * `import { MS_PER_DAY } from '@/lib/date/iso'` で参照。
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * iter340 refactor: ローカル TZ の Date を `YYYY-MM-DD` に整形。
 *
 * `velocity.ts#formatLocalISO` / `daily-summary.ts#formatISODate` /
 * `sprint-date-helpers.ts#formatLocal` で 4 callsite (本 file の private
 * `formatLocal` 含む) 同一実装が重複していたので集約。`todayISO` /
 * `isoDaysFromNow` は本関数を内部で呼ぶ。caller は validated Date 前提
 * (NaN time の不正 Date を渡すと `'NaN-NaN-NaN'` を返すが behavior 互換)。
 */
export function formatLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ローカル時刻の Date を `YYYY-MM-DD` に。`now` 省略で現在 */
export function todayISO(now: Date = new Date()): string {
  return formatLocalISO(now)
}

/** 今日 (now) からの相対日付 ISO (ローカル基準)。 */
export function isoDaysFromNow(days: number, now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return formatLocalISO(d)
}

/**
 * iter340 refactor: Date を「ローカル TZ の 0:00:00」に揃えた新 Date を返す
 * fail-soft helper。`velocity.ts` / `due-proximity.ts` / `daily-summary.ts` で
 * 3 callsite (signature が微妙に違うが core ロジックは同一) 重複していたので
 * 集約。最も defensive な `daily-summary` 系 (NaN/null/undefined → null) に
 * 揃える。
 *
 * caller がすべて null チェックを伴うので互換 (due-proximity も `if (!todayDate ...)
 * return ...` で受けている)。
 */
export function toLocalMidnight(d: Date | null | undefined): Date | null {
  if (!d || Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * iter345 refactor: Date を **UTC 基準** で `YYYY-MM-DD` に整形する糖衣。
 *
 * `formatLocalISO` (ローカル TZ) と対称。`new Date().toISOString().slice(0, 10)` の
 * 1 行 idiom が dashboard / pdca / budget / agent / heartbeat 等で 10+ callsite に
 * 散在していたので、明示的な API として固定する。caller は意図 (UTC vs ローカル)
 * を import 名で判別できる。
 *
 * 不正 Date (NaN time) は `'Invalid Date'.slice(0,10) = 'Invalid Da'` を返す可能性
 * があるが既存 idiom と完全互換 (caller 側で validated Date 前提)。
 */
export function formatUtcISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** UTC 基準の今日 (`YYYY-MM-DD`)。`now` 省略で現在 */
export function todayUtcISO(now: Date = new Date()): string {
  return formatUtcISO(now)
}

/**
 * iter360 refactor: ISO `YYYY-MM-DD` 文字列が有効か (= year-month-day prefix が
 * range 内か) を判定。`due-date-coverage` / `must-hygiene` で 2 callsite に重複
 * していたので集約。
 *
 * 仕様:
 *  - input が `YYYY-MM-DD...` の prefix を持ち、month が 1..12、day が 1..31
 *    なら true (= 厳密にはうるう年 / 30/31 日月の day も受け入れる、Date 構築側で
 *    overflow 動作するため)
 *  - 形式不一致 / 範囲外 → false
 *
 * caller の用途は「dueDate っぽい文字列か」を fail-soft 判定するため、厳密 calendar
 * 検証ではなく shape check 程度で十分。
 */
export function isValidIsoDate(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  const mo = Number(m[2])
  const d = Number(m[3])
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31
}

/**
 * iter360 refactor: ISO `YYYY-MM-DD` をローカル TZ の **当日終端** (23:59:59.999)
 * の ms timestamp に変換する糖衣。`due-hit-rate` / `slip-days` で 2 callsite 同一
 * 実装が重複していたので集約。
 *
 * caller (`computeDueHitRate` / `computeSlipDays`) は `doneAt.getTime() <= dueEnd`
 * のような比較に使う (= 「dueDate 当日中に完了したか」)。不正 ISO は null fail-soft、
 * caller 側で `if (dueEnd === null) continue` で除外する想定。
 */
export function dueDateEndOfDayMs(dueDate: string): number | null {
  if (!isValidIsoDate(dueDate)) return null
  const m = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/)!
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  return new Date(y, mo - 1, d, 23, 59, 59, 999).getTime()
}

/**
 * iter305 refactor: Date / ISO 文字列 / null / undefined / 不正値を Date | null に
 * 正規化する fail-soft parser。velocity / freshly-done / stale-items で 3 callsite
 * 同一実装が重複していたので集約。
 *
 * 仕様:
 *  - null / undefined / 空文字 → null
 *  - Date instance → そのまま (但し `Number.isFinite(getTime())` を満たさない不正 Date は null)
 *  - 文字列 → `new Date(input)` で parse、不正値は null (RFC3339 / `YYYY-MM-DD` どちらも OK)
 *
 * caller がすべて同じ defensive 振る舞いを得られるので「不正 doneAt は除外」「未指定は除外」
 * が 1 か所のロジックに集約される。
 */
export function parseDateOrNull(input: Date | string | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null
  const d = new Date(input)
  return Number.isFinite(d.getTime()) ? d : null
}

/**
 * iter330 refactor: ISO `YYYY-MM-DD` を UTC 基準で N 日 shift して `YYYY-MM-DD` に
 * 戻す pure helper。`weekly-time-trend.ts#shiftDays` と `daily-streak.ts#shiftDays` で
 * 同一実装が 2 callsite 重複していたので集約。caller は week 境界 (today-6, today-13)
 * 計算 / streak の「前日」cursor 移動などで使う。
 *
 * - 負値も可。年跨ぎ / 月跨ぎは UTC 計算で TZ shift 無関係。
 * - 入力 `iso` は `YYYY-MM-DD` validated 前提 (caller 側で `/^\d{4}-\d{2}-\d{2}$/`
 *   match を済ませてから渡すこと)。形式不一致は実装的に NaN 経由で `'NaN-NaN-NaN'`
 *   等を返す可能性があるが、これは既存 callsite の挙動と同じで behavior 互換。
 */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = Date.UTC(y!, m! - 1, d! + days)
  const out = new Date(t)
  const yyyy = out.getUTCFullYear()
  const mm = String(out.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(out.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
