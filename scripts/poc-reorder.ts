/**
 * Day 6b PoC: items.position (text / fractional-indexing) の並び替え検証。
 *
 * - 初期: [A, B, C] (position = 'a0', 'a1', 'a2')
 * - B を C の後ろに移動 → [A, C, B]
 * - A を C と B の間に → [C, A, B]
 * - 別親の item を sibling 指定 → ValidationError
 * - 自分自身を sibling 指定 → ValidationError
 *
 * 注: Service 層は cookie 前提なので generateKeyBetween + 直接 UPDATE で
 *     DB 挙動のみ検証。Service のバリデーション分岐は Vitest で別途。
 *
 * 実行: `pnpm tsx --env-file=.env.local scripts/poc-reorder.ts`
 */
import { createClient } from '@supabase/supabase-js'
import { generateKeyBetween } from 'fractional-indexing'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function assertEq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`[${label}] expected=${e} actual=${a}`)
}

async function main() {
  const stamp = Date.now()
  const email = `reorder-test-${stamp}@example.com`
  const password = 'password1234'
  const { data: created, error: cuErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Reorder tester' },
  })
  if (cuErr || !created.user) throw cuErr ?? new Error('createUser failed')
  const userId = created.user.id
  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId } = await userClient.rpc('create_workspace', {
    ws_name: 'Reorder Test',
    ws_slug: `reorder-${stamp}`,
  })
  console.log(`[setup] user=${userId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)}`)

  // 初期 items: A, B, C を position a0, a1, a2 で挿入
  const ids = { A: randomUUID(), B: randomUUID(), C: randomUUID() }
  const mkItem = async (id: string, title: string, position: string) => {
    const { error } = await admin.from('items').insert({
      id,
      workspace_id: wsId,
      title,
      position,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (error) throw error
  }
  await mkItem(ids.A, 'A', 'a0')
  await mkItem(ids.B, 'B', 'a1')
  await mkItem(ids.C, 'C', 'a2')

  // 1. 初期並び検証 (position asc で A, B, C)
  const r1 = await admin
    .from('items')
    .select('id, title, position')
    .eq('workspace_id', wsId)
    .order('position', { ascending: true })
  assertEq(
    r1.data?.map((x) => x.title),
    ['A', 'B', 'C'],
    'initial order',
  )
  console.log(`[1] 初期順序 [A, B, C] ✓`)

  // 2. B を C の後ろに: prev='a2' (C), next=null
  const newPosB = generateKeyBetween('a2', null) // => 'a3' 相当
  await admin.from('items').update({ position: newPosB }).eq('id', ids.B)
  const r2 = await admin
    .from('items')
    .select('title')
    .eq('workspace_id', wsId)
    .order('position', { ascending: true })
  assertEq(
    r2.data?.map((x) => x.title),
    ['A', 'C', 'B'],
    'B moved after C',
  )
  console.log(`[2] B を末尾へ → [A, C, B] (B.position=${newPosB}) ✓`)

  // 3. A を C と B の間に: prev='a2' (C), next=newPosB (B)
  const newPosA = generateKeyBetween('a2', newPosB)
  if (newPosA >= newPosB) throw new Error(`newPosA(${newPosA}) >= newPosB(${newPosB})`)
  if (newPosA <= 'a2') throw new Error(`newPosA(${newPosA}) <= 'a2'`)
  await admin.from('items').update({ position: newPosA }).eq('id', ids.A)
  const r3 = await admin
    .from('items')
    .select('title')
    .eq('workspace_id', wsId)
    .order('position', { ascending: true })
  assertEq(
    r3.data?.map((x) => x.title),
    ['C', 'A', 'B'],
    'A between C and B',
  )
  console.log(`[3] A を C と B の間に → [C, A, B] (A.position=${newPosA}) ✓`)

  // 4. 無限分割確認: C と A の間に 5 個連続挿入しても破綻しない
  let a = 'a2'
  const b = newPosA
  const keys: string[] = []
  for (let i = 0; i < 5; i++) {
    const k = generateKeyBetween(a, b)
    if (k >= b || k <= a) throw new Error(`generated key out of bounds: ${k}`)
    keys.push(k)
    a = k
  }
  console.log(
    `[4] C-A 間に 5 個連続挿入: ${keys.map((k) => k.length).join(',')} chars (無限分割 OK) ✓`,
  )

  // 5. prev == next 相当 (prev >= next) → lib throw
  let throwErr: Error | null = null
  try {
    generateKeyBetween('a2', 'a2')
  } catch (e) {
    throwErr = e as Error
  }
  if (!throwErr) throw new Error('同値 prev/next でも throw されなかった')
  console.log(`[5] generateKeyBetween('a2','a2') → throw ✓`)

  // 6. fractional-indexing の lex sort が position sort と一致
  const mixed = ['a1', 'a0', 'a2', 'a1V', 'a0V']
  const sorted = [...mixed].sort()
  assertEq(sorted, ['a0', 'a0V', 'a1', 'a1V', 'a2'], 'lex sort')
  console.log(`[6] lex sort 一致確認 ✓`)

  await admin.auth.admin.deleteUser(userId)
  console.log('\nAll Reorder PoC checks PASSED. 🎉')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('PoC FAILED:', e)
    process.exit(1)
  })
