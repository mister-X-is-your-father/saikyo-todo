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
