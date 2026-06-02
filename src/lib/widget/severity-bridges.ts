/**
 * iter535 ai-automation (queue: widget-tone unification): 各 domain の独自 severity 型 →
 * 共通 `Severity` ('ok' | 'info' | 'warn' | 'danger' | 'muted') への bridge 関数集。
 *
 * 設計目的:
 *   - 各 widget が SeverityChip に渡す tone を `data-domain → Severity` 1 行で取れる
 *   - 各 domain の severity 閾値はそのまま (= bridge は lossy mapping のみ)
 *   - 新 widget で同じ domain severity を bind するときに re-implement しなくて良い
 *
 * 副作用なし、依存は本 file が import する各 domain file のみ。pure helper + Vitest 単体 test で網羅。
 */
import type { FourStateHint } from '@/lib/hint'
import type { ChipTone } from '@/lib/ui/chip-tone'

import type { ChecklistStatus } from '@/features/agent/structured-review'
import type { PdcaPhaseSeverity } from '@/features/pdca-cycle/phase-helpers'
import type { AssigneeLoadSeverity } from '@/features/sprint/risk-board'

import type { Severity } from './severity'

/**
 * iter1039 refactor: 共通 `Severity` (5 値) → `ChipTone` (6 値) bridge。
 *
 * SeverityChip は Severity 5 値 vocab を直接 bind するが、AgentBriefSignal / dashboard
 * chip-tone (= cost-chip 等) は ChipTone 6 値 vocab を要求するため、両 vocab 間の lossy
 * bridge が必要。iter1025 `agingSeverityChipTone` / iter1030 `consultationStatusChipTone` /
 * iter1033 `weeklyReviewDueChipTone` / iter1036 `gtdBucketChipTone` で各 domain が **同じ
 * mapping** を inline で繰り返していた:
 *
 *   'ok'     → 'success' (= 緑、positive framing = 6 軸 (5) やる気)
 *   'info'   → 'info'    (= 青、進行中)
 *   'warn'   → 'warn'    (= 黄、注意)
 *   'danger' → 'danger'  (= 赤、要対応)
 *   'muted'  → 'idle'    (= 灰、attention 不要)
 *
 * 本 bridge を 1 source of truth とし、各 domain 固有 ChipTone helper (例: agingSeverityChipTone)
 * は本関数 + 同 domain の Severity 計算結果 を組み合わせて簡潔化可能。直接 domain → ChipTone
 * を 1 行で書く caller (= gtdBucketChipTone のような 'urgent' を使う特殊配色) は本 bridge を
 * 使わず維持 (= 'urgent' は Severity vocab に無いため lossy 不可)。
 */
const SEVERITY_TO_CHIP_TONE: Record<Severity, ChipTone> = {
  ok: 'success',
  info: 'info',
  warn: 'warn',
  danger: 'danger',
  muted: 'idle',
}

export function severityToChipTone(sev: Severity): ChipTone {
  return SEVERITY_TO_CHIP_TONE[sev]
}

/**
 * iter1430 refactor: 各 domain `Record<K, number>` (= domain severity 別件数) を
 * `Record<Severity, number>` に集約する **汎用 helper**。
 *
 * iter533-548 系で同 pattern (= empty Record 初期化 + for-loop + ?? 0 + toSeverity 委譲)
 * を 11+ 関数 (`checklistStatusCountsToSeverityCounts` /
 * `improvementSeverityCountsToSeverityCounts` / `assigneeLoadSeverityCountsToSeverityCounts` /
 * `pdcaPhaseSeverityCountsToSeverityCounts` / `fourStateHintCountsToSeverityCounts` + 他 file
 * の 6 件) が完全に同じ boilerplate を持っていたのを 1 関数に集約。
 *
 * 仕様:
 *  - 5 Severity bucket (ok / info / warn / danger / muted) を 0 で初期化
 *  - `Object.keys(counts)` で domain key を全列挙、`toSeverity(k)` で Severity bucket に振り分け、
 *    `counts[k] ?? 0` を累積
 *  - 同 Severity に lossy 縮約された domain key (例: pdca の 'on_track' と 'fresh' が両方 'info'
 *    に集約) は単純加算 (= 同 bucket への合算が semantics)
 *  - 入力 counts を mutate しない、新 Record を返す (immutable)
 *
 * caller pattern (= 各 `*CountsToSeverityCounts` の薄ラッパー):
 *   return aggregateCountsBySeverity(counts, checklistStatusToSeverity)
 *
 * 注: 本 helper は severity-bridges.ts 内の 5 関数の boilerplate を排除する用 (= 11+ 関数の
 * 一括 refactor は本 iter scope 外、別 iter で外部 file も追従)。
 *
 * iter1694: `K extends PropertyKey` (= string | number | symbol) に汎用化。number key の
 * Record (= priority の `Record<1|2|3|4, number>` 等) も同 helper で扱えるよう拡張。
 * 注: `Object.keys` は string[] を返すため number key も runtime では文字列化されるが、
 * JS object indexing は string/number を等価に扱う (counts[k] / toSeverity(k) で問題なし)。
 * 既存 caller (`K extends string` で書かれた callsite) は subset なので breaking なし。
 */
