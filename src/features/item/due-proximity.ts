/**
 * iter287 ai-automation: Item の dueDate を「期限近接バケット」に分類する pure helper。
 *
 * AI brief / pm-agent / dashboard widget / UI EmptyState などが「この Item は
 * いつまでに?」を 1 関数で同じカテゴリに揃えられる substrate。今までは
 *   - `urgency.ts#dueProximityBonus` (private) が score 化
 *   - `today/build-groups.ts` が group 用に inline 分類
 *   - dashboard service が overdueCount を SQL 集計
 * と 3 系統で「期限切れ / 今日 / 明日 / 今週内」を別々に表現していたので、
 * client 側で再表現する場合 (AI prompt embed / item チップ表示) には毎回
 * 書き直す必要があった。
 *
 * バケット仕様 (urgency.ts と同じ閾値、score 重複は意図):
 *  - `overdue` — dueDate < today
 *  - `today`   — dueDate === today
 *  - `tomorrow` — dueDate === today+1
 *  - `thisWeek` — today+2 ≤ dueDate ≤ today+6 (= 6 日先まで)
 *  - `later`   — dueDate ≥ today+7
 *  - `noDate`  — dueDate が null/undefined/不正 ISO
 *
 * 注意:
 *  - `today` は Date or string、未指定 → new Date() (端末ローカル TZ)
 *  - 不正 ISO は `noDate` と同じ扱い (fail-soft)
 *  - `diffDays` は overdue で負、noDate で undefined
 */
import { MS_PER_DAY, toLocalMidnight } from '@/lib/date/iso'
import { formatNonZeroCounts } from '@/lib/format-counts'

export type DueProximityKind = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'noDate'

export interface DueProximity {
  kind: DueProximityKind
  /** dueDate - today (UTC 日数差)。noDate は undefined */
  diffDays: number | undefined
  /** UI 用の日本語短ラベル ("期限切れ" / "今日" / "明日" / "今週内" / "今後" / "未設定") */
  label: string
}

const LABEL: Record<DueProximityKind, string> = {
  overdue: '期限切れ',
  today: '今日',
  tomorrow: '明日',
  thisWeek: '今週内',
  later: '今後',
  noDate: '未設定',
}

export function getDueProximity(
  dueDate: string | null | undefined,
  today: Date | string = new Date(),
): DueProximity {
  if (!dueDate) return { kind: 'noDate', diffDays: undefined, label: LABEL.noDate }
  const todayDate = typeof today === 'string' ? parseIsoDate(today) : toLocalMidnight(today)
  const dueParsed = parseIsoDate(dueDate)
  if (!todayDate || !dueParsed) {
    return { kind: 'noDate', diffDays: undefined, label: LABEL.noDate }
  }
  const diffDays = Math.round((dueParsed.getTime() - todayDate.getTime()) / MS_PER_DAY)
  let kind: DueProximityKind
  if (diffDays < 0) kind = 'overdue'
  else if (diffDays === 0) kind = 'today'
  else if (diffDays === 1) kind = 'tomorrow'
  else if (diffDays <= 6) kind = 'thisWeek'
  else kind = 'later'
  return { kind, diffDays, label: LABEL[kind] }
}

/** UI で「期限切れ」「今日」等の短ラベルを取り出すための糖衣。 */
export function dueProximityLabel(kind: DueProximityKind): string {
  return LABEL[kind]
}

/** 6 種 kind を全部空配列で初期化したテンプレ (Object.keys 順固定用)。 */
const KIND_ORDER: readonly DueProximityKind[] = [
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
  'noDate',
] as const

export type DueProximityGroups<T> = Record<DueProximityKind, T[]>

/**
 * iter289 ai-automation: items を期限近接バケット別の配列に振り分ける。
 *
 * AI brief / pm-agent / dashboard widget が「期限切れ 3 件 / 今日 2 件 …」
 * を 1 関数で出せる substrate。done/archive 済を除外したい場合は caller 側で
 * 先に filter してから渡すこと (本関数は dueDate しか見ない)。
 *
 * 順序: 元配列順を保つ stable group 化 (per-kind 内は元順)。
 * 各 kind は必ず空配列で初期化されるので `groups.thisWeek.length` のような
 * undefined チェック不要のアクセスができる。
 */
export function groupItemsByDueProximity<T extends { dueDate: string | null | undefined }>(
  items: readonly T[],
  today: Date | string = new Date(),
): DueProximityGroups<T> {
  const groups: DueProximityGroups<T> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDate: [],
  }
  for (const it of items) {
    const { kind } = getDueProximity(it.dueDate, today)
    groups[kind].push(it)
  }
  return groups
}

/**
 * iter289 ai-automation: items を期限近接バケット別の件数だけに圧縮。
 * AI prompt の context 行 (`期限切れ 3 / 今日 2 / 明日 1 / 今週内 4 / 今後 8 / 未設定 2`)
 * を作る時に便利。
 */
export function countItemsByDueProximity(
  items: readonly { dueDate: string | null | undefined }[],
  today: Date | string = new Date(),
): Record<DueProximityKind, number> {
  const counts = {
    overdue: 0,
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    later: 0,
    noDate: 0,
  } satisfies Record<DueProximityKind, number>
  for (const it of items) {
    const { kind } = getDueProximity(it.dueDate, today)
    counts[kind] += 1
  }
  return counts
}

/** AI prompt 行 / dashboard chip 用の 1 行 summary (件数 0 の bucket は省略)。 */
export function formatDueProximityCounts(counts: Record<DueProximityKind, number>): string {
  return formatNonZeroCounts(counts, KIND_ORDER, LABEL)
}

function parseIsoDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d)
}
