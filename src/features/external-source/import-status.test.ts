/**
 * iter300 refactor: import-status pure helper の単体検証。
 * iter275 `run-status.test.ts` と同形 (label / class / fallback の 3 軸)。
 */
import { describe, expect, it } from 'vitest'

import { importStatusBadgeClass, importStatusLabel } from './import-status'

describe('importStatusLabel', () => {
  it('既知 4 status の JA ラベルを返す', () => {
    expect(importStatusLabel('queued')).toBe('待機')
    expect(importStatusLabel('running')).toBe('実行中')
    expect(importStatusLabel('succeeded')).toBe('成功')
    expect(importStatusLabel('failed')).toBe('失敗')
  })

  it('未知 status は raw 文字列をそのまま返す (fallback)', () => {
    expect(importStatusLabel('weird-state')).toBe('weird-state')
    expect(importStatusLabel('cancelled')).toBe('cancelled') // 将来の DB 拡張想定
    expect(importStatusLabel('')).toBe('')
  })
})

describe('importStatusBadgeClass', () => {
  it('成功は green tone', () => {
    const cls = importStatusBadgeClass('succeeded')
    expect(cls).toContain('bg-green-100')
    expect(cls).toContain('text-green-700')
  })

  it('失敗は red tone', () => {
    const cls = importStatusBadgeClass('failed')
    expect(cls).toContain('bg-red-100')
    expect(cls).toContain('text-red-700')
  })

  it('実行中は amber tone', () => {
    const cls = importStatusBadgeClass('running')
    expect(cls).toContain('bg-amber-100')
    expect(cls).toContain('text-amber-700')
  })

  it('queued は muted tone', () => {
    expect(importStatusBadgeClass('queued')).toBe('bg-muted text-muted-foreground')
  })

  it('未知 status は muted fallback', () => {
    expect(importStatusBadgeClass('cancelled')).toBe('bg-muted text-muted-foreground')
    expect(importStatusBadgeClass('weird-state')).toBe('bg-muted text-muted-foreground')
    expect(importStatusBadgeClass('')).toBe('bg-muted text-muted-foreground')
  })

  it('全 known status が dark mode class を含む (succeeded/failed/running)', () => {
    // muted fallback を持つ queued 以外は dark variant 必須 (現行 UI 整合)
    expect(importStatusBadgeClass('succeeded')).toContain('dark:')
    expect(importStatusBadgeClass('failed')).toContain('dark:')
    expect(importStatusBadgeClass('running')).toContain('dark:')
  })
})

describe('label / class 整合', () => {
  it('label と class が同 status に対して一意に対応', () => {
    // 4 status × 2 関数 = 8 戻り値が独立に決まる
    const statuses = ['queued', 'running', 'succeeded', 'failed']
    const labels = statuses.map((s) => importStatusLabel(s))
    const classes = statuses.map((s) => importStatusBadgeClass(s))
    expect(new Set(labels).size).toBe(4)
    // class は queued (muted) 以外で一意
    expect(new Set(classes).size).toBeGreaterThanOrEqual(3)
  })
})
