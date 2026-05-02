/**
 * iter632 ai-automation: workspace.* part の input schema 単体テスト。
 */
import { describe, expect, it } from 'vitest'

import { workspaceGetTeamContextPart } from './workspace'

describe('workspaceGetTeamContextPart input schema', () => {
  it('空 object で valid (filter なし)', () => {
    const r = workspaceGetTeamContextPart.input.safeParse({})
    expect(r.success).toBe(true)
  })

  it('part metadata: id / sideEffect=read / category=item', () => {
    expect(workspaceGetTeamContextPart.id).toBe('workspace.get_team_context')
    expect(workspaceGetTeamContextPart.sideEffect).toBe('read')
    // workspace は新カテゴリを足さず、AI が「自分の workspace 状態」を取る系として
    // category=item でまとめる (= item / item_dependency / workspace の 3 part が
    // workspace 状態系として AI から見て同じ scope key で許可可能)
    expect(workspaceGetTeamContextPart.category).toBe('item')
  })
})
