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
 * iter1341 refactor: PDCA phase 進行ルール (= 許可される遷移先)。
 *
 *   plan → do | check (D を skip して直接 C は許可、ただし D→C 逆行は禁止)
 *   do → check / check → act / act → closed / closed → (なし)
 *   逆方向は全て禁止。
 *
 * 経緯: 以前は service.ts (server-only) 内に inline 定義され unit test できず、UI からも
 * 参照不能だった。pure helper に切り出して (1) Vitest 単体 test 可能 / (2) UI が
 * 「次 phase へ」 button の表示・活性を `allowedNextPdcaPhases` で gate 可能にする。
 */
const ALLOWED_PHASE_TRANSITIONS: Record<PdcaCycleStatus, readonly PdcaCycleStatus[]> = {
  plan: ['do', 'check'],
  do: ['check'],
  check: ['act'],
  act: ['closed'],
  closed: [],
}

/** 現 phase から進める次 phase の一覧 (closed は空配列)。UI の「次 phase へ」 button 生成用。 */
export function allowedNextPdcaPhases(status: PdcaCycleStatus): PdcaCycleStatus[] {
  return [...ALLOWED_PHASE_TRANSITIONS[status]]
}

/** from → to の phase 遷移が許可されているか (= service の advancePhase guard と同一規則)。 */
export function isAllowedPdcaPhaseTransition(from: PdcaCycleStatus, to: PdcaCycleStatus): boolean {
  return ALLOWED_PHASE_TRANSITIONS[from].includes(to)
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
