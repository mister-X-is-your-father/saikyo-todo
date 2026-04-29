/**
 * iter349 ai-automation: 未完了 item の **期限 (dueDate) カバレッジ** を計算する
 * pure helper。
 *
 * 「計画化されている / 着手日が決まっていない」を 1 関数で出す substrate。AI 朝
 * brief / pm-agent / dashboard widget が「未完了 Item の 60% が期限未設定 →
 * 計画化推奨」のような planning hygiene insight を取り出せる。iter287 due-proximity
 * (期限近接バケット) は dueDate 設定済 item のみが対象、本 helper はその「分母」
 * (期限を持つかどうか) を集計する対称軸。
 *
 * 仕様:
 *   - input: items 配列 ({doneAt, archivedAt, dueDate} の structural subset)
 *   - 集計対象: doneAt == null && archivedAt == null (= 未完了 + 未 archive)
 *   - withDueDate: dueDate が `YYYY-MM-DD` 形式で valid なものの件数
 *   - withoutDueDate: dueDate が null/undefined/不正 ISO のもの (= 未設定 / 計画化漏れ)
 *   - total = withDueDate + withoutDueDate
 *   - coverageRate = withDueDate / total (total=0 → null)
 */

export interface DueDateCoverageFields {
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
  dueDate: string | null | undefined
}

export interface DueDateCoverageStats {
  total: number
  withDueDate: number
  withoutDueDate: number
  /** 0..1 の少数。total=0 → null */
  coverageRate: number | null
}

const EMPTY: DueDateCoverageStats = {
  total: 0,
  withDueDate: 0,
  withoutDueDate: 0,
  coverageRate: null,
}

function isValidIsoDate(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  const mo = Number(m[2])
  const d = Number(m[3])
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31
}

export function computeDueDateCoverage<T extends DueDateCoverageFields>(
  items: readonly T[],
): DueDateCoverageStats {
  let withDueDate = 0
  let withoutDueDate = 0
  for (const it of items) {
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
 *   `'期限カバレッジ: 60% (3 / 5 件 — 未設定 2 件)'`
 *   `'期限カバレッジ: 100% (5 / 5 件)'`
 *   `'期限カバレッジ: 0% (0 / 5 件 — 全て未設定)'`
 *   `'未完了 0 件 (該当なし)'`
 */
export function formatDueDateCoverageJa(stats: DueDateCoverageStats): string {
  if (stats.total === 0 || stats.coverageRate === null) return '未完了 0 件 (該当なし)'
  const pct = Math.round(stats.coverageRate * 100)
  if (pct === 100) {
    return `期限カバレッジ: 100% (${stats.withDueDate} / ${stats.total} 件)`
  }
  if (pct === 0) {
    return `期限カバレッジ: 0% (0 / ${stats.total} 件 — 全て未設定)`
  }
  return `期限カバレッジ: ${pct}% (${stats.withDueDate} / ${stats.total} 件 — 未設定 ${stats.withoutDueDate} 件)`
}

/**
 * dashboard chip 配色用の tone bucket。閾値: coverageRate >= 0.7 → 'good' (健全)、
 * 0.3 ≤ rate < 0.7 → 'neutral' (中立)、< 0.3 → 'warn' (planning 漏れ多)。total=0 /
 * coverageRate=null は 'neutral' (= 全完了の workspace は中立扱い)。
 */
export type DueDateCoverageTone = 'good' | 'neutral' | 'warn'

export function dueDateCoverageTone(stats: DueDateCoverageStats): DueDateCoverageTone {
  if (stats.total === 0 || stats.coverageRate === null) return 'neutral'
  if (stats.coverageRate >= 0.7) return 'good'
  if (stats.coverageRate >= 0.3) return 'neutral'
  return 'warn'
}
