/**
 * iter490 refactor (集約 37 弾目): 分単位の duration を `'Hh Mmin'` / `'Hmin'` /
 * `'Hh'` / `'0min'` に整形する pure helper。
 *
 * 集約直前の状況:
 *  - `features/time-entry/category-summary.ts` に `formatMinutes` (defensive、
 *    Number.isFinite + Math.max + Math.round 付き、24 unit test、AI brief 系
 *    で 3 callsite が import 済)
 *  - `features/sprint/swimlane-conflict.ts` に `formatHoursMinutes` (= 同 logic、
 *    defensive guards なし、private)
 *  - `features/sprint/swimlane-orchestrator.ts` に `formatHoursMinutes` (= 同上、
 *    defensive guards なし、private)
 *  - `features/workspace/member-capacity.ts` に `formatHours` (= 0/負値で `'0h'`
 *    sentinel、他 logic は同じ、private)
 *
 * 本 file が canonical 定義、time-entry の `formatMinutes` 互換 (defensive 強化版)
 * を維持。 sprint domain の 2 file は本 helper 経由に置換、time-entry/category-
 * summary.ts は本 file から re-export して既存 caller の import path を維持。
 *
 * iter360 集約方針 37 弾目 (前回 36 弾目 = iter485 chip-tone 集約)。
 *
 * 仕様:
 *  - 0 / 負 / NaN / Infinity → '0min' (fail-soft)
 *  - 60 未満 → 'Mmin' (例: '15min', '59min')
 *  - 60 の倍数 → 'Hh' (例: '1h', '2h', '8h')
 *  - その他 → 'Hh Mmin' (例: '1h 30min', '2h 15min')
 *  - 小数の分は Math.round で丸める (例: 89.4 → '1h 29min')
 */
export function formatMinutes(min: number): string {
  const safe = Number.isFinite(min) ? Math.max(0, Math.round(min)) : 0
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * iter801 basics: 分単位 duration を ja-JP 表記 (`'1時間30分'` / `'45分'` /
 * `'2時間'` / `'0分'`) に整形する pure helper。`formatMinutes` (英表記
 * `1h 30min`) と対称な ja 表記版。
 *
 * 用途:
 *  - Slack 通知 / chip aria-label / AI 朝 brief で日本語 UI と整合する duration
 *    表記が欲しい (= `1h 30min` は SR で「いちエイチ」と読まれて聞き辛い)
 *  - 既存 `formatMinutes` は en 系内部 logic / ASCII chip 向け、本 helper は
 *    ja-facing UI / 通知 payload 向けに棲み分け
 *
 * 仕様:
 *  - 0 / 負 / NaN / Infinity → '0分' (fail-soft、既存 formatMinutes と同じ extreme)
 *  - 60 未満 → 'M分' (例: '15分', '59分')
 *  - 60 の倍数 → 'H時間' (例: '1時間', '2時間')
 *  - その他 → 'H時間M分' (例: '1時間30分', '8時間15分')
 *  - 小数の分は Math.round (例: 89.4 → '1時間29分')
 */
export function formatMinutesJa(min: number): string {
  const safe = Number.isFinite(min) ? Math.max(0, Math.round(min)) : 0
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}
