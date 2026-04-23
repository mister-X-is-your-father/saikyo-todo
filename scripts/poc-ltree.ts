/**
 * Day 6 PoC: LTREE ヘルパの動作検証。
 * - ツリー構築: root 2 つ (A, B) + A の下に C, C の下に D, E の下に F (=A から深さ 2 の列)
 * - findDescendants
 * - moveSubtree (通常移動 / root へ戻し)
 * - 自己ループ検証 (自分 or 子孫を新 parent 指定で ValidationError)
 *
 * 実行: `pnpm tsx --env-file=.env.local scripts/poc-ltree.ts`
 *
 * 注: admin DB (service_role) で直接操作するため RLS はバイパスする。
 *     RLS の検証は poc-item / poc-doc-comment 側で済んでいる。
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

import { db } from '@/lib/db/client'
import { findDescendants, fullPathOf, moveSubtree, uuidToLabel } from '@/lib/db/ltree'

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

  // --- setup: user + workspace ---
  const email = `ltree-test-${stamp}@example.com`
  const password = 'password1234'
  const { data: created, error: cuErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'LTREE tester' },
  })
  if (cuErr || !created.user) throw cuErr ?? new Error('createUser failed')
  const userId = created.user.id
  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId } = await userClient.rpc('create_workspace', {
    ws_name: 'LTREE Test',
    ws_slug: `ltree-${stamp}`,
  })
  console.log(`[setup] user=${userId.slice(0, 8)} ws=${(wsId as string).slice(0, 8)}`)

  // --- ツリー構築 (admin 経由、RLS バイパス) ---
  //     A (root)
  //     └─ C
  //        └─ D
  //           └─ E
  //     B (root)
  //     F (root, 後で A の下に移動する)
  const ids = {
    A: randomUUID(),
    B: randomUUID(),
    C: randomUUID(),
    D: randomUUID(),
    E: randomUUID(),
    F: randomUUID(),
  }
  const label = uuidToLabel
  const mkItem = async (id: string, title: string, parentPath: string) => {
    const { error } = await admin.from('items').insert({
      id,
      workspace_id: wsId,
      title,
      parent_path: parentPath,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (error) throw error
  }
  await mkItem(ids.A, 'A', '')
  await mkItem(ids.B, 'B', '')
  await mkItem(ids.C, 'C', label(ids.A))
  await mkItem(ids.D, 'D', `${label(ids.A)}.${label(ids.C)}`)
  await mkItem(ids.E, 'E', `${label(ids.A)}.${label(ids.C)}.${label(ids.D)}`)
  await mkItem(ids.F, 'F', '')
  console.log(`[1] ツリー構築 OK (A > C > D > E / B / F)`)

  // --- findDescendants(A) = [A, C, D, E] ---
  const descA = await db.transaction(async (tx) => await findDescendants(tx, ids.A))
  const descIds = descA.map((r) => r.id).sort()
  const expected = [ids.A, ids.C, ids.D, ids.E].sort()
  assertEq(descIds, expected, 'findDescendants(A)')
  console.log(`[2] findDescendants(A) = [A, C, D, E] ✓`)

  // --- findDescendants(D) = [D, E] ---
  const descD = await db.transaction(async (tx) => await findDescendants(tx, ids.D))
  assertEq(descD.map((r) => r.id).sort(), [ids.D, ids.E].sort(), 'findDescendants(D)')
  console.log(`[3] findDescendants(D) = [D, E] ✓`)

  // --- 自己ループ検証: moveSubtree(C, D) → ValidationError (D は C の子孫) ---
  let err1: Error | null = null
  try {
    await db.transaction(async (tx) => await moveSubtree(tx, ids.C, ids.D))
  } catch (e) {
    err1 = e as Error
  }
  if (!err1 || !err1.message.includes('子孫')) {
    throw new Error(`期待: ValidationError、実際: ${err1?.message ?? '例外なし'}`)
  }
  console.log(`[4] 自己ループ: moveSubtree(C, D) → ValidationError ✓`)

  // --- 自己参照検証: moveSubtree(C, C) → ValidationError ---
  let err2: Error | null = null
  try {
    await db.transaction(async (tx) => await moveSubtree(tx, ids.C, ids.C))
  } catch (e) {
    err2 = e as Error
  }
  if (!err2 || !err2.message.includes('自分自身')) {
    throw new Error(`期待: ValidationError、実際: ${err2?.message ?? '例外なし'}`)
  }
  console.log(`[5] 自己参照: moveSubtree(C, C) → ValidationError ✓`)

  // --- 移動: C subtree を B の下に ---
  //     期待: A (root, 子無し) / B > C > D > E / F (root)
  await db.transaction(async (tx) => await moveSubtree(tx, ids.C, ids.B))
  // A の子孫は A だけ
  const aAfter = await db.transaction(async (tx) => await findDescendants(tx, ids.A))
  assertEq(aAfter.map((r) => r.id).sort(), [ids.A].sort(), 'A after move')
  // B の子孫は [B, C, D, E]
  const bAfter = await db.transaction(async (tx) => await findDescendants(tx, ids.B))
  assertEq(bAfter.map((r) => r.id).sort(), [ids.B, ids.C, ids.D, ids.E].sort(), 'B after move')
  console.log(`[6] moveSubtree(C, B): A は空 / B > C > D > E ✓`)

  // --- path 確認: D.parent_path, E.parent_path が正しく書き換わっているか ---
  const { data: pathRows } = await admin
    .from('items')
    .select('id, parent_path')
    .in('id', [ids.C, ids.D, ids.E])
  const paths = Object.fromEntries(
    (pathRows ?? []).map((r: { id: string; parent_path: string }) => [r.id, r.parent_path]),
  )
  assertEq(paths[ids.C], label(ids.B), 'C.parent_path')
  assertEq(paths[ids.D], `${label(ids.B)}.${label(ids.C)}`, 'D.parent_path')
  assertEq(paths[ids.E], `${label(ids.B)}.${label(ids.C)}.${label(ids.D)}`, 'E.parent_path')
  console.log(`[7] parent_path 連鎖更新: C.pp=${paths[ids.C]?.slice(0, 8)}.../D.../E... ✓`)

  // --- root へ戻し: moveSubtree(D, null) ---
  //     期待: D, E が root サブツリーになる (B > C 単独 / D > E / A, F root)
  await db.transaction(async (tx) => await moveSubtree(tx, ids.D, null))
  const dAfter = await db.transaction(async (tx) => await findDescendants(tx, ids.D))
  assertEq(dAfter.map((r) => r.id).sort(), [ids.D, ids.E].sort(), 'D subtree after root move')
  const { data: dRow } = await admin.from('items').select('parent_path').eq('id', ids.D).single()
  assertEq((dRow as { parent_path: string }).parent_path, '', 'D.parent_path = root')
  console.log(`[8] moveSubtree(D, null): D > E が root サブツリー ✓`)

  // --- 同じ item をさらに別 root (F) の下に移動 ---
  await db.transaction(async (tx) => await moveSubtree(tx, ids.D, ids.F))
  const fAfter = await db.transaction(async (tx) => await findDescendants(tx, ids.F))
  assertEq(fAfter.map((r) => r.id).sort(), [ids.F, ids.D, ids.E].sort(), 'F subtree after move')
  console.log(`[9] moveSubtree(D, F): F > D > E ✓`)

  // --- fullPathOf のサニティ ---
  const { data: fRow } = await admin
    .from('items')
    .select('id, parent_path')
    .eq('id', ids.F)
    .single()
  const fFull = fullPathOf({
    id: (fRow as { id: string }).id,
    parentPath: (fRow as { parent_path: string }).parent_path,
  })
  assertEq(fFull, label(ids.F), 'fullPathOf(F)')
  console.log(`[10] fullPathOf(F) = ${fFull.slice(0, 16)}... ✓`)

  // --- cleanup ---
  await admin.auth.admin.deleteUser(userId)
  console.log('\nAll LTREE PoC checks PASSED. 🎉')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('PoC FAILED:', e)
    process.exit(1)
  })
