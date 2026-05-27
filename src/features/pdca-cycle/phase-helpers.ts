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
 * iter1420 (queue PDCA P-3 substrate): phase 進行ガード。
 *
 * AdvancePdcaCyclePhaseInputSchema (service) は `to` status を受けるが、空の Plan のまま
 * Do に進む等の「型崩れ」 を防ぐため、各 phase の最低限入力を満たすか検証する pure 関数。
 * service.advancePhase が本関数で gate → ok なら status 更新 + 打刻 + audit。
 *
 * 必須条件 (思考の型を強制 = 設計哲学「思考力」):
 *   - plan → do:    hypothesis (仮説) が必須
 *   - do → check:   追加必須なし (実行は外で起きる)
 *   - check → act:  actualValue か checkFindings のどちらか (= 検証結果) が必須
 *   - act → closed: actDecisions (改善決定) が必須
 *   - closed:       終端、advance 不可
 */
export const PDCA_PHASE_ORDER: readonly PdcaCycleStatus[] = ['plan', 'do', 'check', 'act', 'closed']

export function nextCyclePhase(status: PdcaCycleStatus): PdcaCycleStatus | null {
  const idx = PDCA_PHASE_ORDER.indexOf(status)
  if (idx < 0 || idx >= PDCA_PHASE_ORDER.length - 1) return null
  return PDCA_PHASE_ORDER[idx + 1] ?? null
}

export interface CyclePhaseFields {
  status: PdcaCycleStatus
  hypothesis?: string | null
  actualValue?: string | null
  checkFindings?: string | null
  actDecisions?: string | null
}

export interface AdvanceCyclePhaseCheck {
  ok: boolean
  nextPhase: PdcaCycleStatus | null
  /** 不足している必須入力の日本語ラベル (ok=true なら空) */
  missing: string[]
}

function isBlank(s: string | null | undefined): boolean {
  return (s ?? '').trim() === ''
}

export function canAdvanceCyclePhase(cycle: CyclePhaseFields): AdvanceCyclePhaseCheck {
  const next = nextCyclePhase(cycle.status)
  if (next === null) return { ok: false, nextPhase: null, missing: [] }

  const missing: string[] = []
  switch (cycle.status) {
    case 'plan':
      if (isBlank(cycle.hypothesis)) missing.push('仮説 (hypothesis)')
      break
    case 'check':
      if (isBlank(cycle.actualValue) && isBlank(cycle.checkFindings)) {
        missing.push('実測値 または 学び (actualValue / checkFindings)')
      }
      break
    case 'act':
      if (isBlank(cycle.actDecisions)) missing.push('改善決定 (actDecisions)')
      break
    default:
      break
  }

  return { ok: missing.length === 0, nextPhase: next, missing }
}
