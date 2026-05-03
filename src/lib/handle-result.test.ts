/**
 * iter671 chore: toastResult helper の単体テスト。test 不在解消。
 *
 * `toastResult(result, opts)` は Result<T> を toast notification に変換する標準処理。
 * onSuccess / onError callback の発火タイミング、successMsg の string vs function 形式、
 * error message の toast.error 呼び出しを mock 経由で検証。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from 'sonner'

import { toastResult } from './handle-result'
import { ok as okResult, type Result } from './result'

const toastSuccessMock = vi.mocked(toast.success)
const toastErrorMock = vi.mocked(toast.error)

beforeEach(() => {
  toastSuccessMock.mockReset()
  toastErrorMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('toastResult', () => {
  it('ok result + successMsg string → toast.success(msg)、return true', () => {
    const r = okResult(42)
    const ret = toastResult(r, { successMsg: '成功' })
    expect(toastSuccessMock).toHaveBeenCalledWith('成功')
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(ret).toBe(true)
  })

  it('ok result + successMsg function → 結果を toast.success に渡す', () => {
    const r = okResult({ id: 'item-1' })
    toastResult(r, { successMsg: (v) => `作成: ${v.id}` })
    expect(toastSuccessMock).toHaveBeenCalledWith('作成: item-1')
  })

  it('ok result + successMsg 未指定 → toast 呼び出しなし、return true', () => {
    const r = okResult(99)
    const ret = toastResult(r, {})
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(ret).toBe(true)
  })

  it('ok result + onSuccess callback が呼ばれる', () => {
    const r = okResult(42)
    const onSuccess = vi.fn()
    toastResult(r, { onSuccess })
    expect(onSuccess).toHaveBeenCalledWith(42)
  })

  it('err result → toast.error(message)、return false', () => {
    const error = { code: 'CONFLICT' as const, message: '楽観ロック衝突', name: 'ConflictError' }
    const r: Result<number> = { ok: false, error: error as never }
    const ret = toastResult(r, {})
    expect(toastErrorMock).toHaveBeenCalledWith('楽観ロック衝突')
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(ret).toBe(false)
  })

  it('err result + onError callback が呼ばれる', () => {
    const error = { code: 'NOT_FOUND' as const, message: 'not found', name: 'NotFoundError' }
    const r: Result<number> = { ok: false, error: error as never }
    const onError = vi.fn()
    toastResult(r, { onError })
    expect(onError).toHaveBeenCalledWith(error)
  })
})
