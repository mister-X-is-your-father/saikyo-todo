/**
 * Phase 6.15 loop iter1303 (mode-M = Mobile audit): iPhone SE 320px で
 * comment-thread (item-edit-dialog コメントタブ内) を audit。
 *
 * 目的: ItemEditDialog コメントタブの本文 textarea + 投稿 button + 各コメント行
 *      (`comment-edit` / `comment-delete` button) が iPhone SE viewport で
 *      44x44 tap target + 横 overflow なしで操作可能か確認。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 各コメント行 button (`comment-edit` / `comment-delete`) bounding box ≥ 44x44
 *   - `comment-post` submit button ≥ 44x44
 *   - `comment-input` textarea ≥ 44 高さ
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix する。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-comment-thread-iter1303.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-comment-thread-iter1303',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // 親 Item 1 件 + コメント 1 件 を入れて comment-thread を render させる
    const insItem = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'モバイル comment-thread 動作確認用 Item',
        status: 'todo',
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (insItem.error || !insItem.data) throw insItem.error ?? new Error('item insert failed')
    const itemId = insItem.data.id as string

    const insComment = await admin.from('comments_on_items').insert({
      item_id: itemId,
      body: 'モバイル audit 用ダミーコメント本文 (長め: 32 文字超で truncate 確認用 12345)',
      author_actor_type: 'user',
      author_actor_id: userId,
    })
    if (insComment.error) throw insComment.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })

    // Inbox view を強制 (default mode 依存避ける)
    const inboxBtn = page.locator('[data-testid="view-inbox-btn"]').first()
    if ((await inboxBtn.count()) > 0) await inboxBtn.tap()
    await page.waitForTimeout(500)

    // 行を開いて ItemEditDialog を出す
    let row = page.locator('[data-testid^="inbox-row-"]').first()
    if ((await row.count()) === 0) {
      // backlog 行に fall back
      const backlogBtn = page.locator('[data-testid="view-backlog-btn"]').first()
      if ((await backlogBtn.count()) > 0) await backlogBtn.tap()
      await page.waitForTimeout(500)
      row = page.locator('[data-testid^="backlog-edit-"]').first()
    }
    if ((await row.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'inbox-row / backlog-edit 両方見つからない (item seed が反映されてない可能性)',
      })
      await page.screenshot({
        path: '/tmp/uiux-mobile-comment-thread-iter1303-no-item.png',
        fullPage: true,
      })
      return
    }
    await row.tap()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

    // コメントタブを開く
    const tabComments = page.locator('[data-testid="tab-comments"]').first()
    if ((await tabComments.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'tab-comments が見つからない',
      })
      await page.screenshot({
        path: '/tmp/uiux-mobile-comment-thread-iter1303-no-tab.png',
        fullPage: true,
      })
      return
    }
    await tabComments.tap()
    await page.waitForTimeout(400)

    // 横 overflow チェック
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横 overflow)`,
      })
    }

    // 各 button の bounding box チェック
    const targets = [
      '[data-testid="comment-input"]',
      '[data-testid="comment-post"]',
      '[data-testid^="comment-edit-"]',
      '[data-testid^="comment-delete-"]',
    ]
    for (const sel of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      console.log(`  ${sel}: ${w}x${h}`)
      if (h < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} 高さ < 44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-comment-thread-iter1303.png',
      fullPage: true,
    })
  },
})
