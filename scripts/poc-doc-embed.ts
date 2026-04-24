/**
 * Day 16 PoC: docService.create → pg-boss doc-embed → worker が multilingual-e5-small
 * でベクトル化して doc_chunks に UPSERT、の end-to-end 確認。
 *
 * フロー:
 *   1. admin で user+workspace を作る
 *   2. worker 相当 (handleDocEmbed) を**このプロセス内で**登録
 *   3. docs に直接 INSERT (service 層は cookies 依存なので skip)
 *   4. pg-boss に doc-embed job を enqueue
 *   5. polling で doc_chunks が入ったことを確認 → 次元数 (384) を検証
 *   6. cleanup
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/poc-doc-embed.ts
 *
 * 初回はモデルダウンロード (~120MB) で数十秒〜数分。以降キャッシュから秒〜サブ秒。
 */
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'

import { EMBEDDING_DIM } from '@/lib/ai/embedding'
import { db } from '@/lib/db/client'
import { docChunks, docs } from '@/lib/db/schema'
import { enqueueJob, registerWorker, startBoss, stopBoss } from '@/lib/jobs/queue'

import { handleDocEmbed } from '@/features/doc/worker'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function waitForChunks(
  docId: string,
  timeoutMs = 300_000, // 初回 model download 考慮で 5 分
): Promise<(typeof docChunks.$inferSelect)[]> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const rows = await db.select().from(docChunks).where(eq(docChunks.docId, docId))
    if (rows.length > 0) return rows as (typeof docChunks.$inferSelect)[]
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`timeout waiting for doc_chunks of ${docId}`)
}

async function main() {
  const stamp = Date.now()
  const email = `doc-embed-poc-${stamp}@example.com`
  const password = 'password1234'

  console.log('[1] setup: user + workspace')
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'DocEmbed PoC' },
  })
  if (created.error || !created.data.user) throw created.error
  const userId = created.data.user.id

  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId, error: wsErr } = await userClient.rpc('create_workspace', {
    ws_name: 'DocEmbed PoC',
    ws_slug: `doc-embed-poc-${stamp}`,
  })
  if (wsErr) throw wsErr
  console.log(`    user=${userId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)}`)

  console.log('[2] start pg-boss + register doc-embed worker')
  await startBoss()
  await registerWorker('doc-embed', handleDocEmbed)
  console.log('    worker=ready')

  try {
    console.log('[3] INSERT doc')
    const [doc] = await db
      .insert(docs)
      .values({
        workspaceId: wsId as string,
        title: '最強TODO のリリースノート',
        body: [
          'Week 0: 基盤構築 (Next.js + Supabase + Drizzle)',
          'Week 1: Item CRUD + LTREE + fractional indexing',
          'Week 2: Kanban / Backlog / Gantt / Dashboard / Template',
          'Week 3: Anthropic Agent 基盤 + pg-boss + embedding pipeline',
        ].join('\n'),
        createdByActorType: 'user',
        createdByActorId: userId,
      })
      .returning()
    if (!doc) throw new Error('insert doc failed')
    console.log(`    doc id=${doc.id.slice(0, 8)}`)

    console.log('[4] enqueue doc-embed job (初回は model ダウンロード発生)')
    const jobId = await enqueueJob('doc-embed', { docId: doc.id })
    console.log(`    job id=${jobId}`)

    console.log('[5] doc_chunks を待機 (max 5min)')
    const t0 = Date.now()
    const chunks = await waitForChunks(doc.id)
    console.log(`    chunks=${chunks.length} elapsed=${Date.now() - t0}ms`)

    console.log('[6] vectors を検証')
    for (const c of chunks) {
      if (!c.embedding || c.embedding.length !== EMBEDDING_DIM) {
        throw new Error(
          `chunk ${c.chunkIndex} has wrong embedding dim=${c.embedding?.length ?? 'null'} expected=${EMBEDDING_DIM}`,
        )
      }
    }
    console.log(`    全 chunk が ${EMBEDDING_DIM}次元の vector を持つ ✓`)
    console.log(`    sample chunk[0].content (80字): ${chunks[0]!.content.slice(0, 80)}`)

    console.log('\nAll checks PASSED. 🎉')
  } finally {
    await stopBoss().catch(() => {})
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('PoC failed:', e)
    process.exit(1)
  })
