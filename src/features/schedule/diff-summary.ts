import type { Schedule } from './schema'

/**
 * Pure: schedule[] を受け取って item ごとに 想定 / 実測 の合計分数と差分を集計する。
 * UI から独立した計算ロジックなので Vitest で個別検査される。
 *
 * - 同 itemId の planned 合計と actual 合計を別々に出す
 * - itemId が NULL の actual は "interrupts" バケットにまとめる
 * - 差分 (deltaMinutes = actual - planned) と severity を返す
 */
export interface DiffRow {
  itemId: string | null
  plannedMinutes: number
  actualMinutes: number
  deltaMinutes: number
  /** ratio: actual / planned。planned=0 (実測のみ) は Infinity */
  ratio: number
  /** OK = ratio<=1.1 / WARN = 1.1<ratio<=1.5 / DANGER = 1.5<ratio / NOT_DONE = actual=0 で planned>0 */
  severity: 'ok' | 'warn' | 'danger' | 'not_done' | 'interrupt'
}

function durationMinutes(s: Schedule): number {
  return Math.max(0, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000))
}

export function summarizeDiff(schedules: Schedule[]): DiffRow[] {
  const byKey = new Map<string, { itemId: string | null; planned: number; actual: number }>()
  for (const s of schedules) {
    const key = s.itemId ?? '__interrupt__'
    const cur = byKey.get(key) ?? { itemId: s.itemId ?? null, planned: 0, actual: 0 }
    if (s.kind === 'planned') cur.planned += durationMinutes(s)
    else cur.actual += durationMinutes(s)
    byKey.set(key, cur)
  }
  const rows: DiffRow[] = []
  for (const [key, agg] of byKey) {
    const delta = agg.actual - agg.planned
    let severity: DiffRow['severity']
    if (key === '__interrupt__') {
      severity = 'interrupt'
    } else if (agg.planned > 0 && agg.actual === 0) {
      severity = 'not_done'
    } else if (agg.planned === 0) {
      severity = 'warn' // planned 無し / actual のみ = ad-hoc 実測
    } else {
      const ratio = agg.actual / agg.planned
      if (ratio <= 1.1) severity = 'ok'
      else if (ratio <= 1.5) severity = 'warn'
      else severity = 'danger'
    }
    rows.push({
      itemId: agg.itemId,
      plannedMinutes: agg.planned,
      actualMinutes: agg.actual,
      deltaMinutes: delta,
      ratio: agg.planned > 0 ? agg.actual / agg.planned : Number.POSITIVE_INFINITY,
      severity,
    })
  }
  // planned が大きい順、interrupt は末尾
  rows.sort((a, b) => {
    if (a.severity === 'interrupt') return 1
    if (b.severity === 'interrupt') return -1
    return b.plannedMinutes - a.plannedMinutes
  })
  return rows
}
