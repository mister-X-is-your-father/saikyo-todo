/**
 * iter472 P0 (queue: Sprint 担当者 swim-lane Gantt scope A continued):
 * iter468 / 470 / 471 で揃った swim-lane substrate 7 helper
 * (computeSwimlaneBarPosition / groupItemsByAssigneeKey / detectLaneConflicts /
 *  collectConflictedItemIds / formatLaneConflictsJa / summarizeLaneLoad /
 *  formatLaneLoadJa) を 1 関数で連結する **orchestrator**。
 *
 * 「スプリントごとに、担当者を縦に並べて何をするかをわかるような機能 (がんと的な)」
 * (2026-04-30 ユーザ要望) の scope A UI bind 直前に挟む 1 段。次 iter で SprintCard
 * に「担当者ビュー」 disclosure を追加する際、本 helper 1 呼び出しで全 row 分の
 * render data (lane × items × position × conflict × load summary) が揃う。
 *
 * iter469 `computeTeamCapacityLoads` (member-capacity の team 横断 orchestrator)
 * と同 pattern。caller benefits:
 *  - SprintCard disclosure の render は `rows.map(row => <Lane …>)` のみ
 *  - 各 bar の left% / width% / clip flag は `row.items[i].position` から取得
 *  - 重複 bar の警告 highlight は `row.items[i].conflicted` で O(1) 判定
 *  - lane header chip は `row.loadSummaryJa` / `row.conflictsJa` を直接表示
 *
 * 仕様:
 *  - 入力 items のうち sprint 期間と全く重ならない (= computeSwimlaneBarPosition
 *    が null を返す) ものは row に含めない (lane 内に表示しない)
 *  - 1 item が複数 assignee を持つ場合は各 lane に重複 entry (groupItemsByAssigneeKey
 *    の挙動を踏襲)
 *  - assignee ゼロは null laneKey row (= "未割当" lane)、UI は最後に並べる
 *  - lane sort: 通常 lane は actorType:actorId 昇順、null lane は最後
 *  - lane 内 items sort: visibleStart 昇順 → 同点は item.id 昇順 (安定)
 *  - estimateMinutesByItemId 未指定は空 Map と同等 (= 全 lane で見積なし)
 */

import {
  computeSwimlaneBarPosition,
  groupItemsByAssigneeKey,
  type SwimlaneAssigneeRef,
  type SwimlaneBarPosition,
  type SwimlanePeriod,
} from './swimlane'
import {
  collectConflictedItemIds,
  detectLaneConflicts,
  formatLaneConflictsJa,
  formatLaneLoadJa,
  type LaneConflictPair,
  type LaneItemSource,
  type LaneLoadSummary,
  summarizeLaneLoad,
} from './swimlane-conflict'

export interface SprintSwimlaneItem<T> {
  item: T
  position: SwimlaneBarPosition
  /** 同 lane 内で他 bar と時間重複している (= UI で red border / 警告 chip) */
  conflicted: boolean
}

export interface SprintSwimlaneRow<T> {
  /** `${actorType}:${actorId}` 形式の lane キー、null は "未割当" lane */
  laneKey: string | null
  /** lane の actor 情報、null lane は null */
  assigneeRef: SwimlaneAssigneeRef | null
  /** lane に属する bar 群 (sprint 期間と重なるもののみ、visibleStart 昇順 sort) */
  items: SprintSwimlaneItem<T>[]
  /** 同 lane 内の時間重複 ペア (chip / aria 警告用) */
  conflicts: LaneConflictPair[]
  /** lane の件数 / 見積合計 / 重複ペア / 重複日数 集計 */
  loadSummary: LaneLoadSummary
  /** loadSummary を ja-JP 1 行に整形 (chip 直接表示用) */
  loadSummaryJa: string
  /** conflicts を ja-JP 1 行に整形 (aria-label / chip 直接表示用) */
  conflictsJa: string
}

export interface SprintSwimlaneInput<T extends LaneItemSource & { id: string }> {
  sprint: SwimlanePeriod
  items: ReadonlyArray<T>
  getAssignees: (itemId: string) => ReadonlyArray<SwimlaneAssigneeRef>
  estimateMinutesByItemId?: ReadonlyMap<string, number>
}

export function computeSprintSwimlane<T extends LaneItemSource & { id: string }>(
  input: SprintSwimlaneInput<T>,
): SprintSwimlaneRow<T>[] {
  const { sprint, items, getAssignees, estimateMinutesByItemId } = input
  const estimateMap = estimateMinutesByItemId ?? new Map<string, number>()

  const grouped = groupItemsByAssigneeKey(items, getAssignees)

  const rows: SprintSwimlaneRow<T>[] = []
  for (const [laneKey, laneItems] of grouped) {
    const conflicts = detectLaneConflicts(laneItems)
    const conflictedIds = collectConflictedItemIds(conflicts)
    const loadSummary = summarizeLaneLoad(laneItems, estimateMap)

    const positioned: SprintSwimlaneItem<T>[] = []
    for (const it of laneItems) {
      const position = computeSwimlaneBarPosition(
        { id: it.id, startDate: it.startDate ?? null, dueDate: it.dueDate ?? null },
        sprint,
      )
      if (!position) continue
      positioned.push({ item: it, position, conflicted: conflictedIds.has(it.id) })
    }
    positioned.sort((a, b) => {
      if (a.position.visibleStart !== b.position.visibleStart) {
        return a.position.visibleStart < b.position.visibleStart ? -1 : 1
      }
      return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0
    })

    const assigneeRef = laneKey ? parseAssigneeKey(laneKey) : null

    rows.push({
      laneKey,
      assigneeRef,
      items: positioned,
      conflicts,
      loadSummary,
      loadSummaryJa: formatLaneLoadJa(loadSummary),
      conflictsJa: formatLaneConflictsJa(conflicts),
    })
  }

  rows.sort((a, b) => {
    if (a.laneKey === null && b.laneKey === null) return 0
    if (a.laneKey === null) return 1
    if (b.laneKey === null) return -1
    return a.laneKey < b.laneKey ? -1 : a.laneKey > b.laneKey ? 1 : 0
  })

  return rows
}

function parseAssigneeKey(key: string): SwimlaneAssigneeRef | null {
  const idx = key.indexOf(':')
  if (idx <= 0 || idx === key.length - 1) return null
  return { actorType: key.slice(0, idx), actorId: key.slice(idx + 1) }
}
