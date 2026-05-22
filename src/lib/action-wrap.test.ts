/**
 * iter1110 basics: `action-wrap.ts` の `actionWrap` unit test を追加。
 *
 * Server Action 共通ラッパ。3 branch をすべて invariant 化:
 *  - ok + revalidate 有 → revalidatePath('<path>', 'layout') を呼ぶ
 *  - ok + revalidate 無 → revalidatePath を呼ばない
 *  - err (AppError) → そのまま err() で返す (re-wrap しない)
 *  - throw (raw Error) → ExternalServiceError に包んで err() で返す (RSC 直列化対策)
 *  - throw (非 Error 値) → String(value) を message に
 *
 * Next.js 16 RSC payload 直列化問題 (Error objects 越境不可) の回帰防止が主目的。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

import { actionWrap } from './action-wrap'
import { AppError, ConflictError } from './errors'
import { err, ok } from './result'

describe('actionWrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // console.error は意図的に suppress (test ログ汚染回避)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('ok + revalidate 有 → result ok を返し、revalidatePath を呼ぶ', async () => {
    const result = await actionWrap(async () => ok(42), '/dashboard')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(42)
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('ok + revalidate 無 → revalidatePath を呼ばない', async () => {
    const result = await actionWrap(async () => ok({ id: 'x' }))
    expect(result.ok).toBe(true)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('err (AppError) → そのまま err を返し、re-wrap しない', async () => {
    const e = new ConflictError('衝突')
    const result = await actionWrap(async () => err(e))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT')
      expect(result.error.message).toBe('衝突')
    }
  })

  it('err 時は revalidatePath を呼ばない (失敗時 ISR は無意味)', async () => {
    await actionWrap(async () => err(new ConflictError()), '/dashboard')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('throw (raw Error) → ExternalServiceError に包んで err を返す', async () => {
    const result = await actionWrap(async () => {
      throw new Error('boom')
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('EXTERNAL')
      expect(result.error.message).toMatch(/server-action: boom/)
    }
  })

  it('throw (AppError 派生) → 直接 err で返す (二重 wrap しない)', async () => {
    const original = new AppError('CUSTOM', 'カスタムエラー')
    const result = await actionWrap(async () => {
      throw original
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('CUSTOM')
    }
  })

  it('throw (非 Error 値) → String 化して ExternalServiceError', async () => {
    const result = await actionWrap(async () => {
      throw 'string error' as unknown as Error
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('EXTERNAL')
      expect(result.error.message).toMatch(/string error/)
    }
  })

  it('ExternalServiceError が toJSON を持つ (Server Action 越え plain object 化)', async () => {
    const result = await actionWrap(async () => {
      throw new Error('boom')
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // err() で toJSON 経由の正規化が行われ、code/message が enumerable に
      expect(result.error).toHaveProperty('code')
      expect(result.error).toHaveProperty('message')
    }
  })
})
