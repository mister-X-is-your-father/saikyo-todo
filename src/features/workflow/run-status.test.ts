import { describe, expect, it } from 'vitest'

import { runStatusBadgeClass, runStatusLabel } from './run-status'

describe('runStatusLabel', () => {
  it('既知 status を JA label に変換', () => {
    expect(runStatusLabel('queued')).toBe('待機')
    expect(runStatusLabel('pending')).toBe('保留')
    expect(runStatusLabel('running')).toBe('実行中')
    expect(runStatusLabel('succeeded')).toBe('成功')
    expect(runStatusLabel('failed')).toBe('失敗')
    expect(runStatusLabel('cancelled')).toBe('中止')
    expect(runStatusLabel('skipped')).toBe('スキップ')
  })

  it('未知 status は元の文字列をそのまま (DB 旧値防衛)', () => {
    expect(runStatusLabel('unknown')).toBe('unknown')
    expect(runStatusLabel('')).toBe('')
  })
})

describe('runStatusBadgeClass', () => {
  it('succeeded は緑系', () => {
    expect(runStatusBadgeClass('succeeded')).toContain('bg-green-100')
  })

  it('failed は赤系', () => {
    expect(runStatusBadgeClass('failed')).toContain('bg-red-100')
  })

  it('running は amber 系', () => {
    expect(runStatusBadgeClass('running')).toContain('bg-amber-100')
  })

  it('queued / pending / cancelled / skipped は muted', () => {
    expect(runStatusBadgeClass('queued')).toBe('bg-muted text-muted-foreground')
    expect(runStatusBadgeClass('pending')).toBe('bg-muted text-muted-foreground')
    expect(runStatusBadgeClass('cancelled')).toBe('bg-muted text-muted-foreground')
    expect(runStatusBadgeClass('skipped')).toBe('bg-muted text-muted-foreground')
  })

  it('未知 status は muted fallback', () => {
    expect(runStatusBadgeClass('unknown')).toBe('bg-muted text-muted-foreground')
    expect(runStatusBadgeClass('')).toBe('bg-muted text-muted-foreground')
  })
})
