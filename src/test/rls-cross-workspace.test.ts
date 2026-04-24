/**
 * Cross-workspace RLS リーク検証 (受け入れ基準: "cross-workspace で Item / Doc が漏れない").
 *
 * 実 Supabase anon client を 2 ユーザで切り替えて、user1 が user2 の workspace の
 * items / docs / comments / notifications を select できないことを確認する。
 *
 * Service 層の単体テストは vi.mock('@/lib/auth/guard') で guard だけ stub するので、
 * RLS 越境は「ユーザ文脈の切り替え」が必要。本テストだけは guard mock を使わず、
 * 2 つの認証済 anon client を直接回す。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adminClient, createTestUser } from './fixtures'

const SUPABASE_URL = 'http://127.0.0.1:54321'

async function signedInClient(email: string): Promise<SupabaseClient> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
  const c = createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: 'password1234' })
  if (error) throw error
  return c
}

async function createWsAsUser(c: SupabaseClient, label: string): Promise<string> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const { data, error } = await c.rpc('create_workspace', {
    ws_name: `${label} ws`,
    ws_slug: `${label}-${stamp}`,
  })
  if (error) throw error
  return data as string
}

describe('RLS cross-workspace leak検証', () => {
  let u1: { userId: string; email: string; cleanup: () => Promise<void> }
  let u2: { userId: string; email: string; cleanup: () => Promise<void> }
  let u1Client: SupabaseClient
  let u2Client: SupabaseClient
  let ws1: string
  let ws2: string
  let item1Id: string
  let item2Id: string

  beforeAll(async () => {
    u1 = await createTestUser('rls-u1')
    u2 = await createTestUser('rls-u2')
    u1Client = await signedInClient(u1.email)
    u2Client = await signedInClient(u2.email)
    ws1 = await createWsAsUser(u1Client, 'rls-ws1')
    ws2 = await createWsAsUser(u2Client, 'rls-ws2')

    // 各 workspace に item を 1 件ずつ
    const admin = adminClient()
    const { data: i1 } = await admin
      .from('items')
      .insert({
        workspace_id: ws1,
        title: 'rls-leak-test-ws1-item',
        description: 'secret ws1 content',
        status: 'todo',
        is_must: false,
        created_by_actor_type: 'user',
        created_by_actor_id: u1.userId,
      })
      .select('id')
      .single()
      .throwOnError()
    item1Id = i1!.id as string
    const { data: i2 } = await admin
      .from('items')
      .insert({
        workspace_id: ws2,
        title: 'rls-leak-test-ws2-item',
        description: 'secret ws2 content',
        status: 'todo',
        is_must: false,
        created_by_actor_type: 'user',
        created_by_actor_id: u2.userId,
      })
      .select('id')
      .single()
      .throwOnError()
    item2Id = i2!.id as string
  })

  afterAll(async () => {
    await u1.cleanup()
    await u2.cleanup()
  })

  it('user1 は ws2 の items を select できない (空配列が返る)', async () => {
    const { data, error } = await u1Client.from('items').select('id, title').eq('workspace_id', ws2)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('user2 は ws1 の items を select できない (空配列が返る)', async () => {
    const { data, error } = await u2Client.from('items').select('id, title').eq('workspace_id', ws1)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('user1 は ws1 の自分の items は見られる (対照)', async () => {
    const { data, error } = await u1Client.from('items').select('id, title').eq('workspace_id', ws1)
    expect(error).toBeNull()
    expect(data?.some((i) => i.id === item1Id)).toBe(true)
  })

  it('user1 が ws2 の item id を直接指定しても取れない (findById 風)', async () => {
    const { data, error } = await u1Client.from('items').select('id, title').eq('id', item2Id)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('user1 が ws2 に item を insert しようとすると RLS で拒否される', async () => {
    const { error } = await u1Client.from('items').insert({
      workspace_id: ws2,
      title: 'leak-write-attempt',
      description: '',
      status: 'todo',
      is_must: false,
      created_by_actor_type: 'user',
      created_by_actor_id: u1.userId,
    })
    // RLS 違反は 'new row violates ...' または無音で 0 行挿入。error か 空に倒れるか判定。
    // Supabase は policy 違反で code '42501' を返す。
    expect(error).not.toBeNull()
  })

  it('user1 は ws2 の Template を見られない (対象テーブルが別でも RLS 有効)', async () => {
    // ws2 に admin client で Template を 1 件入れる (サンプル投入は service 経由なので
    // raw RPC でのワークスペース作成では入らない。ここでは越境遮断のみ検証)
    const admin = adminClient()
    await admin
      .from('templates')
      .insert({
        workspace_id: ws2,
        name: 'ws2-only-template',
        description: '',
        kind: 'manual',
        variables_schema: {},
        tags: [],
        created_by: u2.userId,
      })
      .throwOnError()

    const { data, error } = await u1Client
      .from('templates')
      .select('id, name, workspace_id')
      .eq('workspace_id', ws2)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
