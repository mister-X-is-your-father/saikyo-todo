/**
 * iter379 ai-automation: 「期限 / DoD / 説明文 を 1 つも持たない item」を
 * triage 候補として抽出 / 集計する pure helper。
 *
 * iter349 / iter352 / iter367 の各軸 coverage は「軸別の充実度」を出すが、
 * 本 helper はそれらの **共通否定 (= 全 3 軸 unset)** を 1 関数で出す。
 * 「title だけ書いた brain-dump」「未着手 backlog の triage 候補」に相当する
 * pattern を planning debt metric として扱う。
 *
 * 仕様:
 *   - input: items 配列 ({doneAt, archivedAt, dueDate, dod, description})
 *   - 集計対象: doneAt == null && archivedAt == null (= 未完了 + 未 archive)
 *   - debt 判定: dueDate / dod / description 3 fields すべてが
 *     「null/undefined/空/whitespace-only」の item
 *   - rate = debtCount / total (total=0 → null)
 *   - tone: rate >= 0.3 → 'warn', 0.1..0.3 → 'neutral', < 0.1 → 'good'
 *
 * 各軸の null 判定は description-coverage / due-date-coverage / dod-coverage と
 * 同 vocabulary (空文字列も unset 扱い)。dueDate は ISO valid 必須 (caller が
 * 不正 ISO を入れないなら影響なし)。
 */

import { isValidIsoDate } from '@/lib/date/iso'

export interface HygieneDebtFields {
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
  dueDate: string | null | undefined
  dod: string | null | undefined
  description: string | null | undefined
}

export interface HygieneDebtStats {
  /** 集計対象 (未完了 + 未 archive) 件数 */
  total: number
  /** 全 3 軸 unset の item 件数 */
  debtCount: number
  /** 0..1 の rate、total=0 → null */
  rate: number | null
}

const EMPTY: HygieneDebtStats = { total: 0, debtCount: 0, rate: null }

function isUnsetText(v: string | null | undefined): boolean {
  return !v || v.trim().length === 0
}

function isUnsetDueDate(v: string | null | undefined): boolean {
  return !v || !isValidIsoDate(v)
}

export function computeHygieneDebt<T extends HygieneDebtFields>(
  items: readonly T[],
): HygieneDebtStats {
  let total = 0
  let debtCount = 0
  for (const it of items) {
    if (it.doneAt) continue
    if (it.archivedAt) continue
    total += 1
    if (isUnsetDueDate(it.dueDate) && isUnsetText(it.dod) && isUnsetText(it.description)) {
      debtCount += 1
    }
  }
  if (total === 0) return EMPTY
  return { total, debtCount, rate: debtCount / total }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'Hygiene Debt: 3 / 10 件 (30%) — title だけ items が triage 待ち'`
 *   `'Hygiene Debt: 0 件 (全 item に planning fields あり)'`
 *   `'未完了 0 件 (該当なし)'`
 */
export function formatHygieneDebtJa(stats: HygieneDebtStats): string {
  if (stats.total === 0 || stats.rate === null) return '未完了 0 件 (該当なし)'
  if (stats.debtCount === 0) return 'Hygiene Debt: 0 件 (全 item に planning fields あり)'
  const pct = Math.round(stats.rate * 100)
  return `Hygiene Debt: ${stats.debtCount} / ${stats.total} 件 (${pct}%) — title だけ items が triage 待ち`
}

/** dashboard chip 配色用 tone bucket */
export type HygieneDebtTone = 'good' | 'neutral' | 'warn'

export function hygieneDebtTone(stats: HygieneDebtStats): HygieneDebtTone {
  if (stats.rate === null) return 'neutral'
  if (stats.rate >= 0.3) return 'warn'
  if (stats.rate >= 0.1) return 'neutral'
  return 'good'
}

/**
 * AI prompt / dashboard で「実際に triage 必要な items list」を出す薄い filter。
 * 集計対象 (未完了 + 未 archive) かつ 全 3 軸 unset の item を返す stable 順序 (元順)。
 */
export function pickHygieneDebtItems<T extends HygieneDebtFields>(items: readonly T[]): T[] {
  const out: T[] = []
  for (const it of items) {
    if (it.doneAt) continue
    if (it.archivedAt) continue
    if (isUnsetDueDate(it.dueDate) && isUnsetText(it.dod) && isUnsetText(it.description)) {
      out.push(it)
    }
  }
  return out
}
