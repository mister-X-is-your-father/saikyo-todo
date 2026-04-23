import { customType } from 'drizzle-orm/pg-core'

/**
 * PostgreSQL `ltree` 型 (LTREE 拡張)。
 * - ストレージ: ドット区切りの文字列 (例: `1.2.5.10`)
 * - 子孫 / 祖先 / 兄弟検索は `<@`, `@>`, `~`, `?` 演算子を生 SQL で使う
 * - 詳細は `lib/db/ltree.ts` のヘルパを参照
 */
export const ltree = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'ltree'
  },
})

/**
 * PostgreSQL `vector(N)` 型 (pgvector 拡張)。
 * MVP は multilingual-e5-small の 384 次元を採用。
 * GPU 入手後に large (1024 次元) へ切り替える際は新カラム `embedding_v2` を追加して並走。
 */
export const vector = (dim: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dim})`
    },
    toDriver(value: number[]) {
      return `[${value.join(',')}]`
    },
    fromDriver(value: string) {
      // Postgres 返却フォーマット例: "[0.1,0.2,...]"
      return value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(Number)
    },
  })
