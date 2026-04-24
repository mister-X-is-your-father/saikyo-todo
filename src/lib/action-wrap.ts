/**
 * Server Action 共通ラッパ。Service から throw された `AppError` を `err(e)` に変換し、
 * success 時には必要に応じて revalidatePath する。各 feature の `actions.ts` で
 * 重複していた `wrap` 関数をここに集約。
 */
import { revalidatePath } from 'next/cache'

import 'server-only'

import { isAppError } from './errors'
import { err, type Result } from './result'

export async function actionWrap<T>(
  fn: () => Promise<Result<T>>,
  revalidate?: string,
): Promise<Result<T>> {
  try {
    const result = await fn()
    if (result.ok && revalidate) revalidatePath(revalidate, 'layout')
    return result
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
