/**
 * Gantt critical path 計算の単体テスト (pure / DB 不要)。
 */
import { describe, expect, it } from 'vitest'

import { computeCriticalPath, type CpmEdge, type CpmItem } from './critical-path'

const item = (id: string, durationDays: number): CpmItem => ({ id, durationDays })
const edge = (fromId: string, toId: string): CpmEdge => ({ fromId, toId })

describe('computeCriticalPath', () => {
  it('空の入力で projectDurationDays=0', () => {
    const r = computeCriticalPath([], [])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(0)
    expect(r.value.criticalPathIds).toEqual([])
  })

  it('単独 item: ES=0 / EF=duration / slack=0 で critical', () => {
    const r = computeCriticalPath([item('A', 5)], [])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(5)
    expect(r.value.schedule.get('A')).toMatchObject({ es: 0, ef: 5, slack: 0, isCritical: true })
    expect(r.value.criticalPathIds).toEqual(['A'])
  })

  it('直列 A→B→C: 全て critical, project = 合計', () => {
    const r = computeCriticalPath(
      [item('A', 2), item('B', 3), item('C', 4)],
      [edge('A', 'B'), edge('B', 'C')],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(9)
    expect(r.value.criticalPathIds).toEqual(['A', 'B', 'C'])
    expect(r.value.schedule.get('B')).toMatchObject({ es: 2, ef: 5, slack: 0 })
  })

  it('並列分岐 A→{B,C}→D: 長い枝が critical、短い枝に slack', () => {
    // A=2, B=4 (long), C=1 (short), D=3
    const r = computeCriticalPath(
      [item('A', 2), item('B', 4), item('C', 1), item('D', 3)],
      [edge('A', 'B'), edge('A', 'C'), edge('B', 'D'), edge('C', 'D')],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(2 + 4 + 3) // 9
    expect(r.value.schedule.get('B')!.isCritical).toBe(true)
    expect(r.value.schedule.get('C')!.isCritical).toBe(false)
    expect(r.value.schedule.get('C')!.slack).toBe(3) // 4 - 1
    expect(r.value.criticalPathIds).toEqual(['A', 'B', 'D'])
  })

  it('独立した複数 item は最長が project duration', () => {
    const r = computeCriticalPath([item('A', 5), item('B', 8), item('C', 3)], [])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(8)
    // B は critical (slack=0)、A は slack=3、C は slack=5
    expect(r.value.schedule.get('B')!.isCritical).toBe(true)
    expect(r.value.schedule.get('A')!.slack).toBe(3)
    expect(r.value.schedule.get('C')!.slack).toBe(5)
  })

  it('milestone (duration=0) も critical 判定される', () => {
    // M=0 milestone, A=2 → M → B=3
    const r = computeCriticalPath(
      [item('A', 2), item('M', 0), item('B', 3)],
      [edge('A', 'M'), edge('M', 'B')],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(5)
    expect(r.value.schedule.get('M')).toMatchObject({ es: 2, ef: 2, slack: 0, isCritical: true })
    expect(r.value.criticalPathIds).toEqual(['A', 'M', 'B'])
  })

  it('循環は CYCLE_DETECTED', () => {
    const r = computeCriticalPath([item('A', 1), item('B', 1)], [edge('A', 'B'), edge('B', 'A')])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBe('CYCLE_DETECTED')
    expect(r.details?.cycle).toEqual(expect.arrayContaining(['A', 'B']))
  })

  it('未知の依存 node は UNKNOWN_DEPENDENCY_NODE', () => {
    const r = computeCriticalPath([item('A', 1)], [edge('A', 'GHOST')])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBe('UNKNOWN_DEPENDENCY_NODE')
    expect(r.details?.itemId).toBe('GHOST')
  })

  it('負の duration は NEGATIVE_DURATION', () => {
    const r = computeCriticalPath([item('A', -1)], [])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBe('NEGATIVE_DURATION')
  })

  it('複雑な DAG: 最長 path のみ critical', () => {
    // A=1 → B=2 → D=4
    // A → C=10 → D
    // 期待: A→C→D (1+10+4=15) が critical、B は slack=8
    const r = computeCriticalPath(
      [item('A', 1), item('B', 2), item('C', 10), item('D', 4)],
      [edge('A', 'B'), edge('A', 'C'), edge('B', 'D'), edge('C', 'D')],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.projectDurationDays).toBe(15)
    expect(r.value.schedule.get('B')!.slack).toBe(8)
    expect(r.value.criticalPathIds).toEqual(['A', 'C', 'D'])
  })
})