export function aggregateCountsBySeverity<K extends PropertyKey>(
  counts: Readonly<Record<K, number>>,
  toSeverity: (k: K) => Severity,
): Record<Severity, number> {
  const out: Record<Severity, number> = {
    ok: 0,
    info: 0,
    warn: 0,
    danger: 0,
    muted: 0,
  }
  for (const k of Object.keys(counts) as K[]) {
    out[toSeverity(k)] += counts[k] ?? 0
  }
  return out
}

/**
 * AssigneeLoadSeverity (担当負荷 4 段) → Severity (5 段) bridge:
 *   - 'overloaded' (累積 score >= 100) → 'danger'
 *   - 'busy'       (>= 50)             → 'warn'
 *   - 'normal'     (>= 20)             → 'info'
 *   - 'light'      (<  20 / 0 件)       → 'ok'
 */
export function assigneeLoadSeverityToSeverity(sev: AssigneeLoadSeverity): Severity {
  switch (sev) {
    case 'overloaded':
      return 'danger'
    case 'busy':
      return 'warn'
    case 'normal':
      return 'info'
    case 'light':
      return 'ok'
  }
}

/**
 * PdcaPhaseSeverity (PDCA phase 5 段) → Severity (5 段) bridge:
 *   - 'overdue'  → 'danger'  (= 進行を促す警報)
 *   - 'stale'    → 'warn'    (= 停滞気味、注意)
 *   - 'on_track' → 'info'    (= 順調、進行中)
 *   - 'fresh'    → 'info'    (= 開始直後、進行中)
 *   - 'closed'   → 'muted'   (= 完了、neutral)
 *
 * 'fresh' と 'on_track' は 同 'info' に lossy 縮約 (= chip tone 上は区別しない、
 * label tier は formatPdcaCyclePhaseStatusJa で別途出る)。
 */
export function pdcaPhaseSeverityToSeverity(sev: PdcaPhaseSeverity): Severity {
  switch (sev) {
    case 'overdue':
      return 'danger'
    case 'stale':
      return 'warn'
    case 'on_track':
    case 'fresh':
      return 'info'
    case 'closed':
      return 'muted'
  }
}

/**
 * iter548 ai-automation polish: structured-review の `Improvement.severity` ('high' /
 * 'medium' / 'low') → Severity bridge。AI review 結果の改善提案を chip 配色に bind する用。
 *
 * 'high'   → 'danger' (= 必ず対応する改善、影響大)
 * 'medium' → 'warn'   (= 検討対象、影響中)
 * 'low'    → 'info'   (= nice-to-have、影響小)
 */
export function improvementSeverityToSeverity(sev: 'high' | 'medium' | 'low'): Severity {
  switch (sev) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warn'
    case 'low':
      return 'info'
  }
}

/**
 * iter530 refactor: structured-review の `ChecklistItem.status` ('ok' | 'warn' | 'fail') →
 * 共通 Severity bridge。statusGlyph (✅/⚠/❌) と対をなす chip 配色用。
 *
 *   'ok'   → 'ok'     (= 緑、合格)
 *   'warn' → 'warn'   (= 黄、要注意だが致命でない)
 *   'fail' → 'danger' (= 赤、要対策)
 *
 * statusGlyph は visual icon (✅/⚠/❌) を返すが、SeverityChip の tone bind は
 * Severity 型が必要。本 bridge で AI review checklist の各 row chip を
 * SeverityChip 経由で配色統一可能。
 */
