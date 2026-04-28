/**
 * Phase 6.15 loop iter 231 — QuickAdd 末尾 `?` で AI 分解を実際に起動 (Phase 1.4 完成)。
 *
 * Todoist UX plan §1.4 で「タイトル末尾 `?` で Researcher decompose に投げる」と
 * 設計されていたが、長らく toast に「Phase 2 で配線予定」と書かれていた未完成
 * 機能だった。
 *
 * 実装: useCreateItem の戻り値 (Item) から id を取得し、useDecomposeItem
 * (Claude CLI 経由) を fire-and-forget で起動。
 *   - 即時 toast: 「作成しました — Researcher が「title」を分解中…」
 *   - 完了 toast: 提案 N 件 / 作成 N 件 / fallback の 3 パターン
 *   - 失敗 toast.warning: 作成は成功しているので error ではなく warning
 *
 * これで `?` suffix が「create_item + 即時 decompose」の hot path として完結。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'quick-add-decompose-iter231',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter231: QuickAdd 末尾 `?` で AI 分解 fire-and-forget 起動 (Phase 1.4 完成)、Researcher (Claude CLI) で子タスク自動生成',
    })
  },
})
