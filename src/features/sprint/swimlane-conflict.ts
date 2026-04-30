/**
 * iter470 P0 (queue: Sprint 担当者 swim-lane Gantt scope A continued):
 * 同 lane 内 (= 同 assignee) で時間重複する bar を検出する pure helper。
 *
 * 「同 lane 内で時間重複があれば conflict 警告」(2026-04-30 ユーザ要望) の
 * scope A substrate (UI で警告 chip / red border 等を出すため)。
 *
 * 役割使い分け:
 *  - iter468 `computeSwimlaneBarPosition` — 1 bar の位置 % 計算 (描画)
 *  - 本 helper — 同 lane 内 bar 集合の重複検出 (警告 / 配置)
 *
 * 仕様:
 *  - 入力 items は **同一 lane (= 同 assignee) の bar 集合** (caller が
 *    `groupItemsByAssigneeKey` で分割済を渡す前提)
 *  - 各 item は `[startDate..dueDate]` (両端 inclusive、ISO `YYYY-MM-DD`) で表現
 *  - 期間が 1 日でも被れば conflict (= 同日に複数 bar が乗る = 同時並行不可な
 *    タスク群が 1 人にアサイン)
 *  - return: 重複ペアの配列 (`a.id < b.id` で id 安定 sort、各ペア 1 件のみ)
 *  - 単純実装 O(N²) で OK (1 lane に N=100 来ることは稀、性能劣化なし)
 *  - startDate / dueDate のどちらかが null → conflict 検出対象外 (= bar 描画
 *    自体されないので無視)
 *  - 不正 ISO は parseIsoDateAsLocalMidnight が null を返し対象外
 *  - dueDate < startDate (不正範囲) は対象外 (= caller validation が responsibility)
 */

import { parseIsoDateAsLocalMidnight } from '@/lib/date/iso'

export interface LaneItemSource {
  id: string
  startDate: string | null | undefined
  dueDate: string | null | undefined
}

export interface LaneConflictPair {
  a: string
  b: string
  /** 重複日数 (両端 inclusive、最低 1 日) */
  overlapDays: number
}

interface NormalizedItem {
  id: string
  startMs: number
  endMs: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function detectLaneConflicts(items: ReadonlyArray<LaneItemSource>): LaneConflictPair[] {
  const normalized: NormalizedItem[] = []
  for (const it of items) {
    if (!it.startDate || !it.dueDate) continue
    const start = parseIsoDateAsLocalMidnight(it.startDate)
    const end = parseIsoDateAsLocalMidnight(it.dueDate)
    if (!start || !end) continue
    if (end.getTime() < start.getTime()) continue
    normalized.push({ id: it.id, startMs: start.getTime(), endMs: end.getTime() })
  }

  const pairs: LaneConflictPair[] = []
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i]!
      const b = normalized[j]!
      const overlap = computeOverlapDays(a, b)
      if (overlap > 0) {
        const [first, second] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]
        pairs.push({ a: first, b: second, overlapDays: overlap })
      }
    }
  }
  // a 昇順 → 同 a 内は b 昇順 で安定 sort
  return pairs.sort((x, y) => (x.a === y.a ? x.b.localeCompare(y.b) : x.a.localeCompare(y.a)))
}

function computeOverlapDays(a: NormalizedItem, b: NormalizedItem): number {
  const overlapStart = Math.max(a.startMs, b.startMs)
  const overlapEnd = Math.min(a.endMs, b.endMs)
  if (overlapEnd < overlapStart) return 0
  return Math.round((overlapEnd - overlapStart) / MS_PER_DAY) + 1
}

/**
 * 「lane に conflict がある itemId 群」を Set で返す helper (UI で個々の bar に
 * 警告 attr を付けるための逆引き index)。重複ペアの両 endpoint id を全て収集。
 */
export function collectConflictedItemIds(pairs: ReadonlyArray<LaneConflictPair>): Set<string> {
  const out = new Set<string>()
  for (const p of pairs) {
    out.add(p.a)
    out.add(p.b)
  }
  return out
}

/**
 * 重複検出を ja-JP 1 行 summary に整形 (chip / aria-label / AI brief 共通)。
 * `0` → '時間重複なし' / 1 ペア → '時間重複: 1 ペア (合計 N 日)' / N ペア複数 →
 * '時間重複: N ペア (合計 M 日)'。N≥2 の時は最大 overlap 日数 / 平均日数等を
 * 拡張する余地 (= scope B 以降)。
 */
export function formatLaneConflictsJa(pairs: ReadonlyArray<LaneConflictPair>): string {
  if (pairs.length === 0) return '時間重複なし'
  const totalDays = pairs.reduce((s, p) => s + p.overlapDays, 0)
  return `時間重複: ${pairs.length} ペア (合計 ${totalDays} 日)`
}