export function checklistStatusToSeverity(status: ChecklistStatus): Severity {
  switch (status) {
    case 'ok':
      return 'ok'
    case 'warn':
      return 'warn'
    case 'fail':
      return 'danger'
  }
}

/**
 * iter539 ai-automation: `Record<ChecklistStatus, number>` (AI review checklist 結果
 * 別件数) を `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-538 と同 pattern (= 7 ドメイン目)。caller は AI review (= structured-review)
 * の checklist 集計を 1 行 severity サマリ で表示できる。
 *
 *   ok   → ok     (= ✅、合格)
 *   warn → warn   (= ⚠、要注意)
 *   fail → danger (= ❌、要対策)
 *
 * info / muted bucket には出ない (checklist は 3 値、ニュートラルや非該当は無い)。
 */
export function checklistStatusCountsToSeverityCounts(
  counts: Record<ChecklistStatus, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, checklistStatusToSeverity)
}

/**
 * iter540 ai-automation: `Record<'high' | 'medium' | 'low', number>` (改善提案
 * severity 別件数) を `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-539 と同 pattern (= 8 ドメイン目)。caller は AI review (structured-review)
 * の `improvements[].severity` 集計を 1 行 severity サマリ で表示できる。
 *
 *   high   → danger (= 必ず対応する改善、影響大、赤)
 *   medium → warn   (= 検討対象、影響中、黄)
 *   low    → info   (= nice-to-have、影響小、青)
 *
 * ok / muted bucket には出ない (= 「改善提案」 自体がそもそも改善 = positive 評価
 * ではない、対応必要度の grade)。
 */
export function improvementSeverityCountsToSeverityCounts(
  counts: Record<'high' | 'medium' | 'low', number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, improvementSeverityToSeverity)
}

/**
 * iter541 ai-automation: `Record<AssigneeLoadSeverity, number>` (sprint 担当負荷 別件数) を
 * `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-540 と同 pattern (= 9 ドメイン目)。caller は sprint 担当負荷 distribution を
 * 1 行 severity サマリ で表示できる。
 *
 *   overloaded → danger (= 高負荷、即 escalation)
 *   busy       → warn   (= 繁忙、注意)
 *   normal     → info   (= 通常、健全)
 *   light      → ok     (= 余裕、引き受け候補)
 *
 * muted bucket には出ない (4 段全て担当者がいる前提、unknown 扱いなし)。
 */
export function assigneeLoadSeverityCountsToSeverityCounts(
  counts: Record<AssigneeLoadSeverity, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, assigneeLoadSeverityToSeverity)
}

/**
 * iter542 ai-automation: `Record<PdcaPhaseSeverity, number>` (PDCA cycle phase 5 段
 * 別件数) を `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-541 と同 pattern (= 10 ドメイン目)。caller は workspace 内 PDCA cycle 群の
 * phase 状態 distribution を 1 行 severity サマリ で表示できる。
 *
 *   overdue  → danger (= 進行を促す警報)
 *   stale    → warn   (= 停滞気味、注意)
 *   on_track → info   (= 順調、進行中)
 *   fresh    → info   (= 開始直後、進行中、on_track と同 severity に lossy 縮約)
 *   closed   → muted  (= 完了、neutral)
 *
 * ok bucket には出ない (cycle phase は「達成」ではなく「進行段階」 軸)。
 */
export function pdcaPhaseSeverityCountsToSeverityCounts(
  counts: Record<PdcaPhaseSeverity, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, pdcaPhaseSeverityToSeverity)
}

/**
 * iter543 ai-automation: `Record<FourStateHint, number>` (4 状態 hint 別件数) を
 * `Record<Severity, number>` に集約する pure helper。
 *
 * iter533-542 と同 pattern (= 11 ドメイン目)。caller は workspace 内 widget 群の
 * 4 状態 hint distribution を 1 行 severity サマリ で表示できる。
 *
 *   idle     → muted  (= 該当なし、neutral)
 *   mild     → ok     (= 健全、安全側)
 *   moderate → warn   (= 注意、要 monitoring)
 *   severe   → danger (= 異常、要対応)
 *
 * info bucket には出ない (4 状態 hint は 4 値、ニュートラル進行中の概念は無い)。
 *
 * iter533-543 で 11 ドメインが counts → severity-counts bridge を持つ。
 * `severity-bridges.ts` に集約された bridge は計 9 件 (= 5 単数 bridge + 4 counts bridge)
 * になり、saikyo-todo 全 widget の chip 群 distribution を共通の 1 行 summary に
 * 圧縮可能。
 */
