/**
 * Playwright E2E 用の共通ヘルパ。
 * - `createE2EUser`: admin API で test user を作成 (email_confirm 済) + cleanup 関数
 * - `loginViaUI(page, user)`: /login でフォーム入力して認証
 * - `signOut` は /login へ飛んでから手動チェック (golden path が発展したら専用関数化)
 *
 * 前提: `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` + ローカル Supabase が起動中。
 */
import type { Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = 'http://127.0.0.1:54321'

function admin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing; did you load .env.local?')
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
}

export interface E2EUser {
  userId: string
  email: string
  password: string
  cleanup: () => Promise<void>
}

export async function createE2EUser(label = 'e2e'): Promise<E2EUser> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const email = `${label}-${stamp}@example.com`
  const password = 'password1234'
  const a = admin()
  const { data, error } = await a.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  return {
    userId: data.user.id,
    email,
    password,
    cleanup: async () => {
      await a.auth.admin.deleteUser(data.user!.id).catch(() => {})
    },
  }
}

export async function loginViaUI(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/login')
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)
  await page.getByRole('button', { name: /ログイン/ }).click()
  // Login では router.push('/') → workspace 一覧ページへ。
  await page.waitForURL('/')
}
