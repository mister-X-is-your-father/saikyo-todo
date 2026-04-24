/**
 * Client 側 hooks で Server Action の `Result<T>` を unwrap して TanStack Query に
 * 「throw on err」で渡すための共通ヘルパ。
 *
 * RSC / Server Action → Client hook 間で `AppError` instance は Error 系にシリアライズ
 * されるが instanceof 情報が失われることがある。そのため元 code / message は保持した
 * まま AppErrorClass を再構築して throw する。
 */
import { type AppError, AppError as AppErrorClass } from './errors'
import type { Result } from './result'

export function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.value
  if (r.error instanceof Error) throw r.error
  const e = r.error as AppError
  throw Object.assign(new AppErrorClass(e.code ?? 'UNKNOWN', e.message ?? 'Unknown error'), e)
}
