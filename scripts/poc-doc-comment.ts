/**
 * Day 5 PoC: Doc + Comment CRUD + 楽観ロック + soft delete + RLS の通し検証。
 * 実行: `pnpm tsx --env-file=.env.local scripts/poc-doc-comment.ts`
 *
 * Service 層は cookie ベースの auth を前提にしているのでここでは通さない。
 * Supabase client 経由で RLS だけを実証する (poc-item.ts と同じ流儀)。
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const stamp = Date.now()

  // --- Setup: alice (ws メンバー) + bob (別 ws)。RLS 漏洩を検証するため 2 ユーザ。
  const aliceEmail = `doc-alice-${stamp}@example.com`
  const bobEmail = `doc-bob-${stamp}@example.com`
  const password = 'password1234'

  const { data: aliceCreated, error: aErr } = await admin.auth.admin.createUser({
    email: aliceEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Alice' },
  })
  if (aErr || !aliceCreated.user) throw aErr ?? new Error('alice create failed')
  const aliceId = aliceCreated.user.id

  const { data: bobCreated, error: bErr } = await admin.auth.admin.createUser({
    email: bobEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Bob' },
  })
  if (bErr || !bobCreated.user) throw bErr ?? new Error('bob create failed')
  const bobId = bobCreated.user.id

  const aliceClient = createClient(SUPABASE_URL, ANON_KEY)
  await aliceClient.auth.signInWithPassword({ email: aliceEmail, password })
  const { data: wsId } = await aliceClient.rpc('create_workspace', {
    ws_name: 'Doc Test',
    ws_slug: `doc-${stamp}`,
  })

  const bobClient = createClient(SUPABASE_URL, ANON_KEY)
  await bobClient.auth.signInWithPassword({ email: bobEmail, password })
  const { data: bobWsId } = await bobClient.rpc('create_workspace', {
    ws_name: "Bob's WS",
    ws_slug: `bob-${stamp}`,
  })

  console.log(
    `[setup] alice=${aliceId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)} / bob=${bobId.slice(0, 8)} ws=${(bobWsId as string).slice(0, 8)}`,
  )

  // --- Doc CRUD ---

  // 1. Doc 作成
  const doc1 = await aliceClient
    .from('docs')
    .insert({
      workspace_id: wsId,
      title: 'メモ1',
      body: '本文',
      created_by_actor_type: 'user',
      created_by_actor_id: aliceId,
    })
    .select()
    .single()
  if (doc1.error) throw doc1.error
  console.log(`[1] Doc 作成 OK id=${doc1.data.id.slice(0, 8)} version=${doc1.data.version}`)

  // 2. 楽観ロック衝突 (wrong version)
  const wrongDoc = await aliceClient
    .from('docs')
    .update({ title: '書き換え' })
    .eq('id', doc1.data.id)
    .eq('version', 999)
    .select()
  console.log(`[2] Doc 楽観ロック衝突: 更新行数=${wrongDoc.data?.length ?? 0} (期待: 0)`)
  if ((wrongDoc.data?.length ?? 0) !== 0) throw new Error('楽観ロックが効いてない')

  // 3. 正しい version で更新
  const docUpd = await aliceClient
    .from('docs')
    .update({ title: '更新後', version: doc1.data.version + 1 })
    .eq('id', doc1.data.id)
    .eq('version', doc1.data.version)
    .select()
    .single()
  if (docUpd.error) throw docUpd.error
  console.log(`[3] Doc 正常更新 OK new_version=${docUpd.data.version}`)

  // --- Comment on Item ---

  // まず Item を作っておく
  const item1 = await aliceClient
    .from('items')
    .insert({
      workspace_id: wsId,
      title: 'コメント付けるタスク',
      created_by_actor_type: 'user',
      created_by_actor_id: aliceId,
    })
    .select()
    .single()
  if (item1.error) throw item1.error

  // 4. item にコメント
  const c1 = await aliceClient
    .from('comments_on_items')
    .insert({
      item_id: item1.data.id,
      body: 'よろしく',
      author_actor_type: 'user',
      author_actor_id: aliceId,
    })
    .select()
    .single()
  if (c1.error) throw c1.error
  console.log(`[4] Comment on Item 作成 OK id=${c1.data.id.slice(0, 8)}`)

  // 5. コメント soft delete
  const c1Del = await aliceClient
    .from('comments_on_items')
    .update({
      deleted_at: new Date().toISOString(),
      version: c1.data.version + 1,
    })
    .eq('id', c1.data.id)
    .eq('version', c1.data.version)
    .select()
    .single()
  if (c1Del.error) throw c1Del.error
  console.log(`[5] Comment on Item soft delete OK`)

  // --- Comment on Doc ---

  // 6. doc にコメント
  const c2 = await aliceClient
    .from('comments_on_docs')
    .insert({
      doc_id: doc1.data.id,
      body: 'Doc にもコメント',
      author_actor_type: 'user',
      author_actor_id: aliceId,
    })
    .select()
    .single()
  if (c2.error) throw c2.error
  console.log(`[6] Comment on Doc 作成 OK id=${c2.data.id.slice(0, 8)}`)

  // --- RLS 漏洩テスト: Bob は Alice の doc / item / コメントを一切見えない ---

  // 7. Bob から doc 見ようとする → 0 件
  const bobDocs = await bobClient.from('docs').select('id').eq('workspace_id', wsId)
  console.log(
    `[7] RLS: Bob が Alice の docs を見ようとする → ${bobDocs.data?.length ?? 0} 件 (期待: 0)`,
  )
  if ((bobDocs.data?.length ?? 0) !== 0) throw new Error('RLS 漏洩: bob が alice の doc 見れた')

  // 8. Bob から comments_on_items 見ようとする → 0 件
  const bobCommentsI = await bobClient
    .from('comments_on_items')
    .select('id')
    .eq('item_id', item1.data.id)
  console.log(
    `[8] RLS: Bob が Alice の item コメントを見ようとする → ${bobCommentsI.data?.length ?? 0} 件 (期待: 0)`,
  )
  if ((bobCommentsI.data?.length ?? 0) !== 0)
    throw new Error('RLS 漏洩: bob が alice の item コメント見れた')

  // 9. Bob が Alice の doc に勝手にコメント付けようとする → insert 失敗 (with check)
  const bobTryInsert = await bobClient
    .from('comments_on_docs')
    .insert({
      doc_id: doc1.data.id,
      body: '侵入',
      author_actor_type: 'user',
      author_actor_id: bobId,
    })
    .select()
  console.log(
    `[9] RLS: Bob が Alice の doc にコメント挿入試行 → error=${bobTryInsert.error ? 'YES (期待)' : 'NO (漏洩!)'}`,
  )
  if (!bobTryInsert.error) throw new Error('RLS 漏洩: bob が alice の doc に insert 成功した')

  // 10. Bob が Alice の doc を直接更新しようとする → 0 行
  const bobTryUpd = await bobClient
    .from('docs')
    .update({ title: '改竄' })
    .eq('id', doc1.data.id)
    .select()
  console.log(
    `[10] RLS: Bob が Alice の doc を更新試行 → 更新行数=${bobTryUpd.data?.length ?? 0} (期待: 0)`,
  )
  if ((bobTryUpd.data?.length ?? 0) !== 0)
    throw new Error('RLS 漏洩: bob が alice の doc 更新できた')

  // --- Doc soft delete ---

  // 11. Alice が doc を soft delete
  const docDel = await aliceClient
    .from('docs')
    .update({
      deleted_at: new Date().toISOString(),
      version: docUpd.data.version + 1,
    })
    .eq('id', doc1.data.id)
    .eq('version', docUpd.data.version)
    .select()
    .single()
  if (docDel.error) throw docDel.error
  console.log(`[11] Doc soft delete OK`)

  // 12. list (deleted 除外) — Alice も見えない
  const afterDel = await aliceClient
    .from('docs')
    .select('id')
    .eq('workspace_id', wsId)
    .is('deleted_at', null)
  console.log(`[12] Alice の active docs: ${afterDel.data?.length ?? 0} 件 (期待: 0)`)
  if ((afterDel.data?.length ?? 0) !== 0) throw new Error('soft delete 後に active で見えた')

  // cleanup
  await admin.auth.admin.deleteUser(aliceId)
  await admin.auth.admin.deleteUser(bobId)

  console.log('\nAll Doc + Comment PoC checks PASSED. 🎉')
}

main().catch((e) => {
  console.error('PoC FAILED:', e)
  process.exit(1)
})
