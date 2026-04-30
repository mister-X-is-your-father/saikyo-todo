import { describe, expect, it } from 'vitest'

import { isValidMode, resolveWorkspaceMode } from './resolve-mode'

describe('isValidMode', () => {
  it('accepts the 3 known modes', () => {
    expect(isValidMode('none')).toBe(true)
    expect(isValidMode('taskchute')).toBe(true)
    expect(isValidMode('gtd')).toBe(true)
  })

  it('rejects unknown / typo / non-string', () => {
    expect(isValidMode('TASKCHUTE')).toBe(false)
    expect(isValidMode('pomodoro')).toBe(false)
    expect(isValidMode('')).toBe(false)
    expect(isValidMode(null)).toBe(false)
    expect(isValidMode(undefined)).toBe(false)
    expect(isValidMode(123)).toBe(false)
  })
})

describe('resolveWorkspaceMode', () => {
  it('URL mode が最優先 (workspace default を override)', () => {
    expect(resolveWorkspaceMode({ urlMode: 'taskchute', workspaceDefault: 'gtd' })).toBe(
      'taskchute',
    )
  })

  it('URL mode が無ければ workspace default に fallback', () => {
    expect(resolveWorkspaceMode({ urlMode: null, workspaceDefault: 'gtd' })).toBe('gtd')
    expect(resolveWorkspaceMode({ urlMode: undefined, workspaceDefault: 'taskchute' })).toBe(
      'taskchute',
    )
  })

  it('両方とも無ければ none', () => {
    expect(resolveWorkspaceMode({})).toBe('none')
    expect(resolveWorkspaceMode({ urlMode: null, workspaceDefault: null })).toBe('none')
  })

  it('不正な URL mode は workspace default に落ちる (typo を黙って丸める)', () => {
    expect(resolveWorkspaceMode({ urlMode: 'POMODORO', workspaceDefault: 'gtd' })).toBe('gtd')
  })

  it('不正な workspace default は none に落ちる (旧 mode 撤回後の安全弁)', () => {
    expect(resolveWorkspaceMode({ urlMode: null, workspaceDefault: 'eisenhower' })).toBe('none')
  })

  it('explicit "none" もそのまま返す (workspace 設定で「mode 使わない」を選択した状態)', () => {
    expect(resolveWorkspaceMode({ urlMode: 'none', workspaceDefault: 'gtd' })).toBe('none')
  })
})
