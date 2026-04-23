import type { AppError } from './errors'

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

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
