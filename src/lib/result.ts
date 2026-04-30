import type { AppError } from './errors'

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

/**
 * err: AppError instance を渡すと **plain object に自動正規化** する。
 *
 * Next.js 16 の RSC serializer は Error subclass instance の boundary 越しを拒否し
 * ("Only plain objects can be passed to Client Components from Server Components.
 * Error objects are not supported.") UI が crash する。AppError は Error を extends
 * しているため対象。toJSON() で `{code, message, name, cause?}` の plain object に
 * 変換すれば serialization が通る。client 側 `unwrap` (`result-unwrap.ts`) は plain
 * object を AppError に再構築する経路があるため互換性問題なし。
 *
 * service test で `expect(r.error).toBeInstanceOf(ConflictError)` 系は
 * `.code === 'CONFLICT'` 等の値ベース検査に切り替える必要がある。
 */
export const err = <E>(error: E): Result<never, E> => {
  if (
    error !== null &&
    typeof error === 'object' &&
    'toJSON' in error &&
    typeof (error as { toJSON?: unknown }).toJSON === 'function'
  ) {
    return { ok: false, error: (error as { toJSON: () => unknown }).toJSON() as E }
  }
  return { ok: false, error }
}

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok

/** Throw を Result に変換する小ヘルパ。Repository ↔ Service の境界で時々使う。 */
export async function tryAsync<T, E = AppError>(
  fn: () => Promise<T>,
  toError: (e: unknown) => E,
): Promise<Result<T, E>> {
  try {
    return ok(await fn())
  } catch (e) {
    return err(toError(e))
  }
}
