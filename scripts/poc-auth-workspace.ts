/**
 * Day 3 PoC: 実 Supabase Auth + profile trigger + create_workspace RPC + RLS の通し検証。
 * 実行: `pnpm tsx scripts/poc-auth-workspace.ts`
 */
import 'dotenv/config'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SERVICE_KEY || !ANON_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY が必要')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const email = `test-${Date.now()}@example.com`
  const password = 'password1234'
  const displayName = '太郎テスト'

  console.log(`[1] サインアップ: ${email}`)
  const { data: signupData, error: signupErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (signupErr) throw signupErr
  const userId = signupData.user.id
  console.log(`    user.id = ${userId}`)

  console.log('[2] profile trigger が発火したか確認')
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, display_name, locale, timezone')
    .eq('id', userId)
    .single()
  if (profErr) throw profErr
  console.log(`    profile = ${JSON.stringify(profile)}`)
  if (profile.display_name !== displayName) {
    throw new Error(`display_name mismatch: ${profile.display_name}`)
  }

  console.log('[3] ユーザとしてログイン → user JWT を取得')
  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: signinData, error: signinErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signinErr) throw signinErr
  console.log(`    access_token: ${signinData.session?.access_token.slice(0, 32)}...`)

  console.log('[4] create_workspace RPC を呼ぶ (user JWT 経由)')
  const slug = `test-ws-${Date.now()}`
  const { data: wsId, error: rpcErr } = await userClient.rpc('create_workspace', {
    ws_name: 'テスト Workspace',
    ws_slug: slug,
  })
  if (rpcErr) throw rpcErr
  console.log(`    workspace.id = ${wsId}`)

  console.log('[5] RLS 経由で自分の workspace が見えるか')
  const { data: myWs, error: selErr } = await userClient
    .from('workspaces')
    .select('id, name, slug, owner_id')
    .eq('id', wsId)
    .single()
  if (selErr) throw selErr
  console.log(`    my workspace = ${JSON.stringify(myWs)}`)

  console.log('[6] 別ユーザの workspace が "見えない" こと')
  const { data: foreign } = await admin
    .from('workspaces')
    .insert({
      name: '他人の Workspace',
      slug: `foreign-${Date.now()}`,
      owner_id: userId, // 一旦 owner だけ自分にして…
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select()
    .single()
  // 別ユーザを作って owner を差し替え
  const { data: otherUser } = await admin.auth.admin.createUser({
    email: `other-${Date.now()}@example.com`,
    password: 'password1234',
    email_confirm: true,
  })
  await admin.from('workspaces').update({ owner_id: otherUser.user!.id }).eq('id', foreign!.id)
  await admin
    .from('workspace_members')
    .insert({ workspace_id: foreign!.id, user_id: otherUser.user!.id, role: 'owner' })

  const { data: shouldBeEmpty } = await userClient
    .from('workspaces')
    .select('id')
    .eq('id', foreign!.id)
  console.log(`    cross-workspace 漏洩チェック: 件数=${shouldBeEmpty?.length ?? 0} (期待: 0)`)
  if ((shouldBeEmpty?.length ?? 0) !== 0) {
    throw new Error('RLS 漏洩! 他人の workspace が見えてる')
  }

  console.log('[7] workspace_members / workspace_settings / workspace_statuses 確認')
  const { data: members } = await userClient
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', wsId)
  console.log(`    members = ${JSON.stringify(members)}`)
  const { data: settings } = await userClient
    .from('workspace_settings')
    .select('timezone, standup_cron, wip_limit_must')
    .eq('workspace_id', wsId)
    .single()
  console.log(`    settings = ${JSON.stringify(settings)}`)
  const { data: statuses } = await userClient
    .from('workspace_statuses')
    .select('key, label, color, type')
    .eq('workspace_id', wsId)
  console.log(`    statuses = ${JSON.stringify(statuses)}`)
  if (!statuses || statuses.length !== 3) throw new Error('default statuses が 3 件でない')

  console.log('[8] audit_log 記録確認')
  const { data: audits } = await admin
    .from('audit_log')
    .select('action, target_type, after')
    .eq('workspace_id', wsId)
  console.log(`    audit = ${JSON.stringify(audits)}`)

  // クリーンアップ
  await admin.auth.admin.deleteUser(userId)
  await admin.auth.admin.deleteUser(otherUser.user!.id)

  console.log('\nAll PoC checks PASSED. 🎉')
}

main().catch((e) => {
  console.error('PoC FAILED:', e)
  process.exit(1)
})
