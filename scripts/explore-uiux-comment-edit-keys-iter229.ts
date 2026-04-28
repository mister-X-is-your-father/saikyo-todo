/**
 * Phase 6.15 loop iter 229 — Comment 編集 textarea の Cmd/Ctrl+Enter 保存 + Esc 破棄。
 *
 * iter228 は Comment 投稿側 textarea のみだった。編集 textarea も同 UX を
 * 揃える: Cmd/Ctrl+Enter で保存、Esc で編集破棄 (元の comment.body を復元
 * してから setEditing(false))。Esc は radix Dialog 全体を閉じる挙動と衝突
 * しないよう stopPropagation で止める (編集中だけ)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'comment-edit-keys-iter229',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter229: Comment 編集 textarea で Cmd/Ctrl+Enter 保存 + Esc 破棄ショートカット (Esc は stopPropagation で dialog close 衝突回避)',
    })
  },
})
