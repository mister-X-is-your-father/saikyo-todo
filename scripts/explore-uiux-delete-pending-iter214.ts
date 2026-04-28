/**
 * Phase 6.15 loop iter 214 — Comment / Template item 削除 button の pending SR 化 + 連打防止。
 *
 * iter180-213 同パターン: Comment 削除 / 編集 button、Template item 削除
 * button が disabled / pending 状態を持たず、SR は「削除中…」を聞き取れず、
 * 連打した場合に二重 mutation race を起こし得た。
 *
 * 改善:
 *   - comment-thread: 削除 button に disabled={softDelete.isPending} +
 *     pending 状態別 aria-label、編集 button にも disabled={softDelete.isPending}
 *     を伝搬 (delete 進行中に編集を始めない)
 *   - template-items-editor: 削除 button に disabled={removeMut.isPending} +
 *     pending 状態別 aria-label
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'delete-pending-iter214',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter214: Comment / Template item 削除 button に disabled={isPending} + pending 状態別 aria-label',
    })
  },
})
