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
  const diffDays = Math.round((dueParsed.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000))
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

function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
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
