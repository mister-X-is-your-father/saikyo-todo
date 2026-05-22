/**
 * iter1108 basics: `handle-result.ts` の `toastResult` unit test を追加。
 *
 * Client Component から Server Action を呼んだ後の標準 Result→toast 変換 helper。
 * ok branch: successMsg / onSuccess callback、err branch: toast.error + onError
 * callback。boolean 戻り値 (= ok だったか) で呼び出し側の続行判定に使う invariant。
 * sonner toast は vi.mock で stub。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock sonner before any module that imports it
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from 'sonner'

import { AppError } from './errors'
import { toastResult } from './handle-result'
import { err, ok } from './result'

describe('toastResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ok の場合 true を返し、successMsg を toast.success に渡す', () => {
    const result = toastResult(ok(42), { successMsg: '保存しました' })
    expect(result).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('保存しました')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('successMsg が function なら value を渡して computed message を toast', () => {
    toastResult(ok({ name: 'Foo' }), {
      successMsg: (v: { name: string }) => `${v.name} を作成`,
    })
    expect(toast.success).toHaveBeenCalledWith('Foo を作成')
  })

  it('successMsg が undefined なら toast.success を呼ばない (silent ok)', () => {
    toastResult(ok(1))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('ok の場合 onSuccess callback を value 付きで呼ぶ', () => {
    const onSuccess = vi.fn()
    toastResult(ok({ id: 'x' }), { onSuccess })
    expect(onSuccess).toHaveBeenCalledWith({ id: 'x' })
  })

  it('err の場合 false を返し、error.message を toast.error に渡す', () => {
    const e = new AppError('CUSTOM', '失敗しました')
    const result = toastResult(err(e))
    expect(result).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('失敗しました')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('err の場合 onError callback を error 付きで呼ぶ', () => {
    const onError = vi.fn()
    const e = new AppError('CUSTOM', 'bad')
    toastResult(err(e), { onError })
    expect(onError).toHaveBeenCalled()
    const firstCall = onError.mock.calls[0]
    expect(firstCall?.[0]?.code).toBe('CUSTOM')
  })

  it('onSuccess / onError は同時には呼ばれない (Result の排他性)', () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    toastResult(ok(1), { onSuccess, onError })
    expect(onSuccess).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
