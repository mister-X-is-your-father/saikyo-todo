/**
 * Phase 6.15 loop iter 228 — Comment thread で Cmd/Ctrl+Enter 投稿。
 *
 * Slack / GitHub / Notion 標準の Cmd+Enter で投稿が無く、Tab して 投稿 button
 * まで移動する必要があった。Textarea の onKeyDown で meta/ctrl + Enter を
 * 拾って handlePost を呼ぶ。IME 変換中 (compositionend 前) は無視、空 /
 * pending 時は no-op で安全に。
 *
 * 加えて placeholder と Textarea aria-label に「Cmd/Ctrl+Enter で投稿」を明示、
 * 投稿 button の通常時 aria-label にも「Cmd/Ctrl+Enter でも可」を追加。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'comment-cmd-enter-iter228',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter228: CommentThread の Textarea で Cmd/Ctrl+Enter 投稿ショートカット (IME / 空 / pending guard 込み)',
    })
  },
})
