/**
 * integration test 共通ヘルパ。実 Supabase (ローカル) を前提とし、
 * admin API 経由で test 用 user + workspace を作る。RLS は本物を通す。
 *
 * 使い方:
 *   import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'
 *
 *   vi.mock('@/lib/auth/guard', () => ({
 *     requireUser: vi.fn(),
 *     requireWorkspaceMember: vi.fn(),
 *     hasAtLeast: () => true,
 *   }))
 *
 *   beforeAll(async () => {
 *     const fx = await createTestUserAndWorkspace('item-svc')
 *     userId = fx.userId; wsId = fx.wsId; cleanup = fx.cleanup
 *     mockAuthGuards(userId, wsId)
 *   })
 *   afterAll(() => cleanup())
 *
 * 前提:
 *   - `pnpm exec supabase start` で local Supabase が動いている
 *   - .env.local に SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { vi } from 'vitest'

const SUPABASE_URL = 'http://127.0.0.1:54321'

function getServiceKey(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set; did you load .env.local?')
  return k
}

function getAnonKey(): string {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!k) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not set; did you load .env.local?')
  return k
}

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, getServiceKey(), { auth: { persistSession: false } })
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, getAnonKey(), { auth: { persistSession: false } })
}

export interface TestUser {
  userId: string
  email: string
  /** test 終了時に必ず呼ぶ (user 削除 → cascade で workspace / items も消える) */
  cleanup: () => Promise<void>
}

export async function createTestUser(label = 'test'): Promise<TestUser> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const email = `${label}-${stamp}@example.com`
  const password = 'password1234'
  const admin = adminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  return {
    userId: data.user.id,
    email,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(data.user!.id).catch(() => {})
    },
  }
}

/**
 * user を作って workspace も作って返す。最も頻出のセットアップ。
 * cleanup は user 削除 (cascade で workspace も消える)。
 */
export async function createTestUserAndWorkspace(label = 'test'): Promise<{
  userId: string
  email: string
  wsId: string
  cleanup: () => Promise<void>
}> {
  const user = await createTestUser(label)
  const uc = anonClient()
  const signIn = await uc.auth.signInWithPassword({ email: user.email, password: 'password1234' })
  if (signIn.error) throw signIn.error

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const { data: wsId, error } = await uc.rpc('create_workspace', {
    ws_name: `${label} ws`,
    ws_slug: `${label}-${stamp}`,
  })
  if (error) throw error
  return {
    userId: user.userId,
    email: user.email,
    wsId: wsId as string,
    cleanup: user.cleanup,
  }
}

/**
 * `@/lib/auth/guard` を `vi.mock` した後、このヘルパで test user を返すように設定する。
 *
 *   vi.mock('@/lib/auth/guard', () => ({ requireUser: vi.fn(), requireWorkspaceMember: vi.fn(), hasAtLeast: () => true }))
 *   mockAuthGuards(userId, email)
 */
export async function mockAuthGuards(
  userId: string,
  email: string,
  role: 'owner' | 'admin' | 'member' | 'viewer' = 'member',
) {
  const guard = await import('@/lib/auth/guard')
  vi.mocked(guard.requireUser).mockResolvedValue({ id: userId, email })
  vi.mocked(guard.requireWorkspaceMember).mockResolvedValue({
    user: { id: userId, email },
    role,
  })
}
