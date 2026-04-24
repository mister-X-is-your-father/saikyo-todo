/**
 * 純粋ロジックの unit test (DB 非依存)。
 */
import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import { buildInstantiationPlan } from './instantiate-plan'

/** 決定的な id factory (test の安定性のため)。 */
function makeIdFactory(prefix: string) {
  let i = 0
  return () => `${prefix}-${String(++i).padStart(8, '0')}-0000-0000-0000-000000000000`
}

const today = new Date('2026-05-01T00:00:00Z')

describe('buildInstantiationPlan', () => {
  it('子なし template → root item だけ、 Mustache 展開される', () => {
    const plan = buildInstantiationPlan({
      template: { name: 'onboarding {{client}}' },
      templateItems: [],
      variables: { client: 'Acme' },
      today,
      idFactory: makeIdFactory('11111111'),
    })
    expect(plan.rootItem.title).toBe('onboarding Acme')
    expect(plan.rootItem.parentPath).toBe('')
    expect(plan.children).toEqual([])
  })

  it('1 階層 template: 子 item は root.label を parentPath に持つ', () => {
    const plan = buildInstantiationPlan({
      template: { name: 'T' },
      templateItems: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          title: 'step 1',
          description: '',
          parentPath: '',
          statusInitial: 'todo',
          dueOffsetDays: null,
          isMust: false,
          dod: null,
          agentRoleToInvoke: null,
          defaultAssignees: [],
        },
      ],
      variables: {},
      today,
      idFactory: makeIdFactory('22222222'),
    })
    const rootLabel = uuidToLabel(plan.rootItem.id)
    expect(plan.children).toHaveLength(1)
    expect(plan.children[0]!.parentPath).toBe(rootLabel)
  })

  it('2 階層 template: 孫の parentPath = rootLabel.childLabel', () => {
    const parentTid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const childTid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const plan = buildInstantiationPlan({
      template: { name: 'T' },
      templateItems: [
        {
          id: parentTid,
          title: 'P',
          description: '',
          parentPath: '',
          statusInitial: 'todo',
          dueOffsetDays: null,
          isMust: false,
          dod: null,
          agentRoleToInvoke: null,
          defaultAssignees: [],
        },
        {
          id: childTid,
          title: 'C',
          description: '',
          parentPath: uuidToLabel(parentTid),
          statusInitial: 'todo',
          dueOffsetDays: null,
          isMust: false,
          dod: null,
          agentRoleToInvoke: null,
          defaultAssignees: [],
        },
      ],
      variables: {},
      today,
      idFactory: makeIdFactory('33333333'),
    })
    const rootLabel = uuidToLabel(plan.rootItem.id)
    const parentNew = plan.children.find((c) => c.title === 'P')!
    const childNew = plan.children.find((c) => c.title === 'C')!
    expect(parentNew.parentPath).toBe(rootLabel)
    expect(childNew.parentPath).toBe(`${rootLabel}.${uuidToLabel(parentNew.id)}`)
  })

  it('dueOffsetDays=3 → 今日 +3 の ISO 日付', () => {
    const plan = buildInstantiationPlan({
      template: { name: 'T' },
      templateItems: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          title: 'x',
          description: '',
          parentPath: '',
          statusInitial: 'todo',
          dueOffsetDays: 3,
          isMust: false,
          dod: null,
          agentRoleToInvoke: null,
          defaultAssignees: [],
        },
      ],
      variables: {},
      today: new Date('2026-05-01T00:00:00Z'),
      idFactory: makeIdFactory('44444444'),
    })
    expect(plan.children[0]!.dueDate).toBe('2026-05-04')
  })

  it('Mustache は HTML escape しない (<>&{} そのまま)', () => {
    const plan = buildInstantiationPlan({
      template: { name: 'hi {{n}}' },
      templateItems: [],
      variables: { n: '<Acme>' },
      today,
      idFactory: makeIdFactory('55555555'),
    })
    expect(plan.rootItem.title).toBe('hi <Acme>')
  })

  it('rootTitleOverride が指定されたら template.name ではなくそちらを使う', () => {
    const plan = buildInstantiationPlan({
      template: { name: 'orig' },
      templateItems: [],
      variables: { x: 'Y' },
      today,
      rootTitleOverride: 'custom {{x}}',
      idFactory: makeIdFactory('66666666'),
    })
    expect(plan.rootItem.title).toBe('custom Y')
  })
})
