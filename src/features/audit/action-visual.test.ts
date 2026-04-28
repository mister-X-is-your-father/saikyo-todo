/**
 * iter298 basics: audit_log action 別 visual config の単体テスト。
 * 既知 14 action + 未知 fallback、配色 5-7 色制約を固定する。
 */
import { describe, expect, it } from 'vitest'

import { type AuditActionIconKey, getAuditActionVisual, KNOWN_AUDIT_ACTIONS } from './action-visual'

describe('getAuditActionVisual', () => {
  it('create は Plus + emerald (作成)', () => {
    const v = getAuditActionVisual('create')
    expect(v.iconKey).toBe<AuditActionIconKey>('plus')
    expect(v.label).toBe('作成')
    expect(v.bgClass).toContain('emerald')
  })

  it('update は Pencil + blue', () => {
    const v = getAuditActionVisual('update')
    expect(v.iconKey).toBe<AuditActionIconKey>('pencil')
    expect(v.label).toBe('更新')
    expect(v.bgClass).toContain('blue')
  })

  it('set_assignees / set_tags も Pencil + blue (label のみ別)', () => {
    const a = getAuditActionVisual('set_assignees')
    const t = getAuditActionVisual('set_tags')
    expect(a.iconKey).toBe('pencil')
    expect(t.iconKey).toBe('pencil')
    expect(a.label).toBe('担当者変更')
    expect(t.label).toBe('タグ変更')
  })

  it('status_change / bulk_status_change / move / reorder / archive / unarchive は ArrowRightLeft + amber', () => {
    for (const k of [
      'status_change',
      'bulk_status_change',
      'move',
      'reorder',
      'archive',
      'unarchive',
    ]) {
      const v = getAuditActionVisual(k)
      expect(v.iconKey).toBe<AuditActionIconKey>('arrow-right-left')
      expect(v.bgClass).toContain('amber')
    }
  })

  it('complete は CheckCircle + emerald', () => {
    const v = getAuditActionVisual('complete')
    expect(v.iconKey).toBe<AuditActionIconKey>('check-circle')
    expect(v.bgClass).toContain('emerald')
  })

  it('uncomplete は RotateCcw + slate', () => {
    const v = getAuditActionVisual('uncomplete')
    expect(v.iconKey).toBe<AuditActionIconKey>('rotate-ccw')
    expect(v.label).toBe('完了取消')
    expect(v.bgClass).toContain('slate')
  })

  it('delete / bulk_delete は Trash + red', () => {
    expect(getAuditActionVisual('delete').iconKey).toBe<AuditActionIconKey>('trash')
    expect(getAuditActionVisual('bulk_delete').iconKey).toBe<AuditActionIconKey>('trash')
    expect(getAuditActionVisual('delete').bgClass).toContain('red')
  })

  it('未知 action は Activity + zinc fallback', () => {
    const v = getAuditActionVisual('explode')
    expect(v.iconKey).toBe<AuditActionIconKey>('activity')
    expect(v.label).toBe('操作')
    expect(v.bgClass).toContain('zinc')
  })

  it('null / undefined / 空文字も fallback', () => {
    expect(getAuditActionVisual(null).iconKey).toBe('activity')
    expect(getAuditActionVisual(undefined).iconKey).toBe('activity')
    expect(getAuditActionVisual('').iconKey).toBe('activity')
  })

  it('既知 action は 14 種登録', () => {
    expect(KNOWN_AUDIT_ACTIONS.length).toBe(14)
  })

  it('既知 action はすべて非 zinc (= 識別可能)', () => {
    for (const k of KNOWN_AUDIT_ACTIONS) {
      const v = getAuditActionVisual(k)
      expect(v.bgClass).not.toContain('zinc')
      expect(v.textClass).not.toContain('zinc')
    }
  })

  it('既知 action の bg 配色は 5-7 色 (slate / emerald / blue / amber / red) に制約', () => {
    const allowed = ['slate', 'emerald', 'blue', 'amber', 'red']
    for (const k of KNOWN_AUDIT_ACTIONS) {
      const v = getAuditActionVisual(k)
      const matched = allowed.some((c) => v.bgClass.includes(c))
      expect(matched, `action ${k} bg ${v.bgClass} は 5-7 色制約外`).toBe(true)
    }
  })
})
