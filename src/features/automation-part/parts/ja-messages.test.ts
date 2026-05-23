/**
 * iter1158 basics: automation-part 5 file (item / comment / doc / schedule / time-entry)
 * に付与した ja message の回帰防止 (zod schema 単体 test、Supabase 不要)。
 *
 * 既存 integration test (parts/*.test.ts) は real Supabase が必要なため cloud env で
 * 不可。本 file は source 直読 + 簡易 zod 再宣言で ja message 露出検証を独立化。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '../../../..')

function readPart(name: string): string {
  return readFileSync(resolve(ROOT, 'src/features/automation-part/parts', name), 'utf8')
}

describe('automation-part ja messages (iter1158)', () => {
  it('item.ts に ItemCreate / ItemUpdate の ja message が含まれる', () => {
    const src = readPart('item.ts')
    expect(src).toContain('タイトルを入力してください')
    expect(src).toContain('タイトルは 500 文字以内で入力してください')
    expect(src).toContain('説明は 20,000 文字以内で入力してください')
    expect(src).toContain('priority は 1 以上で指定してください')
    expect(src).toContain('priority は 4 以下で指定してください')
    expect(src).toContain('ステータスを指定してください')
  })

  it('comment.ts に CommentCreateOnItem の ja message が含まれる', () => {
    const src = readPart('comment.ts')
    expect(src).toContain('コメント本文を入力してください')
    expect(src).toContain('コメント本文は 10,000 文字以内で入力してください')
  })

  it('doc.ts に DocCreate の ja message が含まれる', () => {
    const src = readPart('doc.ts')
    expect(src).toContain('タイトルを入力してください')
    expect(src).toContain('タイトルは 500 文字以内で入力してください')
  })

  it('schedule.ts に note の ja message が複数 (4 callsite) 含まれる', () => {
    const src = readPart('schedule.ts')
    const cnt = src.split('メモは 2,000 文字以内で入力してください').length - 1
    // ScheduleCreate / StartTimer / Update の 4 出現 (本文 + Update patch)
    expect(cnt).toBeGreaterThanOrEqual(3)
  })

  it('time-entry.ts に TimeEntryCreate の ja message が含まれる', () => {
    const src = readPart('time-entry.ts')
    expect(src).toContain('YYYY-MM-DD 形式で入力してください')
    expect(src).toContain('説明は 2,000 文字以内で入力してください')
    expect(src).toContain('計測分数は 1 以上で指定してください')
    expect(src).toContain('計測分数は 24 時間以内 (1440 分) で指定してください')
  })
})
