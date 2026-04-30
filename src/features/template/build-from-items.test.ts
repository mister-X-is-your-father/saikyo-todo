/**
 * build-from-items.ts (Item ツリー → Template Blueprint 変換) の unit test。
 *
 * 反対方向 (Template → Item) の test は instantiate-plan.test.ts。
 * 本 test は parent prefix 剥がし + uuid label 再 mapping の正しさを焦点に検証。
 */
import { describe, expect, it } from 'vitest'

import { uuidToLabel } from '@/lib/db/ltree-path'

import { buildTemplateBlueprintFromItemTree } from './build-from-items'

function makeIdFactory(prefix: string) {
  let i = 0
  return () => `${prefix}-${String(++i).padStart(8, '0')}-0000-0000-0000-000000000000`
}

const PARENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CHILD_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const GRANDCHILD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SIBLING_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const PARENT_LABEL = uuidToLabel(PARENT_ID)
const CHILD_LABEL = uuidToLabel(CHILD_ID)

describe('buildTemplateBlueprintFromItemTree', () => {
  it('descendants 空 → template だけ、items 0 件', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'My Project', description: 'desc', parentPath: '' },
      descendants: [],
      idFactory: makeIdFactory('11111111'),
    })
    expect(bp.template).toEqual({ name: 'My Project', description: 'desc' })
    expect(bp.templateItems).toEqual([])
  })

  it('直下子 1 件 → parentPath は template world の root (= 空文字)', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: CHILD_ID,
          title: 'C1',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('22222222'),
    })
    expect(bp.templateItems).toHaveLength(1)
    expect(bp.templateItems[0]!.parentPath).toBe('')
    expect(bp.templateItems[0]!.title).toBe('C1')
  })

  it('孫 (2 階層) → 直下子の new uuid label を parentPath に持つ', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: CHILD_ID,
          title: 'child',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
        {
          id: GRANDCHILD_ID,
          title: 'grand',
          description: '',
          parentPath: `${PARENT_LABEL}.${CHILD_LABEL}`,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('33333333'),
    })
    const child = bp.templateItems.find((i) => i.title === 'child')!
    const grand = bp.templateItems.find((i) => i.title === 'grand')!
    expect(child.parentPath).toBe('')
    expect(grand.parentPath).toBe(uuidToLabel(child.id))
  })

  it('parent が root 直下でない場合 (ancestor がいる) でも prefix を正しく剥がす', () => {
    const ANCESTOR_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    const ancestorLabel = uuidToLabel(ANCESTOR_ID)
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: ancestorLabel },
      descendants: [
        {
          id: CHILD_ID,
          title: 'C',
          description: '',
          parentPath: `${ancestorLabel}.${PARENT_LABEL}`,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('44444444'),
    })
    expect(bp.templateItems[0]!.parentPath).toBe('')
  })

  it('parent prefix を満たさない descendant は silently drop', () => {
    const UNRELATED_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: CHILD_ID,
          title: 'related',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
        {
          id: UNRELATED_ID,
          title: 'unrelated',
          description: '',
          parentPath: 'someotherbranch',
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('55555555'),
    })
    expect(bp.templateItems).toHaveLength(1)
    expect(bp.templateItems[0]!.title).toBe('related')
  })

  it('入力順が depth 違反 (孫が先) でも depth 昇順 sort で親が先に label map に入る', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: GRANDCHILD_ID,
          title: 'grand',
          description: '',
          parentPath: `${PARENT_LABEL}.${CHILD_LABEL}`,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
        {
          id: CHILD_ID,
          title: 'child',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('66666666'),
    })
    const child = bp.templateItems.find((i) => i.title === 'child')!
    const grand = bp.templateItems.find((i) => i.title === 'grand')!
    expect(child.parentPath).toBe('')
    expect(grand.parentPath).toBe(uuidToLabel(child.id))
  })

  it('isMust + dod / statusInitial / description は そのまま 保持', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: 'pd', parentPath: '' },
      descendants: [
        {
          id: CHILD_ID,
          title: 'M',
          description: 'cd',
          parentPath: PARENT_LABEL,
          statusInitial: 'in_progress',
          isMust: true,
          dod: 'must DoD',
        },
      ],
      idFactory: makeIdFactory('77777777'),
    })
    expect(bp.templateItems[0]).toMatchObject({
      title: 'M',
      description: 'cd',
      statusInitial: 'in_progress',
      isMust: true,
      dod: 'must DoD',
    })
  })

  it('同 depth の sibling は入力順を維持 (stable sort)', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: CHILD_ID,
          title: 'first',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
        {
          id: SIBLING_ID,
          title: 'second',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('88888888'),
    })
    expect(bp.templateItems.map((i) => i.title)).toEqual(['first', 'second'])
  })

  it('生成される template_item の id は idFactory が返す値で、毎回 unique', () => {
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: CHILD_ID,
          title: 'a',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
        {
          id: SIBLING_ID,
          title: 'b',
          description: '',
          parentPath: PARENT_LABEL,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('99999999'),
    })
    const ids = bp.templateItems.map((i) => i.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).not.toBe(CHILD_ID)
    expect(ids[1]).not.toBe(SIBLING_ID)
  })

  it('parentPath の prefix が完全一致する別 item (parent 自身ではない) を含めても正しく扱う', () => {
    // 「PARENT_LABEL を含む別 ltree」 = parentPath が `XPARENT_LABEL` (PARENT_LABEL を suffix
    // ではなく substring で含む偽陽性) は startsWith ではじかれる: PARENT_LABEL + '.' で
    // 始まる必要があるので含まれない。
    const FAKE_ID = '11111111-1111-1111-1111-111111111111'
    const bp = buildTemplateBlueprintFromItemTree({
      parent: { id: PARENT_ID, title: 'P', description: '', parentPath: '' },
      descendants: [
        {
          id: FAKE_ID,
          title: 'fake-suffix-collision',
          description: '',
          parentPath: `${PARENT_LABEL}xxx`,
          statusInitial: 'todo',
          isMust: false,
          dod: null,
        },
      ],
      idFactory: makeIdFactory('aaaaaaaa'),
    })
    expect(bp.templateItems).toEqual([])
  })
})