export function fourStateHintCountsToSeverityCounts(
  counts: Record<FourStateHint, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, fourStateHintToSeverity)
}

/**
 * iter495 refactor: 4 状態 hint (`FourStateHint` 'idle' | 'mild' | 'moderate' | 'severe') →
 * 共通 `Severity` bridge。
 *
 * 'idle'     → 'muted'  (= 該当なし、neutral)
 * 'mild'     → 'ok'     (= 健全、安全側)
 * 'moderate' → 'warn'   (= 注意、要 monitoring)
 * 'severe'   → 'danger' (= 異常、要対応)
 *
 * iter439 / iter442 / iter444 / iter447 / iter449 / iter454 / iter458 / iter483
 * weekly-insight / iter488 inbox-process / iter491 notification-activity / iter492
 * structured-review / iter493 audit-activity と続く 12+ FourStateHint domain で
 * 「hint → SeverityChip tone」 を 1 関数で取れるように。各 caller は domain 固有の
 * `classifyXxxHint(input)` で hint を取り、本 bridge に渡せば chip 配色決定。
 */
export function fourStateHintToSeverity(hint: FourStateHint): Severity {
  switch (hint) {
    case 'idle':
      return 'muted'
    case 'mild':
      return 'ok'
    case 'moderate':
      return 'warn'
    case 'severe':
      return 'danger'
  }
}

import { severityChipClass } from './severity'

/**
 * iter505 refactor: 4 状態 hint chip 用の {label, severity, chipClass} を 1 関数で取得。
 *
 * iter496 / iter497 / iter498 / iter499 で 4 chip wire-up caller (WeeklyInsightWidget /
 * InboxView / ActivityLog / NotificationBell) が同 shape の構築を inline で書いていた:
 *
 *   const label = formatXxxHintJa(input)
 *   const severity = fourStateHintToSeverity(classifyXxxHint(input))
 *   const chipClass = severityChipClass(severity)
 *   return { label, severity, chipClass }
 *
 * 本 helper で 1 呼出に集約。caller の boilerplate を 4 行 → 1 行に。
 */
export interface FourStateHintChipProps {
  label: string
  severity: Severity
  chipClass: string
}

export function buildFourStateHintChip<T>(
  input: T,
  classify: (input: T) => FourStateHint,
  format: (input: T) => string,
): FourStateHintChipProps {
  const label = format(input)
  const severity = fourStateHintToSeverity(classify(input))
  const chipClass = severityChipClass(severity)
  return { label, severity, chipClass }
}

/**
 * iter1055 refactor: `'severe' | 'mild' | 'idle'` 3 段 severity vocab → `ChipTone` bridge。
 *
 * iter1047 stuckWipChipTone / iter1049 overdueActiveChipTone で同 mapping (severe → 'danger' /
 * mild → 'warn' / idle → 'idle') が inline 重複していたので 1 source of truth に集約。
 * caller (= 既存 2 helper + 将来 'severe' | 'mild' | 'idle' を使う domain) は本 bridge を
 * 1 行で参照。
 *
 *   'severe' → 'danger' (= 赤、要対応)
 *   'mild'   → 'warn'   (= 黄、注意)
 *   'idle'   → 'idle'   (= 灰、attention 不要)
 *
 * 本 vocab は `Severity` (5 値) と異なり 'severe'|'mild'|'idle' の 3 値で、count > 0 の severity
 * 2 値 + empty/no-data の idle sentinel という item-domain 共通 pattern。`SlipSeverity` ('severe'|
 * 'mild') は count=0 を別軸で扱うため適用外 (= caller 側で count===0 → 'idle' を先に分岐)。
 */
export type SevereMildIdle = 'severe' | 'mild' | 'idle'

const SEVERE_MILD_IDLE_TO_CHIP_TONE: Record<SevereMildIdle, ChipTone> = {
  severe: 'danger',
  mild: 'warn',
  idle: 'idle',
}

export function severeMildIdleToChipTone(sev: SevereMildIdle): ChipTone {
  return SEVERE_MILD_IDLE_TO_CHIP_TONE[sev]
}
