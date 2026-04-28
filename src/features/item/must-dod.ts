/**
 * MUST + DoD 不変条件 (Definition of Done) の判定 helper。
 *
 * iter255 refactor で抽出: service.ts に同等条件式が 3 箇所 / schema.ts に 1 箇所
 * 散らばっており、コピペ修正で drift するリスクがあった。本 helper に集約して
 * 「MUST item は dod 必須」の invariant を 1 か所で定義する。
 *
 * 仕様:
 *   - `isMust=false` なら常に false (DoD 任意)
 *   - `isMust=true` かつ dod が `null` / `undefined` / 空文字 / 空白のみ → true
 *   - `isMust=true` かつ dod が trim 後 1 文字以上の文字列 → false
 *
 * service 側の使い方:
 *   - `update` 時 : 更新後行が違反していないか (現在状態の invariant)
 *   - `updateStatus` 時: `newType === 'done'` への遷移と組み合わせ
 *   - `bulkUpdateStatus` 時: 同上 (loop 内 1 件ずつ)
 *
 * schema 側 (`CreateItemInputSchema.superRefine`) でも同じ判定を使えるが、
 * zod の v は input 由来 (server から来る前) なので fields の型が微妙に違う。
 * structural typing で吸収できる範囲のみ helper に通す。
 */
export interface MustDodFields {
  isMust: boolean
  dod?: string | null
}

/**
 * MUST 条件で DoD が満たされていない場合 true。
 *
 * `null` / `undefined` / 空文字 / 全 whitespace を「未設定」として扱う。
 */
export function violatesMustDodInvariant(item: MustDodFields): boolean {
  if (!item.isMust) return false
  return item.dod === null || item.dod === undefined || item.dod.trim() === ''
}
