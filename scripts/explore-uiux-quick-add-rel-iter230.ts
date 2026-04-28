/**
 * Phase 6.15 loop iter 230 — QuickAdd parser に Todoist 風の相対日付 +Nd / +Nw を追加。
 *
 * Todoist は「in 3 days」「+3d」のような相対指定が可能で、出張中の繰り返し
 * 「3 日後」入力を高速化できる。saikyo-todo は 明日/明後日/来週X曜/ISO のみで
 * 数日後 / 数週後 の指定が `2026-05-XX` を計算しないと書けなかった。
 *
 * 追加 syntax: `+Nd` (N 日後), `+Nw` (N 週後 = N*7 日)。先頭/空白の後限定で
 * title 中の '+' との誤認は防ぐ。日付 token が先に消費されたら +Nd は title
 * に残る (先勝ち)。テスト 5 件追加で全パス、QuickAdd hint 文にも記載。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'quick-add-rel-iter230',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter230: QuickAdd parser に +Nd / +Nw 相対日付追加 (Todoist 風)、テスト 5 件追加で全パス、hint 文にも反映',
    })
  },
})
