/**
 * Day 0.2 PoC: Drizzle 接続 + ltree / vector / pg_trgm / pg_cron 動作確認
 * 実行: `pnpm tsx scripts/poc-db.ts`
 */
import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { db } from '../src/lib/db/client'

async function main() {
  // 1. Drizzle 接続テスト
  const ping = await db.execute(sql`select 1 as ok`)
  console.log('[PING]', ping)

  // 2. 拡張一覧
  const extensions = await db.execute(sql`
    select extname, extversion
    from pg_extension
    where extname in ('ltree', 'vector', 'pg_trgm', 'pg_cron')
    order by extname
  `)
  console.log('[EXTENSIONS]', extensions)

  // 3. LTREE: ツリー検索の動作確認
  await db.execute(sql`drop table if exists poc_ltree`)
  await db.execute(sql`create temp table poc_ltree (id int, path ltree)`)
  await db.execute(sql`
    insert into poc_ltree values
      (1, '1'),
      (2, '1.2'),
      (3, '1.2.5'),
      (4, '1.3')
  `)
  const descendants = await db.execute(sql`
    select id, path::text from poc_ltree where path <@ '1.2'::ltree order by id
  `)
  console.log('[LTREE descendants of 1.2]', descendants)

  // 4. pgvector: cosine similarity の動作確認
  await db.execute(sql`drop table if exists poc_vec`)
  await db.execute(sql`create temp table poc_vec (id int, embedding vector(3))`)
  await db.execute(sql`
    insert into poc_vec values (1, '[1,0,0]'), (2, '[0.9,0.1,0]'), (3, '[0,1,0]')
  `)
  const nearest = await db.execute(sql`
    select id, 1 - (embedding <=> '[1,0,0]'::vector) as similarity
    from poc_vec
    order by embedding <=> '[1,0,0]'::vector
    limit 3
  `)
  console.log('[VECTOR nearest to [1,0,0]]', nearest)

  // 5. pg_trgm: 類似度
  const trgm = await db.execute(sql`
    select 'タスク管理' <-> 'タスク' as distance,
           similarity('タスク管理', 'タスク') as sim
  `)
  console.log('[PG_TRGM]', trgm)

  // 6. pg_cron: 利用可能か
  const cron = await db.execute(sql`select count(*) as n from cron.job`)
  console.log('[PG_CRON job table accessible]', cron)

  await db.$client.end()
  console.log('\nAll checks passed.')
}

main().catch((e) => {
  console.error('PoC failed:', e)
  process.exit(1)
})
