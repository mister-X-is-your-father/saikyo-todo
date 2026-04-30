/**
 * Server Action 共通ラッパ。Service から throw された `AppError` を `err(e)` に変換し、
 * success 時には必要に応じて revalidatePath する。各 feature の `actions.ts` で
 * 重複していた `wrap` 関数をここに集約。
 *
 * 2026-04-30: 想定外の raw Error / DB error / Postgres error 等は **必ず**
 * `ExternalServiceError` (= AppError) に変換して返す。旧仕様は `throw e` で
 * raw Error を Server Action 越しに漏らしていたが、Next.js 16 の RSC payload
 * 直列化で「Only plain objects can be passed to Client Components from Server
 * Components. Error objects are not supported.」 警告が出る + UI が generic
 * error toast に倒れる問題が起きていた (子タスク並べ替え時の collision rebalance
 * 等で再現)。
 */
import { revalidatePath } from 'next/cache'

import 'server-only'

import { ExternalServiceError, isAppError } from './errors'
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
    // raw Error / Postgres error / 不明 throw は ExternalServiceError に包んで
    // plain object 化 (toJSON 持ち)。Server Action 越しの直列化が必ず通る。
    // Server-side log には元 error も残す (debug 容易化)。
    const message = e instanceof Error ? e.message : String(e)
    console.error('[actionWrap] unexpected throw, wrapping as ExternalServiceError:', e)
    return err(new ExternalServiceError(`server-action: ${message}`, e))
  }
}
