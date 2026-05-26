/**
 * iter534 ai-automation (queue: PDCA P-1 polish): pdca_cycles の phase 関連 pure helper。
 *
 * 設計目的:
 *   - PDCA mode の widget / chip / Slack 通知が「phase Japanese label」「phase severity
 *     (= 進捗が滞ってないか)」「1 行 status 文字列」を 1 関数で取り出せる substrate
 *   - service / repository には触らない、pure helper のみ
 *
 * AI 不使用、副作用無し、依存無し。pure helper + Vitest 単体 test で網羅。
 */
import { MS_PER_DAY } from '@/lib/date/iso'

import type { PdcaCycleStatus } from './schema'

const PHASE_LABEL_JA: Record<PdcaCycleStatus, string> = {
  plan: '仮説立案 (Plan)',
  do: '実行 (Do)',
  check: '検証 (Check)',
  act: '改善決定 (Act)',
  closed: '完了',
}

export function pdcaCyclePhaseLabelJa(status: PdcaCycleStatus): string {
  return PHASE_LABEL_JA[status]
}

/**
 * phase ごとの「想定上限日数」 (= これを超えたら stale 警告)。
 * Plan / Check / Act は短時間で終えるべき (= 思考の停滞を避ける)、Do は長め。
 */
const PHASE_DAY_LIMIT: Record<PdcaCycleStatus, number> = {
  plan: 3,
  do: 14,
  check: 3,
  act: 2,
  closed: Infinity,
}

export type PdcaPhaseSeverity = 'closed' | 'fresh' | 'on_track' | 'stale' | 'overdue'

export interface PdcaPhaseTimestamps {
  status: PdcaCycleStatus
  /** 各 phase 開始 / 終了タイムスタンプ。schema の Date | null と互換 */
  planStartedAt?: Date | null
  doStartedAt?: Date | null
  checkStartedAt?: Date | null
  /** schema には actStartedAt がないので closed への遷移時刻は updatedAt フォールバック */
  updatedAt?: Date | null
}

// iter1024 refactor: 旧 local `MS_PER_DAY = 24 * 60 * 60 * 1000` (3 件目) を
// `@/lib/date/iso#MS_PER_DAY` に集約 (= iter360 で確立した「1 source of truth」 sweep)。

/**
 * 現在 phase に入ってからの経過日数 (整数、Math.floor)。timestamp 不明なら null。
 *
 * - status='plan'   : planStartedAt 起点
 * - status='do'     : doStartedAt 起点
 * - status='check'  : checkStartedAt 起点
 * - status='act'    : updatedAt 起点 (= 最後の遷移、actStartedAt 列が無いため)
 * - status='closed' : null (= 経過追跡しない)
 */
export function phaseElapsedDays(
  cycle: PdcaPhaseTimestamps,
  now: Date = new Date(),
): number | null {
  if (cycle.status === 'closed') return null
  let started: Date | null | undefined
  switch (cycle.status) {
    case 'plan':
      started = cycle.planStartedAt
      break
    case 'do':
      started = cycle.doStartedAt
      break
    case 'check':
      started = cycle.checkStartedAt
      break
    case 'act':
      started = cycle.updatedAt
      break
  }
  if (!started) return null
  const diffMs = now.getTime() - started.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0
  return Math.floor(diffMs / MS_PER_DAY)
}

/**
 * phase severity (chip tone bind 用):
 *   - 'closed'   : status='closed' (= 完了、neutral)
 *   - 'fresh'    : 経過 0 日 (= 同日に遷移したばかり)
 *   - 'on_track' : 経過 ≤ phase 上限 (= 想定内)
 *   - 'stale'    : phase 上限 < 経過 ≤ 上限 × 2 (= 注意)
 *   - 'overdue'  : 経過 > 上限 × 2 (= 警報、phase 進行を促す)
 *
 * timestamp 不明 (= phaseElapsedDays が null) は 'on_track' (= neutral fallback)。
 */
export function pdcaPhaseSeverity(
  cycle: PdcaPhaseTimestamps,
  now: Date = new Date(),
): PdcaPhaseSeverity {
  if (cycle.status === 'closed') return 'closed'
  const elapsed = phaseElapsedDays(cycle, now)
  if (elapsed === null) return 'on_track'
  if (elapsed === 0) return 'fresh'
  const limit = PHASE_DAY_LIMIT[cycle.status]
  if (!Number.isFinite(limit)) return 'on_track'
  if (elapsed <= limit) return 'on_track'
  if (elapsed <= limit * 2) return 'stale'
  return 'overdue'
}

const SEVERITY_LABEL_JA: Record<PdcaPhaseSeverity, string> = {
  closed: '完了',
  fresh: '開始直後',
  on_track: '順調',
  stale: '停滞気味',
  overdue: '進行を促す',
}

export function pdcaPhaseSeverityLabelJa(sev: PdcaPhaseSeverity): string {
  return SEVERITY_LABEL_JA[sev]
}

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 phase status:
 *   '実行 (Do) — 順調 (5 日)'
 *   '改善決定 (Act) — 進行を促す (8 日)'
 *   '完了'                                (= status='closed')
 *   '仮説立案 (Plan) — 順調 (timestamp 未記録)'
 */
