/**
 * Phase 3 end-to-end: time_entry 作成 → Sync ボタン → pg-boss が worker に投げ →
 * 実 Chromium driver が mock_timesheet に送信 → synced + external_ref。
 *
 * 前提: worker プロセス (pnpm worker) が別で起動済み。起動していない場合
 * sync_status は pending のまま残る (このテストは worker 起動を要する旨を
 * skip 条件で示す)。
 */
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

import { createE2EUser, loginViaUI } from './helpers'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = 'http://127.0.0.1:54321'

function admin() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

/** time-entry を synced になるまで最大 timeout 秒待つ (ポーリング) */
async function waitForSynced(
  entryId: string,
  timeoutMs = 90_000,
): Promise<{ syncStatus: string; externalRef: string | null }> {
  const a = admin()
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const { data } = await a
      .from('time_entries')
      .select('sync_status, external_ref')
      .eq('id', entryId)
      .single()
    if (data && (data.sync_status === 'synced' || data.sync_status === 'failed')) {
      return { syncStatus: data.sync_status, externalRef: data.external_ref }
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`time-entry ${entryId} did not reach terminal sync status within ${timeoutMs}ms`)
}

test('time-entry sync: UI 作成 → Sync → worker (別プロセス) が mock-timesheet に反映', async ({
  page,
}) => {
  // worker が起動していないと timeout で失敗するので、明示的に長めの timeout
  test.setTimeout(180_000)

  const user = await createE2EUser('te-sync')
  try {
    await loginViaUI(page, user)

    const slug = `te-sync-${Date.now().toString(36)}`
    await page.locator('#name').fill('Sync WS')
    await page.locator('#slug').fill(slug)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsUrl = page.url()

    await page.goto(`${wsUrl}/time-entries`)
    await page.locator('#teDate').fill('2026-04-25')
    await page.locator('#teCategory').selectOption('ops')
    await page.locator('#teDescription').fill('E2E Sync 対象の作業')
    await page.locator('#teMinutes').fill('45')
    await page.getByTestId('create-time-entry-submit').click()

    const syncBtn = page.locator('[data-testid^="time-entry-sync-"]').first()
    await expect(syncBtn).toBeVisible({ timeout: 5_000 })
    const syncBtnTestId = await syncBtn.getAttribute('data-testid')
    const entryId = syncBtnTestId!.replace('time-entry-sync-', '')

    await syncBtn.click()

    const final = await waitForSynced(entryId)
    expect(final.syncStatus).toBe('synced')
    expect(final.externalRef).toMatch(/^[0-9a-f-]{36}$/)

    const a = admin()
    const { data: mock } = await a
      .from('mock_timesheet_entries')
      .select('id, category, description, hours_decimal')
      .eq('id', final.externalRef!)
      .single()
    expect(mock?.category).toBe('ops')
    expect(mock?.description).toBe('E2E Sync 対象の作業')
    // 45 分 → 0.75h
    expect(Number(mock?.hours_decimal)).toBeCloseTo(0.75)

    // UI 再読み込みで synced バッジ表示
    await page.reload()
    await expect(page.getByText('synced').first()).toBeVisible()

    // cleanup mock row
    if (final.externalRef) {
      await a.from('mock_timesheet_entries').delete().eq('id', final.externalRef).throwOnError()
    }
  } finally {
    await user.cleanup()
  }
})
