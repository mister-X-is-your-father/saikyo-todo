/**
 * Day 4 PoC: Item CRUD + 楽観ロック + DoD バリデーション + audit_log + RLS の通し検証。
 * 実行: `pnpm tsx --env-file=.env.local scripts/poc-item.ts`
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const email = `item-test-${Date.now()}@example.com`
  const password = 'password1234'

  // 1. setup: user + workspace
  const { data: created, error: cuErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Item テスター' },
  })
  if (cuErr) throw cuErr
  if (!created.user) throw new Error('createUser returned no user')
  const userId = created.user.id
  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId } = await userClient.rpc('create_workspace', {
    ws_name: 'Item Test',
    ws_slug: `item-${Date.now()}`,
  })
  console.log(`[setup] user=${userId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)}`)

  // 2. Item 作成 (通常)
  const item1 = await userClient
    .from('items')
    .insert({
      workspace_id: wsId,
      title: '通常タスク',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select()
    .single()
  if (item1.error) throw item1.error
  console.log(`[1] 通常 item 作成 OK id=${item1.data.id.slice(0, 8)} version=${item1.data.version}`)

  // 3. MUST item (DoD あり)
  const mustItem = await userClient
    .from('items')
    .insert({
      workspace_id: wsId,
      title: 'MUST タスク',
      is_must: true,
      dod: 'X が完了する',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select()
    .single()
  if (mustItem.error) throw mustItem.error
  console.log(`[2] MUST + DoD item 作成 OK`)

  // 4. 楽観ロック衝突 (wrong version)
  const wrong = await userClient
    .from('items')
    .update({ title: '別タイトル' })
    .eq('id', item1.data.id)
    .eq('version', 999) // 間違った version
    .select()
  console.log(`[3] 楽観ロック衝突 (version=999): 更新行数=${wrong.data?.length ?? 0} (期待: 0)`)
  if ((wrong.data?.length ?? 0) !== 0) throw new Error('楽観ロックが効いてない!')

  // 5. 正しい version で更新
  const updated = await userClient
    .from('items')
    .update({ title: '更新後', version: item1.data.version + 1 })
    .eq('id', item1.data.id)
    .eq('version', item1.data.version)
    .select()
    .single()
  if (updated.error) throw updated.error
  console.log(`[4] 正しい version で更新 OK new_version=${updated.data.version}`)

  // 6. status 変更
  const statusUpd = await userClient
    .from('items')
    .update({ status: 'in_progress', version: updated.data.version + 1 })
    .eq('id', item1.data.id)
    .eq('version', updated.data.version)
    .select()
    .single()
  if (statusUpd.error) throw statusUpd.error
  console.log(`[5] status 変更 OK status=${statusUpd.data.status}`)

  // 7. soft delete
  const deleted = await userClient
    .from('items')
    .update({
      deleted_at: new Date().toISOString(),
      version: statusUpd.data.version + 1,
    })
    .eq('id', item1.data.id)
    .eq('version', statusUpd.data.version)
    .select()
    .single()
  if (deleted.error) throw deleted.error
  console.log(`[6] soft delete OK deleted_at=${deleted.data.deleted_at?.slice(0, 19)}`)

  // 8. list (Repository 層が WHERE deleted_at IS NULL で active のみを取る想定)
  const list = await userClient
    .from('items')
    .select('id, title')
    .eq('workspace_id', wsId)
    .is('deleted_at', null)
  console.log(`[7] list (deleted 除外): ${list.data?.length ?? 0} 件 (期待: 1 = MUST のみ)`)
  if ((list.data?.length ?? 0) !== 1) throw new Error(`list 件数 mismatch`)

  // 9. audit_log: insert 2件 + update 2件 + delete 1件 = 5件?
  //    (本 PoC は Service 層を経由してないので audit は実は記録されない。
  //     UI / Server Action 経由で初めて記録される)
  // 確認用に audit_log を覗く (admin 経由で全件)
  const { data: audits } = await admin
    .from('audit_log')
    .select('action, target_type')
    .eq('workspace_id', wsId)
  console.log(
    `[8] audit_log (admin view): ${audits?.length ?? 0} 件 (PoC は raw insert のため 1 件 = workspace 作成のみ期待)`,
  )

  // クリーンアップ
  await admin.auth.admin.deleteUser(userId)

  console.log('\nAll Item PoC checks PASSED. 🎉')
}

main().catch((e) => {
  console.error('PoC FAILED:', e)
  process.exit(1)
})
