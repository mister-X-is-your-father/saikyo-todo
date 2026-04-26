/**
 * Gantt critical path 計算 (純関数。Phase 6.15、TeamGantt / GanttPRO ベンチマーク)。
 *
 * 入力:
 *   - items: { id, durationDays }
 *   - dependencies: { fromId, toId } の有向辺 (from が前提、to が後続。Phase 6.10
 *     `item_dependencies` の type='blocks' と同じ向き)
 *
 * アルゴリズム (Activity-on-Node CPM):
 *   1. グラフを構築 + トポロジカルソート (Kahn) — 循環があれば err
 *   2. forward pass: ES (earliest start) / EF (earliest finish) を計算
 *   3. project duration = max(EF)
 *   4. backward pass: LF (latest finish) / LS (latest start) を計算
 *   5. slack = LS - ES (= LF - EF)。slack <= 0 (浮動小数誤差で 0 扱い) は critical path
 *
 * 戻り値:
 *   - schedule: Map<itemId, { es, ef, ls, lf, slack, isCritical }>
 *   - criticalPathIds: string[] (toposort 順)
 *   - projectDurationDays: number
 *
 * 失敗:
 *   - 循環があれば 'CYCLE_DETECTED'
 *   - duration < 0 があれば 'NEGATIVE_DURATION'
 *
 * 注意:
 *   - duration=0 の milestone も扱える (slack=0 で critical 判定される)
 *   - 孤立ノード (依存が無い item) は ES=0 / EF=duration / slack=projectDuration-EF
 *   - Date への変換は呼び出し側で `addDays(projectStart, es)` 等を行う (この関数は
 *     workdays / weekends を考慮しない暦日ベース)
 */

export interface CpmItem {
  id: string
  /** 工期 (暦日)。MUST: >= 0 */
  durationDays: number
}

export interface CpmEdge {
  /** 前提 (上流)。これが完了するまで toId は進められない */
  fromId: string
  /** 後続 (下流) */
  toId: string
}

export interface CpmNodeSchedule {
  es: number // earliest start (project 開始からの日数)
  ef: number // earliest finish
  ls: number // latest start (project 完了に間に合う最遅の開始)
  lf: number // latest finish
  slack: number // ls - es (>= 0)
  isCritical: boolean // slack === 0
}

export type CpmError = 'CYCLE_DETECTED' | 'NEGATIVE_DURATION' | 'UNKNOWN_DEPENDENCY_NODE'

export interface CpmResult {
  schedule: Map<string, CpmNodeSchedule>
  /** toposort 順に並んだ critical な item id 列 (durationDays > 0 の chain を強調) */
  criticalPathIds: string[]
  /** project 全体の所要日数 (max EF) */
  projectDurationDays: number
}

const EPS = 1e-9

export function computeCriticalPath(
  items: CpmItem[],
  edges: CpmEdge[],
):
  | { ok: true; value: CpmResult }
  | { ok: false; error: CpmError; details?: { itemId?: string; cycle?: string[] } } {
  // バリデーション
  for (const it of items) {
    if (it.durationDays < 0) {
      return { ok: false, error: 'NEGATIVE_DURATION', details: { itemId: it.id } }
    }
  }
  const idSet = new Set(items.map((i) => i.id))
  for (const e of edges) {
    if (!idSet.has(e.fromId) || !idSet.has(e.toId)) {
      return {
        ok: false,
        error: 'UNKNOWN_DEPENDENCY_NODE',
        details: { itemId: idSet.has(e.fromId) ? e.toId : e.fromId },
      }
    }
  }

  // 隣接表 (out / in)
  const out = new Map<string, string[]>()
  const inEdges = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const it of items) {
    out.set(it.id, [])
    inEdges.set(it.id, [])
    indegree.set(it.id, 0)
  }
  for (const e of edges) {
    out.get(e.fromId)!.push(e.toId)
    inEdges.get(e.toId)!.push(e.fromId)
    indegree.set(e.toId, (indegree.get(e.toId) ?? 0) + 1)
  }

  // Kahn 法でトポロジカルソート
  const queue: string[] = []
  for (const it of items) if ((indegree.get(it.id) ?? 0) === 0) queue.push(it.id)
  const topo: string[] = []
  const remaining = new Map(indegree)
  while (queue.length > 0) {
    const id = queue.shift()!
    topo.push(id)
    for (const nx of out.get(id) ?? []) {
      const next = (remaining.get(nx) ?? 0) - 1
      remaining.set(nx, next)
      if (next === 0) queue.push(nx)
    }
  }
  if (topo.length !== items.length) {
    // 循環ノードを抽出 (残っている node のうち in-degree > 0 のもの)
    const cycle = items.map((i) => i.id).filter((id) => (remaining.get(id) ?? 0) > 0)
    return { ok: false, error: 'CYCLE_DETECTED', details: { cycle } }
  }

  const durMap = new Map(items.map((i) => [i.id, i.durationDays]))
  const es = new Map<string, number>()
  const ef = new Map<string, number>()
  // forward pass
  for (const id of topo) {
    const preds = inEdges.get(id) ?? []
    const e = preds.length === 0 ? 0 : Math.max(...preds.map((p) => ef.get(p)!))
    es.set(id, e)
    ef.set(id, e + (durMap.get(id) ?? 0))
  }
  const projectDurationDays = items.length === 0 ? 0 : Math.max(...items.map((i) => ef.get(i.id)!))

  // backward pass
  const lf = new Map<string, number>()
  const ls = new Map<string, number>()
  for (let i = topo.length - 1; i >= 0; i--) {
    const id = topo[i]!
    const succs = out.get(id) ?? []
    const l = succs.length === 0 ? projectDurationDays : Math.min(...succs.map((s) => ls.get(s)!))
    lf.set(id, l)
    ls.set(id, l - (durMap.get(id) ?? 0))
  }

  // schedule + critical path
  const schedule = new Map<string, CpmNodeSchedule>()
  for (const it of items) {
    const eS = es.get(it.id)!
    const eF = ef.get(it.id)!
    const lS = ls.get(it.id)!
    const lF = lf.get(it.id)!
    const slack = lS - eS
    schedule.set(it.id, {
      es: eS,
      ef: eF,
      ls: lS,
      lf: lF,
      slack,
      isCritical: Math.abs(slack) < EPS,
    })
  }
  const criticalPathIds = topo.filter((id) => schedule.get(id)!.isCritical)

  return {
    ok: true,
    value: { schedule, criticalPathIds, projectDurationDays },
  }
}
