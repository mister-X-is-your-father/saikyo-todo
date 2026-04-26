/**
 * Today view の表示用 4 group 分類 (Todoist Today/Upcoming 風)。
 * 純粋関数なので単体 test 可能 (vitest 別ファイル) — 副作用なし。
 *
 * 分類ルール (today=YYYY-MM-DD UTC):
 *   - 期限超過: dueDate < today (doneAt なし)
 *   - 今日:    scheduledFor === today || dueDate === today
 *   - 明日:    scheduledFor === today+1 || dueDate === today+1
 *   - 今週内:  上記に該当しない、かつ today+2 ≤ (scheduledFor or dueDate) ≤ today+7
 *   - 該当なし: いずれの bucket にも入らない (= 表示対象外)
 *
 * doneAt あり (= 完了済) は全 bucket から除外。
 * priority 昇順 (1=最高 → 4=最低) で各 group 内をソート。
 */
import type { Item } from '@/features/item/schema'

export interface Group {
  label: string
  items: Item[]
}

/** YYYY-MM-DD 文字列を日数 offset (UTC ベース) で進める。 */
export function shiftISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildTodayGroups(items: Item[], today: string): Group[] {
  const tomorrow = shiftISO(today, 1)
  const weekEnd = shiftISO(today, 7)
  const overdue: Item[] = []
  const todayList: Item[] = []
  const tomorrowList: Item[] = []
  const weekList: Item[] = []
  for (const it of items) {
    if (it.doneAt) continue
    const due = it.dueDate
    const sched = it.scheduledFor
    if (due && due < today) {
      overdue.push(it)
      continue
    }
    if (sched === today || due === today) {
      todayList.push(it)
      continue
    }
    if (due === tomorrow || sched === tomorrow) {
      tomorrowList.push(it)
      continue
    }
    if (due && due > tomorrow && due <= weekEnd) {
      weekList.push(it)
    } else if (sched && sched > tomorrow && sched <= weekEnd) {
      weekList.push(it)
    }
  }
  const priSort = (a: Item, b: Item) => (a.priority ?? 4) - (b.priority ?? 4)
  // Phase 6.15 iter 85: ラベルに日付 / 範囲を追記して "明日って何日?" を一目で
  const todayLabel = `今日 (${shortDate(today)})`
  const tomorrowLabel = `明日 (${shortDate(tomorrow)})`
  const weekLabel = `今週内 (${shortDate(shiftISO(today, 2))} 〜 ${shortDate(weekEnd)})`
  return [
    { label: '期限超過', items: overdue.sort(priSort) },
    { label: todayLabel, items: todayList.sort(priSort) },
    { label: tomorrowLabel, items: tomorrowList.sort(priSort) },
    { label: weekLabel, items: weekList.sort(priSort) },
  ]
}

/** YYYY-MM-DD → "M/D (曜)" 形式に圧縮。 */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const dow = '日月火水木金土'[d.getUTCDay()]
  return `${m}/${day} ${dow}`
}
