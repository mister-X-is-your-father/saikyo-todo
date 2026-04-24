import { beforeEach, describe, expect, it } from 'vitest'

import { _clearRegistriesForTest, getAction, listActions, registerAction } from './registry'
import type { ActionPlugin } from './types'

const plugin = (id: string, label: string): ActionPlugin => ({
  id,
  label,
  execute: () => {},
})

describe('registry', () => {
  beforeEach(() => _clearRegistriesForTest())

  it('register + getAction', () => {
    registerAction(plugin('a1', 'A1'))
    expect(getAction('a1')?.label).toBe('A1')
    expect(getAction('missing')).toBeUndefined()
  })

  it('listActions は全件を返す', () => {
    registerAction(plugin('a1', 'A1'))
    registerAction(plugin('a2', 'A2'))
    expect(
      listActions()
        .map((a) => a.id)
        .sort(),
    ).toEqual(['a1', 'a2'])
  })

  it('同じ id を再登録すると上書きされる', () => {
    registerAction(plugin('a1', '旧'))
    registerAction(plugin('a1', '新'))
    expect(getAction('a1')?.label).toBe('新')
    expect(listActions()).toHaveLength(1)
  })
})

describe('registerCorePlugins', () => {
  beforeEach(async () => {
    _clearRegistriesForTest()
    const { _resetCorePluginsForTest } = await import('./core')
    _resetCorePluginsForTest()
  })

  it('呼ぶと core アクションが登録される (idempotent)', async () => {
    const { registerCorePlugins } = await import('./core')
    registerCorePlugins()
    const first = listActions().length
    registerCorePlugins()
    expect(listActions().length).toBe(first)
    expect(getAction('core.reload-items')).toBeDefined()
    expect(getAction('core.ai-decompose')).toBeDefined()
  })

  it('ai-decompose プラグインは done 状態の Item には applicable でない', async () => {
    const { registerCorePlugins } = await import('./core')
    registerCorePlugins()
    const plugin = getAction('core.ai-decompose')!
    expect(plugin.applicableTo).toBeDefined()
    // status done は非表示
    expect(plugin.applicableTo!({ status: 'done' } as never)).toBe(false)
    // それ以外は表示
    expect(plugin.applicableTo!({ status: 'todo' } as never)).toBe(true)
    expect(plugin.applicableTo!({ status: 'in_progress' } as never)).toBe(true)
  })
})
