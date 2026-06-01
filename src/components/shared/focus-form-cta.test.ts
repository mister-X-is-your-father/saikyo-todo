/**
 * iter1648: FORM_DESCRIPTORS (iter1646 で集約) の invariant test。
 *
 * FORM_DESCRIPTORS は FocusFormCta の aria-label 構築に使う 1 source of truth。
 * 後続で targetId 追加 / 修正された時、6 key 完全性 + 非空文言の invariant が
 * 落ちれば test で気付ける。型 narrow (iter1639) と組合せて、UI 規約逸脱を
 * compile + test の 2 段 guard。
 *
 * 注: focus-form-cta.tsx 本体は React component (CLAUDE.md「component test 不要」)。
 * 本 test は **データテーブル (`FORM_DESCRIPTORS`) のみ** を対象、Vitest 既定の
 * node env で OK (jsdom 不要)。
 */
import { describe, expect, it } from 'vitest'

import { type FocusFormTargetId, FORM_DESCRIPTORS } from './focus-form-cta'

const EXPECTED_TARGET_IDS: FocusFormTargetId[] = [
  'sprint-name',
  'goal-title',
  'src-name',
  'wf-name',
  'teDate',
  'tmpl-name',
]

describe('FORM_DESCRIPTORS (iter1646 — FocusFormCta 集約 source of truth)', () => {
  it('6 targetId 全てに descriptor が定義されている', () => {
    for (const id of EXPECTED_TARGET_IDS) {
      expect(FORM_DESCRIPTORS[id]).toBeDefined()
    }
    expect(Object.keys(FORM_DESCRIPTORS).sort()).toEqual([...EXPECTED_TARGET_IDS].sort())
  })

  it('各 descriptor の entityName / fieldName は非空 string', () => {
    for (const id of EXPECTED_TARGET_IDS) {
      const d = FORM_DESCRIPTORS[id]
      expect(d.entityName.length).toBeGreaterThan(0)
      expect(d.fieldName.length).toBeGreaterThan(0)
    }
  })

  it('既知 mapping は変わらない (regression guard、後続変更で偶然 wording が変わったら test が落ちる)', () => {
    expect(FORM_DESCRIPTORS['sprint-name']).toEqual({ entityName: 'Sprint', fieldName: '名前' })
    expect(FORM_DESCRIPTORS['goal-title']).toEqual({ entityName: 'Goal', fieldName: 'Objective' })
    expect(FORM_DESCRIPTORS['src-name']).toEqual({ entityName: 'Source', fieldName: '名前' })
    expect(FORM_DESCRIPTORS['wf-name']).toEqual({ entityName: 'Workflow', fieldName: '名前' })
    expect(FORM_DESCRIPTORS['teDate']).toEqual({ entityName: '稼働記録', fieldName: '勤務日' })
    expect(FORM_DESCRIPTORS['tmpl-name']).toEqual({ entityName: 'Template', fieldName: '名前' })
  })
})