export function formatPdcaCyclePhaseStatusJa(
  cycle: PdcaPhaseTimestamps,
  now: Date = new Date(),
): string {
  const phase = pdcaCyclePhaseLabelJa(cycle.status)
  if (cycle.status === 'closed') return phase
  const sev = pdcaPhaseSeverity(cycle, now)
  const sevLabel = pdcaPhaseSeverityLabelJa(sev)
  const elapsed = phaseElapsedDays(cycle, now)
  const tail = elapsed === null ? ' (timestamp 未記録)' : ` (${elapsed} 日)`
  return `${phase} — ${sevLabel}${tail}`
}

/**
 * iter1011 basics: phase の「想定上限日数」 を返す (= 内部 PHASE_DAY_LIMIT の安全な exposure)。
 *
 * caller 用途:
 *   - widget chip 「想定上限 14 日」 表示
 *   - Slack 通知 「あと N 日で停滞警告」 計算 (= limit - elapsedDays)
 *   - AI prompt 「phase の想定期間」 context
 *
 * 仕様: closed → null (= 完了は経過追跡しない、Infinity を露出させず null sentinel) /
 * その他 → 整数日数 (plan=3 / do=14 / check=3 / act=2)。
 */
export function pdcaPhaseDayLimit(status: PdcaCycleStatus): number | null {
  if (status === 'closed') return null
  const limit = PHASE_DAY_LIMIT[status]
  return Number.isFinite(limit) ? limit : null
}

/**
 * iter1011 basics: phase が停滞中 (sev='stale' or 'overdue') か判定する pure predicate。
 *
 * 用途:
 *   - dashboard 「停滞中 N 件」 filter
 *   - Slack daily digest 「PDCA phase 停滞 cycle」 集約 chip
 *   - AI prompt 「進行 nudging が必要な cycle」 抽出
 *
 * `pdcaPhaseSeverity` の 5 値中 'stale' / 'overdue' を「停滞」 判定。
 * 'closed' / 'fresh' / 'on_track' は false。
 */
export function isPdcaPhaseStuck(cycle: PdcaPhaseTimestamps, now: Date = new Date()): boolean {
  const sev = pdcaPhaseSeverity(cycle, now)
  return sev === 'stale' || sev === 'overdue'
}

/**
 * iter1374 ai-automation (queue: PDCA AI-4 Do 中 anomaly 早期検知): cycle の進捗 pace を
 * 「紐付け item の完了 %」 vs 「Do phase の経過時間 %」 で純 algorithm 判定する。
 *
 * PDCA cycle entry の AI-4 が要求する「Do 中 anomaly 早期検知 (AI 不要、純 algorithm)」 の
 * substrate。完了が時間進捗より大きく遅れていれば behind / 予定日数超過 + 未完了なら at-risk。
 *
 * 判定 (completion = completed/total、timeProgress = elapsed/planned):
 *  - 'no-data'  → totalItems ≤ 0 or plannedDays ≤ 0 (判定不能)
 *  - 'at-risk'  → 予定日数超過 (timeProgress > 1) かつ 未完了 (completion < 1)
 *  - 'ahead'    → completion が時間進捗を 0.1 以上上回る (前倒し)
 *  - 'behind'   → completion が時間進捗を 0.2 以上下回る (要注意 anomaly)
 *  - 'on-track' → それ以外 (概ね計画通り)
 *
 * 完了 % は 0..1、time % は経過/予定 (> 1 も許容)。比較は min(timeProgress, 1) で行い、
 * 超過分は at-risk 判定で別途吸収する。
 */
export type PdcaPace = 'no-data' | 'ahead' | 'on-track' | 'behind' | 'at-risk'

export interface PdcaPaceInput {
  completedItems: number
  totalItems: number
  elapsedDays: number
  /** Do phase の予定日数 (pdcaPhaseDayLimit('do') 等) */
  plannedDays: number
}

export function classifyPdcaPace(input: PdcaPaceInput): PdcaPace {
  const { completedItems, totalItems, elapsedDays, plannedDays } = input
  if (totalItems <= 0 || plannedDays <= 0) return 'no-data'
  const completion = Math.min(1, Math.max(0, completedItems / totalItems))
  const timeProgress = Math.max(0, elapsedDays / plannedDays)
  if (timeProgress > 1 && completion < 1) return 'at-risk'
  const gap = completion - Math.min(timeProgress, 1)
  if (gap >= 0.1) return 'ahead'
  if (gap <= -0.2) return 'behind'
  return 'on-track'
}

const PDCA_PACE_LABEL_JA: Record<PdcaPace, string> = {
  'no-data': 'pace 判定不能 (item / 期間 なし)',
  ahead: '前倒し',
  'on-track': '計画通り',
  behind: '遅れ気味 (要注意)',
  'at-risk': '期限超過 + 未完了 (危険)',
}

export function formatPdcaPaceJa(pace: PdcaPace): string {
  return PDCA_PACE_LABEL_JA[pace]
}
