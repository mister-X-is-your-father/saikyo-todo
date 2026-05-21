/**
 * iter1012 (mode-M Mobile audit, in-iter cross-view exploration):
 * iPhone SE 320px で Kanban view の card layout audit (iter1011 Today fix の cross-view check)。
 *
 * Kanban card 構造 (kanban-view.tsx KanbanCard):
 *   - 外側 `<div className="group cursor-grab ... p-2 text-sm">`
 *   - 上段: `<div className="flex items-start justify-between gap-2">`
 *     - 左 `<div className="flex min-w-0 items-start gap-2">`:
 *       - ItemCheckbox + title button (rounded text-left font-medium break-words)
 *     - 右 `<div className="flex shrink-0 items-center gap-1">`:
 *       - MUST chip + 編集 button (✎ icon)
 *   - 中段: 日付 (開始 / 期限) `<div className="text-muted-foreground mt-1 text-[11px]">`
 *   - 下段: `<div className="mt-2 flex items-center justify-between gap-2">`
 *     - 子タスク chip + ItemDecomposeButton
 *
 * Kanban は column 単位で配置されるため、各 card の width は column 幅依存 (= 320px / 3 col ≈ 100px だが
 * iter104 で内部 overflow-x-auto column 化済、各 column 個別 scroll で全体 wrap)。
 *
 * このスクリプトは:
 *  1. kanban column の overflow-x scroll で全 column accessible か (= 横スクロール可)
 *  2. card title が visible (width > 0)
 *  3. MUST chip / edit button が押し出されていないか
 *  4. screenshot baseline 保存
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-kanban-card-iter1012b',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, userId, admin, findings }) => {
    const ws = workspaceId
    const ins = await admin.from('items').insert({
      workspace_id: ws,
      title: 'iter1012 モバイル kanban 長文タイトル card audit テスト',
      status: 'todo',
      priority: 1,
      is_must: true,
      dod: 'DoD dummy',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (ins.error) throw ins.error

    await page.goto(`http://localhost:3001/${ws}?view=kanban`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid^="kanban-card-"]', { timeout: 10_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    // iter107: html/body に overflow-x: clip 強制で page 自体は viewport 一致
    if (docW > viewW + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (iter107 invariant 壊れ)`,
      })
    }

    // Kanban card 内 title button が visible か
    const cardCheck = await page.evaluate(() => {
      const card = document.querySelector('[data-testid^="kanban-card-"]') as HTMLElement | null
      if (!card) return null
      const rect = card.getBoundingClientRect()
      const title = card.querySelector('[data-testid^="kanban-title-"]') as HTMLElement | null
      const edit = card.querySelector('[data-testid^="kanban-edit-"]') as HTMLElement | null
      return {
        card: {
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          right: Math.round(rect.right),
        },
        title: title
          ? {
              w: Math.round(title.getBoundingClientRect().width),
              h: Math.round(title.getBoundingClientRect().height),
            }
          : null,
        edit: edit
          ? {
              w: Math.round(edit.getBoundingClientRect().width),
              h: Math.round(edit.getBoundingClientRect().height),
            }
          : null,
      }
    })
    if (!cardCheck) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'kanban-card が描画されていない',
      })
    } else {
      console.log(`[card] ${cardCheck.card.w}x${cardCheck.card.h} right=${cardCheck.card.right}`)
      console.log(`[title] ${cardCheck.title?.w}x${cardCheck.title?.h}`)
      console.log(`[edit] ${cardCheck.edit?.w}x${cardCheck.edit?.h}`)
      if (cardCheck.title && cardCheck.title.w < 50) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `kanban-title ${cardCheck.title.w}x${cardCheck.title.h} に潰れている (< 50px、Today iter1011 と同 bug 疑い)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-kanban-card-iter1012b.png', fullPage: true })
  },
})
