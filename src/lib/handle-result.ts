/**
 * Result → トースト変換。Client Component から Server Action を呼んだ後の標準処理。
 *
 * 使い方:
 *   const result = await createItemAction(input)
 *   toastResult(result, { onSuccess: () => router.refresh(), successMsg: '作成しました' })
 */
import { toast } from 'sonner'

import type { AppError } from './errors'
import type { Result } from './result'

export interface ToastResultOptions<T> {
  successMsg?: string | ((value: T) => string)
  onSuccess?: (value: T) => void | Promise<void>
  onError?: (error: AppError) => void
}

export function toastResult<T>(result: Result<T>, opts: ToastResultOptions<T> = {}): boolean {
  if (result.ok) {
    if (opts.successMsg) {
      const msg =
        typeof opts.successMsg === 'function' ? opts.successMsg(result.value) : opts.successMsg
      toast.success(msg)
    }
    void opts.onSuccess?.(result.value)
    return true
  }
  toast.error(result.error.message)
  opts.onError?.(result.error)
  return false
}
