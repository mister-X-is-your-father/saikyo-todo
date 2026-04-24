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
  beforeEach(() => _clearRegistriesForTest())

  it('呼ぶと core アクションが登録される (idempotent)', async () => {
    const { registerCorePlugins } = await import('./core')
    registerCorePlugins()
    const first = listActions().length
    registerCorePlugins()
    expect(listActions().length).toBe(first)
    expect(getAction('core.reload-items')).toBeDefined()
  })
})
