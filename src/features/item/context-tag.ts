/**
 * iter (queue GT-2 substrate): GTD context tag (@home / @office 等) の判定 + 抽出 pure 関数。
 *
 * GTD の中核 concept 「Context tag」 — 場所 / 環境別に絞り込んで実行する軸。
 * `tags.kind = 'context'` で DB 軸を分けるが、ユーザは tag 名で `@` prefix で慣習的に
 * 入力するパターンが多いので、prefix 検出 → kind 推定の bridge helper を提供。
 *
 * 詳細: docs/methodology-modes-plan.md §1 G-3 / FEEDBACK_QUEUE.md GT-2
 */

export type TagKind = 'normal' | 'context'

/**
 * tag 名から context tag 慣習 (`@`-prefix) を検出。
 *
 * - 先頭が ASCII `@` → context (例: '@home', '@office', '@phone')
 * - 全角 `＠` も同等扱い (日本語 IME 配慮)
 * - prefix 無し → normal
 *
 * 引数空文字 / null は normal (= 不明時は安全側)。
 */
export function inferTagKindFromName(name: string | null | undefined): TagKind {
  if (!name) return 'normal'
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'normal'
  const first = trimmed[0]
  if (first === '@' || first === '＠') return 'context'
  return 'normal'
}

/**
 * context tag 慣習に従って display label を取り出す。
 * `@home` → `home`、`@@nested` → `@nested` (1 文字 strip)、prefix 無しはそのまま。
 */
export function stripContextPrefix(name: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  const first = trimmed[0]
  if (first === '@' || first === '＠') return trimmed.slice(1)
  return trimmed
}

/**
 * tag list から context tag だけ抽出 (kind='context' で filter)。
 * GTD mode の tag-picker で「context だけ表示」 する path で使う。
 */
export interface TagLike {
  id: string
  name: string
  kind: TagKind
}

export function pickContextTags<T extends TagLike>(tags: readonly T[]): T[] {
  return tags.filter((t) => t.kind === 'context')
}

/**
 * tag を context tag 化する正規化:
 * - 既に kind='context' なら何もしない
 * - name が `@`-prefix なら kind を 'context' に推定
 * - それ以外は 'normal'
 *
 * Bulk import / migration / quick-add 後処理で使う。
 */
export function normalizeTagKind<T extends TagLike>(tag: T): T {
  if (tag.kind === 'context') return tag
  const inferred = inferTagKindFromName(tag.name)
  if (inferred === tag.kind) return tag
  return { ...tag, kind: inferred }
}
