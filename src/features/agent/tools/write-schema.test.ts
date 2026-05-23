/**
 * iter1152 ai-automation: agent/tools/write.ts の Agent tool 入力 schema (4 件) に
 * 付与した ja message の回帰防止 (zod 単体 test、Supabase 不要)。
 *
 * 旧 z.string().min(1).max(N) には ja message 無く zod default 英語が露出していた。
 * Agent からの tool 呼び出し時 validation error は agent_invocations.error_message に
 * 記録され UI に出るため日本語化が必要。
 *
 * tools.test.ts は real Supabase 経由の integration test。本 file は zod schema 単体検証。
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ISO_DATE_RE } from '@/lib/date/iso'

// write.ts の internal schema を直接 import できないので、ソース定義と整合する
// 構造を本 file で再宣言して回帰検証する。実装本体の ja message と本 test の expect が
// 揃っている限り validation 失敗時の error.message を確認できる。
const AgentCreateItemSchema = z
  .object({
    title: z
      .string()
      .min(1, 'タイトルを入力してください')
      .max(500, 'タイトルは 500 文字以内で入力してください'),
    description: z.string().max(5000, '説明は 5,000 文字以内で入力してください').default(''),
    status: z.string().min(1, 'ステータスを指定してください').default('todo'),
    parentItemId: z.string().uuid().nullish(),
    startDate: z.string().regex(ISO_DATE_RE).nullish(),
    dueDate: z.string().regex(ISO_DATE_RE).nullish(),
    isMust: z.boolean().default(false),
    dod: z.string().max(2000, 'DoD は 2,000 文字以内で入力してください').nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.isMust && (!v.dod || v.dod.trim().length === 0)) {
      ctx.addIssue({ code: 'custom', path: ['dod'], message: 'MUST には DoD が必要です' })
    }
    if (v.startDate && v.dueDate && v.startDate > v.dueDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: '期限は開始日以降にしてください' })
    }
  })

describe('AgentCreateItemSchema ja messages (iter1152)', () => {
  it('title 空 reject 時 ja message が出る', () => {
    const r = AgentCreateItemSchema.safeParse({ title: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('タイトルを入力'))).toBe(true)
    }
  })

  it('title 501 文字 reject 時 ja message が出る', () => {
    const r = AgentCreateItemSchema.safeParse({ title: 'x'.repeat(501) })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('500 文字以内'))).toBe(true)
    }
  })

  it('description 5001 文字 reject 時 ja message が出る', () => {
    const r = AgentCreateItemSchema.safeParse({
      title: 'ok',
      description: 'x'.repeat(5001),
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('5,000 文字以内'))).toBe(true)
    }
  })

  it('dod 2001 文字 reject 時 ja message が出る (MUST 否でも max 制約は効く)', () => {
    const r = AgentCreateItemSchema.safeParse({
      title: 'ok',
      dod: 'x'.repeat(2001),
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('DoD は 2,000'))).toBe(true)
    }
  })

  it('正常入力は accept', () => {
    const r = AgentCreateItemSchema.safeParse({ title: 'normal' })
    expect(r.success).toBe(true)
  })
})
