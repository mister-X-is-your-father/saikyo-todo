/**
 * iter357 ai-automation: MUST item の **dueDate hygiene** を計算する pure helper。
 *
 * iter294 (`must-risk.ts`) は MUST + dueDate 近接で「落ちそう」を抽出するが、
 * dueDate **未設定** の MUST は対象外 (= silent gap)。本 helper はその blind spot
 * を埋める。MUST かつ dueDate 未設定は「絶対落とせない」のに「いつ落としてはいけない
 * か」が決まっていない最悪パターンなので、AI 朝 brief / pm-agent / dashboard が
 * 警告できるようにする。
 *
 * 仕様:
 *   - input: items 配列 ({isMust, doneAt, archivedAt, dueDate} の structural subset)
 *   - 集計対象: isMust === true && doneAt == null && archivedAt == null
 *   - withDueDate: dueDate が `YYYY-MM-DD` 形式 valid
 *   - withoutDueDate: dueDate が null/undefined/空/不正 ISO
 *   - total / withDueDate / withoutDueDate / coverageRate (total=0 → null)
 */

import { isValidIsoDate } from '@/lib/date/iso'
import type { ChipTone } from '@/lib/ui/chip-tone'

import type { AgentBriefSignal } from '@/features/agent/brief-signal'

export interface MustHygieneFields {
  isMust: boolean | null | undefined
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
  dueDate: string | null | undefined
}

export interface MustHygieneStats {
  total: number
  withDueDate: number
  withoutDueDate: number
  /** 0..1 の少数。total=0 → null */
  coverageRate: number | null
}

const EMPTY: MustHygieneStats = {
  total: 0,
  withDueDate: 0,
  withoutDueDate: 0,
  coverageRate: null,
}

// iter360 refactor: isValidIsoDate は lib/date/iso.ts に集約。

export function computeMustHygiene<T extends MustHygieneFields>(
  items: readonly T[],
): MustHygieneStats {
  let withDueDate = 0
  let withoutDueDate = 0
  for (const it of items) {
    if (!it.isMust) continue
    if (it.doneAt) continue
    if (it.archivedAt) continue
    if (typeof it.dueDate === 'string' && isValidIsoDate(it.dueDate)) {
      withDueDate += 1
    } else {
      withoutDueDate += 1
    }
  }
  const total = withDueDate + withoutDueDate
  if (total === 0) return EMPTY
  return { total, withDueDate, withoutDueDate, coverageRate: withDueDate / total }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'MUST: 5 件 (期限付 3 / 期限なし 2 — 計画化推奨)'`
 *   `'MUST: 5 件 (全て期限付き)'` (= withoutDueDate = 0)
 *   `'MUST: 3 件 (全て期限なし — 重大な計画漏れ)'` (= withDueDate = 0)
 *   `'MUST 0 件'` (total=0)
 */
export function formatMustHygieneJa(stats: MustHygieneStats): string {
  if (stats.total === 0) return 'MUST 0 件'
  if (stats.withoutDueDate === 0) {
    return `MUST: ${stats.total} 件 (全て期限付き)`
  }
  if (stats.withDueDate === 0) {
    return `MUST: ${stats.total} 件 (全て期限なし — 重大な計画漏れ)`
  }
  return `MUST: ${stats.total} 件 (期限付 ${stats.withDueDate} / 期限なし ${stats.withoutDueDate} — 計画化推奨)`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'severe' (= 全 MUST 期限なし or withoutDueDate > 0 で全体 < 50% カバレッジ)
 *  - 'mild' (= 一部 MUST 期限なし、半分以上はカバレッジ済)
 *  - 'clean' (= 全 MUST 期限付き、健全)
 *  - 'idle' (= total=0、MUST 自体無し)
 */
export type MustHygieneSeverity = 'severe' | 'mild' | 'clean' | 'idle'

export function mustHygieneSeverity(stats: MustHygieneStats): MustHygieneSeverity {
  if (stats.total === 0 || stats.coverageRate === null) return 'idle'
  if (stats.withoutDueDate === 0) return 'clean'
  if (stats.coverageRate < 0.5) return 'severe'
  return 'mild'
}

/**
 * iter1058 basics: MustHygieneSeverity (4 値) → 共通 `ChipTone` bridge。
 *
 *   - severe (= 全 MUST 期限なし or coverage < 50%) → 'danger' (= 赤、重大な計画漏れ)
 *   - mild   (= 半分以上 coverage 済、一部未設定)     → 'warn'   (= 黄、計画化推奨)
 *   - clean  (= 全 MUST 期限付き、健全)               → 'success' (= 緑、positive framing)
 *   - idle   (= MUST 自体無し)                       → 'idle'   (= 灰、attention 不要)
 *
 * iter1055 severeMildIdle / iter1056 urgencyTier と vocab 別 (本 vocab は 'clean' を含む
 * 4 値で MUST hygiene 軸固有)。`formatMustHygieneJa` と整合する tone 軸で AgentBriefSignal /
 * dashboard chip-tone bind 用。
 */
const MUST_HYGIENE_TO_CHIP_TONE: Record<MustHygieneSeverity, ChipTone> = {
  severe: 'danger',
  mild: 'warn',
  clean: 'success',
  idle: 'idle',
}

export function mustHygieneChipTone(stats: MustHygieneStats): ChipTone {
  return MUST_HYGIENE_TO_CHIP_TONE[mustHygieneSeverity(stats)]
}

/**
 * iter1058 basics: MustHygieneStats → `AgentBriefSignal` (text + tone) compose helper。
 *
 * iter1025/1031/1035/1038/1040/1046/1047/1049/1052/1056 等 `*ToBriefSignal` pattern (= 17 axes
 * 弾) の MUST hygiene 軸版。text は `formatMustHygieneJa(stats)`、tone は本 iter
 * `mustHygieneChipTone` を再利用 (= chip 配色と signal tone が完全一致)。
 *
 * caller pattern:
 *   const stats = computeMustHygiene(items)
 *   const signal = mustHygieneToBriefSignal(stats)
 *   // → composeAnalyticsSignals 風に concat、または単独 chip render
 *
 * 用途:
 *   - AI 朝 brief / Slack daily digest 「MUST: 5 件 (期限付 2 / 期限なし 3 — 計画化推奨)」 signal
 *   - dashboard chip 「MUST hygiene」 tone 統一
 *   - analytics-signals.ts の 18 軸目候補 (次 iter integration 想定)
 */
export function mustHygieneToBriefSignal(stats: MustHygieneStats): AgentBriefSignal {
  return {
    text: formatMustHygieneJa(stats),
    tone: mustHygieneChipTone(stats),
  }
}
